"use client";

import { AlertTriangle, Archive, ExternalLink } from "lucide-react";
import { archiveInvalidReservation, invalidReservations, money, shortDate, type Trip } from "@/lib/planning";
import { changeTrip } from "./local-store";

export function ReservationReview({trip}: {trip:Trip}) {
  const invalid=invalidReservations(trip);
  if (!invalid.length) return null;
  return <section className="panel reservation-review" aria-labelledby="reservation-review-title">
    <div className="reservation-review-heading">
      <span className="reservation-review-icon" aria-hidden="true"><AlertTriangle size={20}/></span>
      <div><h2 id="reservation-review-title">Reservas para revisar</h2><p>{invalid.length} {invalid.length===1 ? "confirmação anterior não corresponde" : "confirmações anteriores não correspondem"} mais ao roteiro atual.</p></div>
    </div>
    <ul>
      {invalid.map(({id,reservation,current})=><li key={id+reservation.signature}>
        <div>
          <strong>{reservation.item}</strong>
          <small>Versão registrada: {reservation.replaced ? shortDate(reservation.replaced.day,true)+(reservation.replaced.until && reservation.replaced.until!==reservation.replaced.day ? " – "+shortDate(reservation.replaced.until,true) : "") : "detalhes anteriores indisponíveis"}</small>
          {current && <small>Versão atual: {shortDate(current.day,true)}{current.until && current.until!==current.day ? " – "+shortDate(current.until,true) : ""} · reconfirme no cartão correspondente</small>}
          {reservation.paid!==undefined && <small>Valor registrado: {money(reservation.paid,trip.plan.currency,true)}</small>}
        </div>
        <div className="reservation-review-actions">
          {reservation.googleCalendarLink && <a className="text-link" href={reservation.googleCalendarLink} target="_blank" rel="noreferrer">Evento antigo no Google <ExternalLink size={12}/></a>}
          <button type="button" className="button button-outline button-small" onClick={()=>changeTrip(trip.tripId,(latest)=>archiveInvalidReservation(latest,id,reservation.signature))}><Archive size={14}/> Arquivar aviso</button>
        </div>
      </li>)}
    </ul>
    <p className="quiet">Arquivar não cancela reservas externas. Ele apenas confirma que você revisou o aviso neste navegador.</p>
  </section>;
}
