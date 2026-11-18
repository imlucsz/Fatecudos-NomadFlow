"use client";

import { ArrowDownRight, Check, KeyRound, Ticket, Undo2 } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { registeredReservation, reservationLabel, setReservation, type QueueItem } from "@/lib/planning";
import { changeTrip } from "./local-store";
import { BookingAgendaLink, useGoogleCalendar } from "./google-calendar";

const tearDistance=56;

function pullDistance(x:number,y:number) {
  return Math.max(Math.max(0,y),Math.abs(x)*.8);
}

export function BookingConfirmation({tripId,item}: {tripId:string;item:QueueItem}) {
  const {sync}=useGoogleCalendar();
  const isStay=item.kind==="Hospedagem";
  const registered=registeredReservation(item);
  const confirmed=!!registered?.confirmedByTraveler;
  const [released,setReleased]=useState(false);
  const [error,setError]=useState(false);
  const timer=useRef<number|undefined>(undefined);
  const grab=useRef<{id:number;x:number;y:number;moved:boolean}|null>(null);
  const dragged=useRef(false);
  const action=useRef<HTMLButtonElement>(null);
  const restoreFocus=useRef(false);

  useEffect(()=>()=>window.clearTimeout(timer.current),[]);
  useEffect(()=>{
    if (restoreFocus.current) action.current?.focus();
    restoreFocus.current=false;
  },[confirmed]);

  function record(complete:boolean,keyboard=false) {
    let updated=false;
    changeTrip(tripId,(current)=>{
      const next=setReservation(current,item,complete ? {} : null);
      updated=next!==current;
      return next;
    });
    setError(!updated);
    restoreFocus.current=updated && keyboard;
    if (updated && complete) void sync(tripId,item);
    if (updated && !complete) {
      window.clearTimeout(timer.current);
      setReleased(false);
    }
    if (updated && complete && !isStay && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReleased(true);
      window.clearTimeout(timer.current);
      timer.current=window.setTimeout(()=>setReleased(false),420);
    }
  }

  function beginPull(event:PointerEvent<HTMLButtonElement>) {
    if (event.button!==0 || !event.isPrimary) return;
    dragged.current=false;
    grab.current={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false};
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function movePull(event:PointerEvent<HTMLButtonElement>) {
    const start=grab.current;
    if (!start || start.id!==event.pointerId) return;
    const x=event.clientX-start.x,y=event.clientY-start.y;
    start.moved=start.moved || Math.hypot(x,y)>5;
    if (!start.moved) return;
    const progress=Math.min(1,pullDistance(x,y)/tearDistance);
    const button=event.currentTarget;
    button.dataset.dragging="true";
    button.style.setProperty("--stub-turn",progress*17+"deg");
    button.style.setProperty("--stub-drop",progress*12+"px");
  }

  function endPull(event:PointerEvent<HTMLButtonElement>,commit=false) {
    const start=grab.current;
    if (!start || start.id!==event.pointerId) return;
    grab.current=null;
    dragged.current=start.moved;
    const button=event.currentTarget;
    delete button.dataset.dragging;
    button.style.removeProperty("--stub-turn");
    button.style.removeProperty("--stub-drop");
    if (commit && pullDistance(event.clientX-start.x,event.clientY-start.y)>=tearDistance) {
      dragged.current=true;
      record(true);
    }
  }

  return <div className={"booking-confirmation "+(isStay ? "stay-confirmation" : "ticket-confirmation")} data-confirmed={confirmed}>
    {confirmed ? <>
      <span className="booking-stamp" role="status"><Check size={16}/> {reservationLabel(item)}</span>
      <BookingAgendaLink tripId={tripId} item={item}/>
      <button ref={action} type="button" className="text-link booking-undo" onClick={(event)=>record(false,event.detail===0)} aria-label={"Desfazer confirmação de "+item.name}><Undo2 size={13}/> Desfazer</button>
    </> : isStay ? <button ref={action} type="button" className="button button-small stay-confirm-button" onClick={(event)=>record(true,event.detail===0)} aria-label={"Marcar como reservada · "+item.name}>
      <KeyRound size={15}/> Marcar como reservada
    </button> : <button ref={action} type="button" className="ticket-tear" aria-label={"Já comprei · "+item.name}
      onPointerDown={beginPull} onPointerMove={movePull} onPointerUp={(event)=>endPull(event,true)} onPointerCancel={endPull} onLostPointerCapture={endPull}
      onClick={(event)=>{if (event.detail===0 || !dragged.current) record(true,event.detail===0);}}>
      <ArrowDownRight size={19} aria-hidden="true"/><span><strong>Já comprei</strong><small>Arraste ou toque</small></span>
    </button>}
    {released && confirmed && <span className="ticket-detached" aria-hidden="true"><Ticket size={23}/></span>}
    {error && <span className="booking-error" role="alert">O roteiro mudou. Confira o item e tente novamente.</span>}
  </div>;
}
