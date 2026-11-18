"use client";

import { ArrowRight, BedDouble, Bus, ExternalLink, House, Plane, Ticket, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { bookingStay, daysBetween, money, queue, registeredReservation, shortDate, type Trip, type Variant } from "@/lib/planning";
import { BookingConfirmation } from "./booking-confirmation";
import { BookingDetails } from "./booking-details";
import { RouteTickets } from "./route-tickets";

export type BookingSection = "tickets" | "stays";

export type RouteBookingOptions = {
  onOpenSection?:(section:BookingSection)=>void;
  onChooseStay?:()=>void;
  afterTicketHeading?:React.ReactNode;
  afterStayHeading?:React.ReactNode;
  initialSection?:BookingSection;
};

export type RouteBookingsProps = RouteBookingOptions & {variant:Variant;trip?:Trip};

function linkedSection(): BookingSection | undefined {
  if (typeof window==="undefined") return;
  if (window.location.hash==="#passagens") return "tickets";
  if (window.location.hash==="#hospedagens") return "stays";
}

export function RouteBookings({variant,trip,onStay,onOpenSection,onChooseStay,afterTicketHeading,afterStayHeading,initialSection,children}: RouteBookingsProps & {
  onStay:(id:string)=>void;children:React.ReactNode;
}) {
  const [open,setOpen]=useState<BookingSection|undefined>(()=>initialSection ?? linkedSection());
  const fullList=useRef<HTMLDivElement>(null);
  const ticketsButton=useRef<HTMLButtonElement>(null);
  const staysButton=useRef<HTMLButtonElement>(null);
  const {legs,stops,plan:{travelers,currency}}=variant;
  const stayBookings=trip && open==="stays" ? new Map(queue(trip).map((item)=>[item.id,item])) : undefined;
  function openList(section:BookingSection) {
    onOpenSection?.(section);
    if (open===section) {
      fullList.current?.scrollIntoView({block:"start",behavior:"instant"});
      fullList.current?.focus({preventScroll:true});
      return;
    }
    setOpen(section);
  }
  function closeList() {
    setOpen(undefined);
    (open==="tickets" ? ticketsButton : staysButton).current?.focus();
  }
  function chooseStay(id:string) {
    setOpen(undefined);
    onStay(id);
    onChooseStay?.();
  }

  useEffect(()=>{
    if (!open) return;
    fullList.current?.scrollIntoView({block:"start",behavior:"instant"});
    fullList.current?.focus({preventScroll:true});
  },[open]);

  return <div className="route-booking-layout">
    <section className="route-bookings" aria-label="Passagens e hospedagens">
      {legs.length>0 && <article className="panel route-booking-preview">
        <header className="route-booking-heading">
          <span className="route-booking-icon"><Ticket size={20} aria-hidden="true"/></span>
          <div><h3>Passagens da rota</h3><p>{legs.length} {legs.length===1 ? "trecho" : "trechos"}</p></div>
        </header>
        <ol className="route-preview-list" aria-label="Prévia de passagens">
          {legs.slice(0,3).map((leg,index)=>{
            const from=stops[index],to=stops[index+1];
            if (!from || !to) return null;
            const Mode=leg.mode==="Ônibus" ? Bus : Plane;
            return <li className="route-preview-row" key={leg.id}>
              <Mode size={14} aria-hidden="true"/>
              <strong>{from.city.name} → {to.city.name}</strong>
              <time dateTime={from.end}>{shortDate(from.end)}</time>
            </li>;
          })}
        </ol>
        <button ref={ticketsButton} type="button" className="text-link route-booking-more" aria-expanded={open==="tickets"} aria-controls="route-booking-list"
          data-tutorial-target={onOpenSection ? "tickets" : undefined} onClick={()=>openList("tickets")}>Ver todos os trechos ({legs.length}) <ArrowRight size={14}/></button>
      </article>}
      <article className="panel route-booking-preview">
        <header className="route-booking-heading">
          <span className="route-booking-icon"><House size={20} aria-hidden="true"/></span>
          <div><h3>Hospedagens da rota</h3><p>{stops.length} {stops.length===1 ? "hospedagem" : "hospedagens"}</p></div>
        </header>
        <ol className="route-preview-list" aria-label="Prévia de hospedagens">
          {stops.slice(0,3).map((stop)=>{
            const nights=daysBetween(stop.start,stop.end);
            return <li key={stop.id}><button type="button" className="route-preview-row" aria-label={"Ver hospedagem em "+stop.city.name+" no mapa"} onClick={()=>chooseStay(stop.id)}>
              <BedDouble size={14} aria-hidden="true"/>
              <strong>{stop.city.name}, {stop.city.country}</strong>
              <small>{nights} {nights===1 ? "noite" : "noites"}</small>
            </button></li>;
          })}
        </ol>
        <button ref={staysButton} type="button" className="text-link route-booking-more" aria-expanded={open==="stays"} aria-controls="route-booking-list"
          data-tutorial-target={onOpenSection ? "lodgings" : undefined} onClick={()=>openList("stays")}>Ver todas as hospedagens ({stops.length}) <ArrowRight size={14}/></button>
      </article>
    </section>
    {children}
    <div ref={fullList} id="route-booking-list" className="route-booking-list" tabIndex={-1} hidden={!open}>
      <button type="button" className="button button-outline button-small route-booking-close" onClick={closeList}><X size={15}/> Fechar lista</button>
      {open==="tickets" && <RouteTickets variant={variant} trip={trip} afterHeading={afterTicketHeading}/>}
      {open==="stays" && <section id="hospedagens" className="panel route-stays" aria-labelledby="route-stays-heading">
        <h2 id="route-stays-heading">Hospedagens da rota</h2>
        {afterStayHeading}
        <ol aria-label="Hospedagens na ordem da rota">
          {stops.map((stop,index)=>{
            const booking=stayBookings?.get(stop.id);
            const reservation=booking && registeredReservation(booking);
            const paid=reservation?.confirmedByTraveler ? reservation.paid : undefined;
            return <li className="route-stay-item" key={stop.id}>
              <button type="button" className="route-stay" data-tutorial-target={index===0 && onOpenSection ? "stay-first" : undefined}
                aria-label={"Ver no mapa: "+stop.stay.name+" em "+stop.city.name+", parada "+(index+1)} onClick={()=>chooseStay(stop.id)}>
                <span className="ticket-number" aria-hidden="true">{String(index+1).padStart(2,"0")}</span>
                <span className="route-stay-name"><strong>{stop.city.name}, {stop.city.country}</strong><small>{stop.stay.name} · {stop.stay.type}</small>
                  {paid!==undefined && <small>Valor pago · {money(paid,currency,true)}</small>}
                </span>
                <span className="route-stay-dates"><time dateTime={stop.start}>{shortDate(stop.start,true)}</time> – <time dateTime={stop.end}>{shortDate(stop.end,true)}</time></span>
                <ArrowRight size={17} aria-hidden="true"/>
              </button>
              <div className="route-stay-actions">
                <a className="button button-outline button-small" href={bookingStay(stop,travelers)} target="_blank" rel="noreferrer"
                  aria-label={"Buscar hospedagem em "+stop.city.name}><BedDouble size={14}/> Buscar hospedagem <ExternalLink size={12}/></a>
                {trip && booking && <BookingDetails key={booking.signature+"-details"} item={booking} tripId={trip.tripId} currency={currency}/>}
                {trip && booking && <BookingConfirmation key={booking.signature} item={booking} tripId={trip.tripId}/>}
              </div>
            </li>;
          })}
        </ol>
      </section>}
    </div>
  </div>;
}
