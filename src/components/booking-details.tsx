"use client";

import { Bell, CalendarDays, Pencil } from "lucide-react";
import { useState } from "react";
import { dateKey, queue, registeredReservation, setReservation, shortDate, type Currency, type QueueItem } from "@/lib/planning";
import { changeTrip } from "./local-store";
import { Modal } from "./ui";

export function BookingDetails({tripId,item,currency}: {tripId:string;item:QueueItem;currency:Currency}) {
  const reservation=registeredReservation(item);
  const confirmed=!!reservation?.confirmedByTraveler;
  const [open,setOpen]=useState(false);
  const title=confirmed ? "Editar valor pago" : item.reminder ? "Editar lembrete de consulta" : "Agendar lembrete de consulta";
  const Icon=confirmed ? Pencil : Bell;

  return <>
    <button type="button" className="icon-button booking-detail-button" title={title} aria-label={title+" · "+item.name}
      onClick={()=>setOpen(true)}><Icon size={14} aria-hidden="true"/></button>
    {open && <BookingDetailsDialog key={item.signature+"|"+confirmed} tripId={tripId} item={item} currency={currency}
      confirmed={confirmed} onClose={()=>setOpen(false)}/>}
  </>;
}

function BookingDetailsDialog({tripId,item,currency,confirmed,onClose}: {
  tripId:string;item:QueueItem;currency:Currency;confirmed:boolean;onClose:()=>void;
}) {
  const original=registeredReservation(item)?.paid;
  const [today]=useState(dateKey);
  const [paid,setPaid]=useState(original===undefined ? "" : String(original/100));
  const [date,setDate]=useState(item.reminder ?? (item.opens && item.opens>today ? item.opens : today));
  const [error,setError]=useState("");
  return <Modal title={confirmed ? "Valor pago" : "Lembrete de consulta"} onClose={onClose}>
    <form className="stack" onSubmit={(event)=>{
      event.preventDefault();
      const amount=paid==="" ? undefined : Math.round(Number(paid)*100);
      if (confirmed && amount!==undefined && (!Number.isSafeInteger(amount) || amount<0)) {
        setError("Informe um valor válido.");
        return;
      }
      if (!confirmed && (!date || date<today)) {setError("Escolha uma data para o lembrete.");return;}
      let accepted=false;
      changeTrip(tripId,(current)=>{
        const latest=queue(current).find((row)=>row.id===item.id && row.signature===item.signature);
        if (!latest || !!registeredReservation(latest)?.confirmedByTraveler!==confirmed) return current;
        accepted=true;
        if (confirmed) return setReservation(current,latest,{paid:amount});
        if (latest.reminder===date) return current;
        return {...current,revision:current.revision+1,reminders:{...current.reminders,[item.id]:date}};
      });
      if (accepted) onClose();
      else setError("O roteiro ou a confirmação mudou. Abra o cartão novamente.");
    }}>
      <div className="notice"><CalendarDays size={18}/><div><strong>{item.name}</strong><p>{shortDate(item.day,true)}
        {item.until && item.until!==item.day && " – "+shortDate(item.until,true)}</p></div></div>
      {confirmed
        ? <label>Valor pago em {currency} <small>(opcional)</small><input type="number" min="0" step=".01" value={paid} onChange={(event)=>setPaid(event.target.value)}/></label>
        : <><label>Data da próxima consulta<input type="date" required min={today} value={date} onChange={(event)=>setDate(event.target.value)}/></label>
          <p className="quiet">O lembrete aparece na aba Agenda no fuso {item.zone}.</p></>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button" type="submit">{confirmed ? "Salvar valor" : "Salvar lembrete"}</button>
    </form>
  </Modal>;
}
