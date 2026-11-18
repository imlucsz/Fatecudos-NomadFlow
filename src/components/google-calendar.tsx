"use client";

import Link from "next/link";
import Script from "next/script";
import { CalendarDays, ExternalLink, Link2, Unlink } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CalendarApiError, calendarLink, calendarScope, getGoogleEvents, googleCalendarDraft, googleCalendarHome, googleClientId, saveGoogleEvent, sendGoogleBooking, type GoogleEvent, type GoogleEventDraft } from "@/lib/google-calendar";
import { queue, registeredReservation, type QueueItem } from "@/lib/planning";
import { changeTrip, useLocal } from "./local-store";

type GoogleToken = {access_token?:string;expires_in?:string|number;error?:string};
declare global {
  interface Window {
    google?: {accounts:{oauth2:{
      initTokenClient(config:{
        client_id:string;scope:string;include_granted_scopes:boolean;
        callback:(response:GoogleToken)=>void;error_callback:()=>void;
      }):{requestAccessToken(config:{prompt:string}):void};
      hasGrantedAllScopes(response:GoogleToken, scope:string):boolean;
      revoke(token:string):void;
    }}};
  }
}

type Session = {owner:string;token:string;expires:number;controller:AbortController};
type Job = "sending" | "failed";
const bookingJobKey=(tripId:string,item:QueueItem)=>JSON.stringify([tripId,item.id,item.signature,item.time ?? ""]);
const GoogleCalendarContext=createContext<{
  connected:boolean;
  connect:(finish:(success:boolean)=>void)=>void;
  disconnect:()=>void;
  sync:(tripId:string,item:QueueItem)=>Promise<void>;
  jobs:Record<string,Job|undefined>;
  revision:number;
  read:(start:string,end:string,zone:string,signal:AbortSignal)=>Promise<GoogleEvent[]>;
  write:(draft:GoogleEventDraft,existing?:GoogleEvent)=>Promise<GoogleEvent>;
} | null>(null);

export function GoogleCalendarProvider({children}: {children:React.ReactNode}) {
  const {active}=useLocal();
  const owner=active?.id;
  const [profile,setProfile]=useState(owner);
  const [session,setSession]=useState<Session|null>(null);
  const [jobs,setJobs]=useState<Record<string,Job|undefined>>({});
  const [revision,setRevision]=useState(0);
  const pending=useRef(new Map<string,{key:string;request:Promise<void>}>());
  const authAttempt=useRef<symbol|undefined>(undefined);

  if (profile!==owner) {
    setProfile(owner);
    setSession(null);
  }

  useEffect(()=>()=>{authAttempt.current=undefined;},[owner]);

  useEffect(()=>{
    if (!session) return;
    const timer=window.setTimeout(()=>setSession((current)=>current===session ? null : current),Math.max(0,session.expires-Date.now()));
    return ()=>{window.clearTimeout(timer);session.controller.abort();};
  },[session]);

  const currentSession=session?.owner===owner ? session : null;
  const withSession=useCallback(async <T,>(run:(session:Session)=>Promise<T>)=>{
    if (!currentSession || currentSession.expires<=Date.now() || currentSession.controller.signal.aborted) throw new CalendarApiError(401);
    try {return await run(currentSession);}
    catch (error) {
      if (error instanceof CalendarApiError && error.status===401) {
        setSession((current)=>current===currentSession ? null : current);
      }
      throw error;
    }
  },[currentSession]);

  const read=useCallback((start:string,end:string,zone:string,signal:AbortSignal)=>
    withSession(({token,controller})=>getGoogleEvents(token,start,end,zone,AbortSignal.any([signal,controller.signal]))),[withSession]);

  async function write(draft:GoogleEventDraft,existing?:GoogleEvent) {
    const saved=await withSession(({token,controller})=>saveGoogleEvent(token,draft,existing,controller.signal));
    setRevision((value)=>value+1);
    return saved;
  }

  function connect(finish:(success:boolean)=>void) {
    const oauth=window.google?.accounts.oauth2;
    if (!oauth || !googleClientId || !owner) {finish(false);return;}
    const attempt=Symbol();
    authAttempt.current=attempt;
    function reject() {
      if (authAttempt.current!==attempt) return;
      authAttempt.current=undefined;
      finish(false);
    }
    try {
      oauth.initTokenClient({
        client_id:googleClientId,scope:calendarScope,include_granted_scopes:false,
        callback:(response)=>{
          if (authAttempt.current!==attempt) return;
          const lifetime=Number(response.expires_in);
          if (response.error || !response.access_token || !Number.isFinite(lifetime) || lifetime<=0 || !oauth.hasGrantedAllScopes(response,calendarScope)) {
            reject();
            return;
          }
          authAttempt.current=undefined;
          setSession({owner,token:response.access_token,expires:Date.now()+lifetime*1000,controller:new AbortController()});
          setRevision((value)=>value+1);
          finish(true);
        },
        error_callback:reject,
      }).requestAccessToken({prompt:"select_account"});
    } catch {reject();}
  }

  function disconnect() {
    if (session?.owner!==owner || !session) return;
    setSession(null);
    window.google?.accounts.oauth2.revoke(session.token);
  }

  async function sync(tripId:string,item:QueueItem) {
    if (!currentSession || currentSession.expires<=Date.now()) return;
    const key=bookingJobKey(tripId,item);
    const slot=JSON.stringify([owner,tripId,item.id]);
    const inFlight=pending.current.get(slot);
    if (inFlight?.key===key) return inFlight.request;
    setJobs((current)=>({...current,[key]:"sending"}));
    const job={key,request:Promise.resolve().then(async ()=>{
      if (inFlight) await inFlight.request;
      try {
        const event=await withSession(({token,controller})=>sendGoogleBooking(token,tripId,item,controller.signal));
        if (currentSession.controller.signal.aborted) return;
        const link=calendarLink(event.htmlLink) ?? googleCalendarHome;
        changeTrip(tripId,(trip)=>{
          const reservation=trip.reservations[item.id];
          const row=queue(trip).find((entry)=>entry.id===item.id);
          if (!reservation?.confirmedByTraveler || reservation.signature!==item.signature || row?.time!==item.time ||
            (reservation.googleCalendarLink===link && reservation.googleCalendarTime===item.time)) return trip;
          return {...trip,revision:trip.revision+1,reservations:{...trip.reservations,
            [item.id]:{...reservation,googleCalendarLink:link,googleCalendarTime:item.time}}};
        });
        setJobs((current)=>({...current,[key]:undefined}));
        setRevision((value)=>value+1);
      } catch {
        setJobs((current)=>({...current,[key]:"failed"}));
      }
    })};
    pending.current.set(slot,job);
    await job.request;
    if (pending.current.get(slot)===job) pending.current.delete(slot);
  }

  return <GoogleCalendarContext.Provider value={{connected:!!currentSession,connect,disconnect,sync,jobs,revision,read,write}}>{children}</GoogleCalendarContext.Provider>;
}

export function useGoogleCalendar() {
  return useContext(GoogleCalendarContext)!;
}

export function GoogleCalendarSettings() {
  const {connected,connect,disconnect}=useGoogleCalendar();
  const [loaded,setLoaded]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(false);
  return <section id="google-agenda" className="calendar-settings" aria-labelledby="google-calendar-heading">
    {googleClientId && <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={()=>setLoaded(true)} onError={()=>setError(true)}/>}
    <span className="calendar-settings-icon"><CalendarDays size={21} aria-hidden="true"/></span>
    <div className="calendar-settings-heading">
      <h2 id="google-calendar-heading">Google Agenda</h2>
      <p>Veja e edite os compromissos do seu calendário principal na agenda da viagem. Passagens compradas e hospedagens reservadas são enviadas ao Google com o horário que você informar.</p>
    </div>
    <div className="calendar-settings-status" role="status">{connected ? "Conectado nesta sessão" : googleClientId ? "Desconectado" : "Adição manual disponível"}</div>
    {googleClientId ? <button type="button" className="button button-small" disabled={!loaded || loading} onClick={()=>{
      if (connected) {disconnect();return;}
      setError(false);
      setLoading(true);
      connect((success)=>{setLoading(false);setError(!success);});
    }}>
      {connected ? <><Unlink size={15}/> Desconectar Google Agenda</> : <><Link2 size={15}/> {loading ? "Conectando…" : "Conectar Google Agenda"}</>}
    </button> : <p>A conexão com o Google ainda precisa ser configurada nesta instalação. Você pode usar <strong>Adicionar ao Google Agenda</strong> em cada compromisso.</p>}
    {error && <p className="form-error" role="alert">Não foi possível conectar. Tente novamente.</p>}
    <a className="text-link" href={googleCalendarHome} target="_blank" rel="noreferrer">Abrir Google Agenda <ExternalLink size={13}/></a>
  </section>;
}

export function BookingAgendaLink({tripId,item}: {tripId:string;item:QueueItem}) {
  if (!registeredReservation(item)?.confirmedByTraveler) return null;
  return <Link href={"/viagens/"+tripId+"/agenda?reserva="+encodeURIComponent(item.id)} className="text-link calendar-link"><CalendarDays size={14}/> Ver na agenda</Link>;
}

export function BookingGoogleActions({tripId,item}: {tripId:string;item:QueueItem}) {
  const {connected,sync,jobs}=useGoogleCalendar();
  const reservation=registeredReservation(item);
  const link=calendarLink(reservation?.googleCalendarLink);
  const job=jobs[bookingJobKey(tripId,item)];
  if (job==="sending") return <span className="calendar-link" role="status"><CalendarDays size={14}/> Adicionando à agenda…</span>;
  if (!job && link && reservation?.googleCalendarTime===item.time) return <a className="text-link calendar-link" href={link} target="_blank" rel="noreferrer">Ver no Google Agenda <ExternalLink size={12}/></a>;
  return <div className="departure-calendar">
    {job==="failed" && <span role="status">O horário ficou salvo na viagem. O envio ao Google está pendente.</span>}
    {connected && reservation?.confirmedByTraveler
      ? <button type="button" className="text-link calendar-link" onClick={()=>void sync(tripId,item)}><CalendarDays size={14}/> {job==="failed" ? "Tentar enviar novamente" : "Enviar ao Google Agenda"}</button>
      : <a className="text-link calendar-link" href={link ?? googleCalendarDraft(item)} target="_blank" rel="noreferrer"><CalendarDays size={14}/> {link ? "Ver no Google Agenda" : "Adicionar ao Google Agenda"} <ExternalLink size={11}/></a>}
  </div>;
}
