import { ArrowDown, ArrowRight, Bus, CalendarDays, Clock3, ExternalLink, Plane, Ticket } from "lucide-react";
import { convert, money, queue, registeredReservation, shortDate, ticketOptions, transportBudget, type Trip, type Variant } from "@/lib/planning";
import { BookingConfirmation } from "./booking-confirmation";
import { BookingDetails } from "./booking-details";

export function TicketJump() {
  return <a className="button button-outline button-small ticket-jump" data-tutorial-target="tickets" href="#passagens"><Ticket size={16}/> Ver passagens <ArrowDown size={14}/></a>;
}

export function RouteTickets({variant,trip,afterHeading}: {variant:Variant;trip?:Trip;afterHeading?:React.ReactNode}) {
  const {travelers,currency}=variant.plan;
  const count=variant.legs.length;
  const total=transportBudget(variant);
  if (!count) return null;
  const bookings=trip ? new Map(queue(trip).map((item)=>[item.id,item])) : undefined;

  return <section id="passagens" className="panel route-tickets" aria-labelledby="passagens-title" tabIndex={-1}>
    <header className="tickets-head">
      <span className="tickets-icon"><Ticket size={22}/></span>
      <div><h2 id="passagens-title">Passagens da rota</h2><p>{count} {count===1 ? "trecho" : "trechos"} · {travelers} {travelers===1 ? "viajante" : "viajantes"}</p></div>
      <div className="tickets-total"><small>{total.pending ? "Subtotal estimado" : "Total estimado em passagens"}</small><strong>{total.pending===count ? "A consultar" : money(total.estimated,currency,true)}</strong>{total.pending>0 && <span>{total.pending} {total.pending===1 ? "trecho sem tarifa" : "trechos sem tarifa"}</span>}</div>
    </header>
    {afterHeading}
    <p className="tickets-note">Confira os horários e valores no fornecedor. {trip ? "Depois da compra, rasgue o canhoto para registrar a passagem." : "Salve a viagem para marcar as passagens compradas."}</p>
    <ol className="tickets-list">
      {variant.legs.map((planned,index)=>{
        const ticket=ticketOptions(variant,index);
        if (!ticket) return null;
        const {from,to,options:[primary,alternative]}=ticket;
        const Motor=planned.mode==="Ônibus" ? Bus : Plane;
        const route=from.city.name+" a "+to.city.name;
        const booking=bookings?.get(planned.id);
        const registered=booking && registeredReservation(booking);
        const paid=registered?.confirmedByTraveler ? registered.paid : undefined;
        return <li className="ticket-row" key={planned.id} data-tutorial-target={index===0 ? "ticket-first" : undefined}>
          <div className="ticket-paper">
            <span className="ticket-number" aria-hidden="true">{String(index+1).padStart(2,"0")}</span>
            <div className="ticket-route">
              <h3><span>{from.city.name}</span><ArrowRight size={15}/><span>{to.city.name}</span></h3>
              <p className="ticket-meta"><CalendarDays size={14}/> Saída <time dateTime={from.end}>{shortDate(from.end,true)}</time></p>
              {from.end!==to.start && <p className="ticket-meta">Chegada prevista <time dateTime={to.start}>{shortDate(to.start,true)}</time></p>}
            </div>
            <div className="ticket-mode"><strong><Motor size={16}/> {planned.mode}</strong>{planned.hours!==null && <span><Clock3 size={13}/> {planned.hours} h estimadas</span>}<span>{primary.provider}</span></div>
            <div className="ticket-fare">
              <strong>{paid!==undefined ? money(paid,currency,true) : planned.price===null ? "A consultar" : money(convert(planned.price*travelers,currency),currency,true)}</strong>
              {paid!==undefined ? <small>Valor pago</small> : planned.price!==null && <small>Estimativa {travelers>1 ? "para o grupo" : "por pessoa"}</small>}
            </div>
            <div className="ticket-links">
              <div className="ticket-link-actions">
                <a className={"button button-small"+(planned.price===null ? " button-outline" : "")} href={primary.url} target="_blank" rel="noreferrer"
                  aria-label={(planned.price===null ? "Consultar passagem de " : "Consultar e comprar passagem de ")+route}>
                  {planned.price===null ? "Consultar passagem" : "Consultar e comprar"} <ExternalLink size={13}/>
                </a>
                {trip && booking && <BookingDetails key={booking.signature} tripId={trip.tripId} item={booking} currency={currency}/>}
              </div>
              {alternative && <a className="text-link" href={alternative.url} target="_blank" rel="noreferrer">Alternativa {alternative.leg.mode==="Ônibus" ? "de ônibus" : "de avião"} <ExternalLink size={11}/></a>}
            </div>
          </div>
          <div className="ticket-edge">
            {trip && booking ? <BookingConfirmation key={booking.signature} item={booking} tripId={trip.tripId}/>
              : <Ticket className="ticket-preview-stub" size={22} aria-hidden="true"/>}
          </div>
        </li>;
      })}
    </ol>
  </section>;
}
