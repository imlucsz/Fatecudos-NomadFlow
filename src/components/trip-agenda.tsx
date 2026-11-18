"use client";

import Link from "next/link";
import { BedDouble, Bell, CalendarDays, ChevronLeft, ChevronRight, Download, ExternalLink, Link2, MapPin, Pencil, Plane, Plus, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { accountSettingsPath } from "@/lib/account-path";
import { CalendarApiError, calendarLink, canEditGoogleEvent, type GoogleEvent, type GoogleEventDraft } from "@/lib/google-calendar";
import { addDays, addMonths, calendar, dateKey, formatLocalTime, ics, localDay, localInstant, queue, registeredReservation, setCalendarTime, shortDate, validLocalTime, type CalendarEvent, type QueueItem, type Trip } from "@/lib/planning";
import { BookingGoogleActions, useGoogleCalendar } from "./google-calendar";
import { changeTrip } from "./local-store";
import { Modal } from "./ui";

const types={
  Viagem:{color:"travel",icon:Plane,label:"Viagem"},
  Hospedagem:{color:"stay",icon:BedDouble,label:"Hospedagem"},
  Lembrete:{color:"reminder",icon:Bell,label:"Lembretes"},
  Google:{color:"google",icon:CalendarDays,label:"Google Agenda"},
};
type Category=keyof typeof types;
type Entry={id:string;title:string;type:Category;day:string;time?:string;detail?:string;item?:QueueItem;google?:GoogleEvent};
const weekday=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const googleSettings=accountSettingsPath+"#google-agenda";
const fullDay=new Intl.DateTimeFormat("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"UTC"});
const monthTitle=new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric",timeZone:"UTC"});

function monthRange(day:string) {
  const first=day.slice(0,7)+"-01";
  const next=addMonths(first,1);
  const start=addDays(first,-new Date(first).getUTCDay());
  const end=addDays(next,(7-new Date(next).getUTCDay())%7);
  const days:string[]=[];
  for (let current=start;current<end;current=addDays(current,1)) days.push(current);
  return {first,next,start,end,days};
}

function eventDay(event:GoogleEvent,zone:string) {
  return event.start.date ?? (event.start.dateTime ? localDay(zone,new Date(event.start.dateTime)) : "");
}

function entriesForMonth(trip:Trip,planned:CalendarEvent[],items:QueueItem[],google:GoogleEvent[],zone:string,start:string,end:string) {
  const entries=new Map<string,Entry[]>();
  const byId=new Map(items.map((item)=>[item.id,item]));
  const synced=new Map<string,GoogleEvent>();
  for (const event of google) {
    const metadata=event.extendedProperties?.private;
    const id=metadata?.nomadflowTrip===trip.tripId ? metadata.nomadflowItem : undefined;
    const legacy=event.htmlLink ? items.find((item)=>registeredReservation(item)?.googleCalendarLink===event.htmlLink) : undefined;
    const item=id ? byId.get(id) : legacy;
    const booking=item && registeredReservation(item);
    if (item && booking?.confirmedByTraveler && eventDay(event,item.zone)===item.day) synced.set(item.id,event);
  }
  const merged=new Set([...synced.values()].map((event)=>event.id));
  function place(entry:Entry) {
    if (entry.day<start || entry.day>=end) return;
    const dayEntries=entries.get(entry.day) ?? [];
    dayEntries.push(entry);
    entries.set(entry.day,dayEntries);
  }
  for (const event of planned) {
    const item=event.bookingId ? byId.get(event.bookingId) : undefined;
    const googleEvent=item ? synced.get(item.id) : undefined;
    const saved=item && registeredReservation(item);
    const current=googleEvent && saved?.googleCalendarTime===item?.time && saved?.googleCalendarLink ? googleEvent : undefined;
    const actual=current?.start.dateTime;
    const time=current ? actual && formatLocalTime(new Date(actual),event.tz) : item ? item.time : formatLocalTime(event.instant,event.tz);
    place({id:event.id,title:event.title,type:event.type,day:event.day,item,google:current,time,
      detail:!item && time ? time+" · "+(event.type==="Lembrete" ? event.tz : "estimado") : undefined});
    if (event.alarm) {
      place({id:event.id+"-alarm",title:"Lembrete de partida · "+(item?.name ?? event.title),
        day:localDay(event.tz,event.alarm),type:"Lembrete",time:formatLocalTime(event.alarm,event.tz)});
    }
  }
  for (const event of google) {
    if (merged.has(event.id)) continue;
    const first=eventDay(event,zone);
    if (!first) continue;
    const last=event.end.dateTime ? localDay(zone,new Date(Date.parse(event.end.dateTime)-1)) : first;
    const until=event.end.date ?? addDays(last>=first ? last : first,1);
    for (let day=first<start ? start : first;day<until && day<end;day=addDays(day,1)) {
      place({id:event.id,title:event.summary || "Compromisso",type:"Google",day,google:event,
        time:event.start.dateTime && day===first ? formatLocalTime(new Date(event.start.dateTime),zone) : undefined,
        detail:event.start.dateTime && day!==first ? "Em andamento" : undefined});
    }
  }
  for (const list of entries.values()) list.sort((a,b)=>(a.time ?? "").localeCompare(b.time ?? ""));
  return entries;
}

function BookingTime({trip,item,onClose}: {trip:Trip;item:QueueItem;onClose:()=>void}) {
  const [time,setTime]=useState(item.time ?? "");
  const [error,setError]=useState("");
  const {sync}=useGoogleCalendar();
  const stay=item.kind==="Hospedagem";
  return <Modal title={stay ? "Horário de check-in" : "Horário da partida"} onClose={onClose}>
    <form className="stack" onSubmit={(event)=>{
      event.preventDefault();
      if (time && !validLocalTime(item.day,time,item.zone)) {setError("O horário não existe nesse dia e fuso. Confira sua reserva.");return;}
      let saved:QueueItem|undefined;
      changeTrip(trip.tripId,(current)=>{
        const next=setCalendarTime(current,item,time);
        if (!next) return current;
        saved=queue(next).find((row)=>row.id===item.id);
        return next;
      });
      if (!saved) {setError("O roteiro mudou. Abra o compromisso novamente.");return;}
      if (registeredReservation(saved)?.confirmedByTraveler) void sync(trip.tripId,saved);
      onClose();
    }}>
      <div className="notice"><CalendarDays size={19}/><div><strong>{item.name}</strong><p>{shortDate(item.day,true)} · {item.zone}</p></div></div>
      <label>{stay ? "Check-in" : "Partida"}<input type="time" value={time} onChange={(event)=>setTime(event.target.value)}/></label>
      <p className="quiet">Use o horário da reserva, no fuso do local. Deixe vazio para marcar o dia inteiro.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button" type="submit">Salvar horário</button>
    </form>
  </Modal>;
}

function GoogleEventEditor({event,day,zone,onClose}: {event?:GoogleEvent;day:string;zone:string;onClose:()=>void}) {
  const {write}=useGoogleCalendar();
  const [draft,setDraft]=useState<GoogleEventDraft>(()=>{
    const start=event?.start.dateTime ? new Date(event.start.dateTime) : undefined;
    const end=event?.end.dateTime ? new Date(event.end.dateTime) : undefined;
    return {title:event?.summary ?? "",location:event?.location ?? "",zone,allDay:!!event?.start.date,
      startDay:event?.start.date ?? (start ? localDay(zone,start) : day),
      endDay:event?.end.date ? addDays(event.end.date,-1) : end ? localDay(zone,end) : day,
      startTime:start ? formatLocalTime(start,zone) : "09:00",endTime:end ? formatLocalTime(end,zone) : "10:00"};
  });
  const [error,setError]=useState("");
  const [saving,setSaving]=useState(false);
  function chooseStart(startDay:string) {
    setDraft((current)=>({...current,startDay,endDay:current.endDay===current.startDay || current.endDay<startDay ? startDay : current.endDay}));
  }
  return <Modal title={event ? "Editar compromisso" : "Novo compromisso no Google Agenda"} onClose={onClose}>
    <form className="stack" onSubmit={async (submission)=>{
      submission.preventDefault();
      const {title,startDay,endDay,startTime,endTime,allDay}=draft;
      if (!title.trim()) {setError("Informe um título.");return;}
      if (endDay<startDay || (!allDay && (!validLocalTime(startDay,startTime,zone) ||
        !validLocalTime(endDay,endTime,zone) || localInstant(endDay,endTime,zone)<=localInstant(startDay,startTime,zone)))) {
        setError("Confira as datas e os horários. O compromisso deve terminar depois do início.");
        return;
      }
      setSaving(true);
      setError("");
      try {await write({...draft,title:title.trim()},event);onClose();}
      catch (reason) {
        setError(reason instanceof CalendarApiError && reason.status===412
          ? "Este compromisso mudou no Google. Atualize o calendário antes de editar de novo."
          : "O Google Agenda não salvou a alteração. Verifique a conexão e tente novamente.");
        setSaving(false);
      }
    }}>
      <label>Título<input required value={draft.title} onChange={(input)=>setDraft({...draft,title:input.target.value})}/></label>
      <label>Local <small>(opcional)</small><input value={draft.location} onChange={(input)=>setDraft({...draft,location:input.target.value})}/></label>
      <label className="check"><input type="checkbox" checked={draft.allDay} onChange={(input)=>setDraft({...draft,allDay:input.target.checked})}/> Dia inteiro</label>
      <div className="form-grid">
        <label>Data inicial<input type="date" required value={draft.startDay} onChange={(input)=>chooseStart(input.target.value)}/></label>
        <label>Data final<input type="date" required min={draft.startDay} value={draft.endDay} onChange={(input)=>setDraft({...draft,endDay:input.target.value})}/></label>
        {!draft.allDay && <><label>Começa às<input type="time" required value={draft.startTime} onChange={(input)=>setDraft({...draft,startTime:input.target.value})}/></label>
          <label>Termina às<input type="time" required value={draft.endTime} onChange={(input)=>setDraft({...draft,endTime:input.target.value})}/></label></>}
      </div>
      {!draft.allDay && <p className="quiet">Fuso horário · {zone}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button" type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar no Google Agenda"}</button>
    </form>
  </Modal>;
}

export function Agenda({trip,reservation}: {trip:Trip;reservation?:string}) {
  const {connected,read,revision}=useGoogleCalendar();
  const [today]=useState(dateKey);
  const [zone]=useState(()=>Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [items,planned]=useMemo(()=>[queue(trip),calendar(trip)] as const,[trip]);
  const focus=items.find((item)=>item.id===reservation);
  const focusId=focus?.id;
  const agenda=useRef<HTMLElement>(null);
  const [day,setDay]=useState(()=>focus?.day ?? (today>=trip.plan.start && today<=trip.plan.endDate ? today : trip.plan.start));
  const [filter,setFilter]=useState<Category|"Tudo">("Tudo");
  const [refresh,setRefresh]=useState(0);
  const [fetchResult,setFetchResult]=useState<{key:string;events?:GoogleEvent[]}>();
  const [bookingId,setBookingId]=useState<string>();
  const [editor,setEditor]=useState<{event?:GoogleEvent}|null>(null);
  const {first,next,start,end,days}=monthRange(day);
  const resultKey=[start,end,revision,refresh].join("|");
  const matching=connected && fetchResult?.key===resultKey ? fetchResult : undefined;
  const events=matching?.events;
  const entries=entriesForMonth(trip,planned,items,events ?? [],zone,start,end);
  const visible=(on:string)=>(entries.get(on) ?? []).filter((entry)=>filter==="Tudo" || entry.type===filter);
  const selected=visible(day);
  const booking=items.find((item)=>item.id===bookingId);

  useEffect(()=>{
    if (!focusId) return;
    const frame=requestAnimationFrame(()=>agenda.current?.scrollIntoView({block:"start",behavior:"instant"}));
    return ()=>cancelAnimationFrame(frame);
  },[focusId]);

  useEffect(()=>{
    if (!connected) return;
    const controller=new AbortController();
    void read(start,end,zone,controller.signal).then((events)=>{
      if (!controller.signal.aborted) setFetchResult({key:resultKey,events});
    }).catch(()=>{
      if (!controller.signal.aborted) setFetchResult({key:resultKey});
    });
    return ()=>controller.abort();
  },[connected,read,start,end,zone,resultKey]);

  function download() {
    const url=URL.createObjectURL(new Blob([ics(trip)],{type:"text/calendar;charset=utf-8"}));
    const link=document.createElement("a");
    link.href=url;
    link.download="nomadflow-"+trip.tripId.slice(0,8)+".ics";
    link.click();
    setTimeout(()=>URL.revokeObjectURL(url),3000);
  }

  return <section ref={agenda} className="trip-agenda" aria-labelledby="trip-agenda-title">
    <header className="trip-agenda-heading">
      <h2 id="trip-agenda-title"><CalendarDays size={23}/> Agenda da viagem</h2>
      <div className="trip-agenda-actions">
        <button type="button" className="button button-outline button-small" onClick={download}><Download size={15}/> Exportar .ics</button>
        {connected ? <Link className="trip-agenda-connected" href={googleSettings}><span/> Google Agenda conectado</Link>
          : <Link className="button button-outline button-small" href={googleSettings}><Link2 size={15}/> Vincular Google Agenda</Link>}
      </div>
    </header>
    <div className="trip-agenda-workspace">
      <section className="panel trip-month" aria-label="Calendário mensal">
        <div className="trip-month-toolbar">
          <div className="trip-month-nav">
            <button type="button" className="icon-button" aria-label="Mês anterior" onClick={()=>setDay(addMonths(day,-1))}><ChevronLeft size={19}/></button>
            <button type="button" className="icon-button" aria-label="Próximo mês" onClick={()=>setDay(addMonths(day,1))}><ChevronRight size={19}/></button>
            <h3 aria-live="polite">{monthTitle.format(new Date(first))}</h3>
          </div>
          <div className="trip-agenda-actions">
            <button type="button" className="button button-outline button-small" onClick={()=>setDay(today)}>Hoje</button>
            {connected && <button type="button" className="icon-button" aria-label="Atualizar Google Agenda" title="Atualizar Google Agenda" onClick={()=>setRefresh((n)=>n+1)}><RefreshCw size={16}/></button>}
          </div>
        </div>
        <div className="trip-weekdays" aria-hidden="true">{weekday.map((label)=><span key={label}>{label}</span>)}</div>
        <div className="trip-month-days">
          {days.map((date)=>{
            const list=visible(date);
            return <button key={date} type="button" className="trip-month-day" aria-pressed={date===day} aria-current={date===today ? "date" : undefined}
              aria-label={fullDay.format(new Date(date))+(list.length ? " · "+list.length+(list.length===1 ? " compromisso" : " compromissos") : "")}
              data-adjacent={date<first || date>=next} onClick={()=>setDay(date)}>
              <span className="trip-day-number">{Number(date.slice(-2))}</span>
              <span className="trip-day-chips" aria-hidden="true">
                {list.slice(0,2).map((entry)=><span key={entry.id} className="trip-day-chip" data-category={types[entry.type].color}>{entry.title}</span>)}
                {list.length>2 && <span className="trip-day-overflow">+{list.length-2}</span>}
              </span>
            </button>;
          })}
        </div>
        <div className="trip-calendar-filters" aria-label="Mostrar compromissos">
          <button type="button" aria-pressed={filter==="Tudo"} onClick={()=>setFilter("Tudo")}>Tudo</button>
          {(Object.keys(types) as Category[]).filter((type)=>type!=="Google" || connected).map((type)=>
            <button type="button" key={type} aria-pressed={filter===type} data-category={types[type].color}
              onClick={()=>setFilter(filter===type ? "Tudo" : type)}>{types[type].label}</button>)}
        </div>
        {connected && !matching && <p className="trip-agenda-sync" role="status">Carregando Google Agenda…</p>}
        {matching && !events && <p className="trip-agenda-sync" role="status">O Google Agenda está indisponível. Use atualizar para consultar de novo.</p>}
      </section>
      <section className="panel trip-agenda-day" aria-label="Compromissos do dia">
        <header>
          <h3>{fullDay.format(new Date(day))}</h3>
          {connected && <button type="button" className="button button-outline button-small" onClick={()=>setEditor({})}><Plus size={15}/> Novo compromisso</button>}
        </header>
        <div className="trip-agenda-entries">
          {selected.map((entry)=>{
            const {icon:Icon,color}=types[entry.type];
            const item=entry.item;
            const link=calendarLink(entry.google?.htmlLink);
            const note=item ? [entry.time ?? "Horário a confirmar",item.zone,
              registeredReservation(item)?.confirmedByTraveler ? "Confirmado" : "Planejado"].join(" · ") : entry.detail ?? entry.time ?? "Dia inteiro";
            return <article key={entry.id} className="trip-agenda-entry" data-category={color} data-focused={item?.id===focus?.id && !!focus}>
              <span className="trip-entry-icon"><Icon size={17} aria-hidden="true"/></span>
              <div className="trip-entry-content">
                <strong>{entry.title}</strong>
                <span>{note}</span>
                {entry.google?.location && !item && <span><MapPin size={13}/> {entry.google.location}</span>}
                <div className="trip-entry-actions">
                  {item ? <><button type="button" className="text-link" onClick={()=>setBookingId(item.id)}><Pencil size={13}/> {entry.time ? "Editar horário" : "Definir horário"}</button>
                    <BookingGoogleActions tripId={trip.tripId} item={item}/></> :
                    entry.google && connected && canEditGoogleEvent(entry.google)
                      ? <button type="button" className="text-link" onClick={()=>setEditor({event:entry.google})}><Pencil size={13}/> Editar compromisso</button>
                      : link && <a className="text-link" href={link} target="_blank" rel="noreferrer">Ver no Google Agenda <ExternalLink size={12}/></a>}
                </div>
              </div>
            </article>;
          })}
          {!selected.length && <p className="trip-agenda-empty">Nenhum compromisso para este dia.</p>}
        </div>
      </section>
    </div>
    {booking && <BookingTime key={booking.id} trip={trip} item={booking} onClose={()=>setBookingId(undefined)}/>}
    {editor && connected && <GoogleEventEditor event={editor.event} day={day} zone={zone} onClose={()=>setEditor(null)}/>}
  </section>;
}
