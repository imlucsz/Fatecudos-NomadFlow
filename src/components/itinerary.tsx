"use client";

import { ArrowRight, BedDouble, Bus, Check, Circle, CircleCheck, ExternalLink, Flag, KeyRound, MapPin, Pencil, Plane, Wifi } from "lucide-react";
import { useMemo, useState } from "react";
import { stopContext } from "@/lib/context-data";
import { bookingStay, convert, costs, daysBetween, editStop, evidenceLabels, money, shortDate, stayOptions, ticketOptions, transportOptions, type Evidence, type Leg, type Stay, type Stop, type Trip, type Variant } from "@/lib/planning";
import { beginJourney, statusOf, stopStatusLabels, toggleStopCompleted } from "@/lib/journey";
import { changeTrip, putTrip } from "./local-store";
import { TrailExplorer } from "./trail-explorer";
import type { RouteBookingOptions } from "./route-bookings";
import { RouteTickets } from "./route-tickets";
import { Modal } from "./ui";

function Tag({status}: {status:Evidence}) {
  return <span className={"status status-"+status}>{evidenceLabels[status]}</span>;
}

const opportunities = ["Freelas","Trocas"] as const;

function StopOpportunities({stop}: {stop:Stop}) {
  const [category,setCategory] = useState<typeof opportunities[number]>("Freelas");
  const [radius,setRadius] = useState(5);
  const {results} = stopContext(stop,radius,category);
  return <div className="context">
    <div className="chip-row" role="group" aria-label="Oportunidades na parada">{opportunities.map((item)=><button key={item} className="filter-chip" aria-pressed={category===item} onClick={()=>setCategory(item)}>{item}</button>)}</div>
    <div className="context-radius"><label>Raio de busca<select value={radius} onChange={(event)=>setRadius(+event.target.value)}>{[1,2,5,10,25].map((km)=><option key={km} value={km}>{km} km</option>)}</select></label><p className="quiet">Distância em linha reta a partir {stop.stay.position ? "da hospedagem" : "do centro da cidade"}.</p></div>
    {results.length ? <div className="context-results">{results.map((item,index)=><article className="context-result" key={item.id}>
      <span className="context-icon">{item.point ? index+1 : <Wifi size={16}/>}</span><div><div className="context-title"><h4>{item.name}</h4><span className="status">Demo</span></div><small>{item.kind}{item.distance!==undefined && " · "+item.distance.toLocaleString("pt-BR",{maximumFractionDigits:1})+" km"}</small><p>{item.description}</p><a className="text-link" href={item.url} target="_blank" rel="noreferrer">Pesquisar no anunciante <ExternalLink size={13}/></a></div>
    </article>)}</div> : <p className="quiet">Nenhum exemplo encontrado neste raio. Amplie a distância ou selecione outra categoria.</p>}
  </div>;
}

function EditStop({trip,index,onClose}: {trip:Trip;index:number;onClose:() => void}) {
  const {plan,stops,legs} = trip;
  const stop = stops[index], previous = stops[index-1], next = stops[index+1];
  const inbound = legs[index-1];
  const stays = stayOptions(stop.city);
  const transit = previous ? transportOptions(previous.city,stop.city,inbound.id,inbound.from,inbound.to) : [];
  const [stayChoice,setStayChoice] = useState(stop.stay.id);
  const [legChoice,setLegChoice] = useState<string>(inbound?.provider === "Manual" ? "manual" : inbound?.mode ?? "");
  const [start,setStart] = useState(stop.start);
  const [end,setEnd] = useState(stop.end);
  const [manualStay,setManualStay] = useState(stop.stay.id === "manual" ? stop.stay.name : "");
  const [manualNight,setManualNight] = useState(stop.stay.id === "manual" && stop.stay.nightly !== null ? String(stop.stay.nightly/100) : "");
  const [manualLat,setManualLat] = useState(stop.stay.id === "manual" ? String(stop.stay.position?.lat ?? "") : "");
  const [manualLon,setManualLon] = useState(stop.stay.id === "manual" ? String(stop.stay.position?.lon ?? "") : "");
  const [manualFare,setManualFare] = useState(inbound?.provider === "Manual" && inbound.price !== null ? String(inbound.price/100) : "");
  const [manualHours,setManualHours] = useState(inbound?.provider === "Manual" && inbound.hours !== null ? String(inbound.hours) : "");
  const [manualMode,setManualMode] = useState(inbound?.mode ?? "Avião");
  const [conflict,setConflict] = useState(false);
  const stay: Stay = stayChoice === "manual" ? {
    ...stop.stay,id:"manual",name:manualStay.trim() || "Hospedagem manual",nightly:manualNight === "" ? null : Math.round(+manualNight*100),
    position:manualLat && manualLon ? {lat:+manualLat,lon:+manualLon} : undefined,status:"review",provider:"Manual",url:undefined,
  } : stays.find((item)=>item.id===stayChoice) ?? stop.stay;
  const leg: Leg | undefined = legChoice === "manual" ? {
    ...inbound,mode:manualMode,price:manualFare === "" ? null : Math.round(+manualFare*100),
    hours:manualHours === "" ? null : +manualHours,status:"review",provider:"Manual",url:undefined,
  } : transit.find((item)=>item.mode===legChoice) ?? inbound;
  const {result,error} = editStop(trip,index,{stay,leg,start,end});
  const delta = result ? costs(result).known-costs(trip).known : 0;
  const updatedBefore = result?.stops[index-1], updatedNext = result?.stops[index+1];
  const affectedStops = result ? result.stops.flatMap((updated,stopIndex) => {
    const original = trip.stops[stopIndex];
    if (!original || (original.start === updated.start && original.end === updated.end && original.stay.id === updated.stay.id)) return [];
    return [{original,updated}];
  }).slice(0,5) : [];
  const moreAffected = result ? Math.max(0,result.stops.filter((updated,stopIndex) => {
    const original = trip.stops[stopIndex];
    return original && (original.start !== updated.start || original.end !== updated.end || original.stay.id !== updated.stay.id);
  }).length-affectedStops.length) : 0;
  return <Modal title={"Editar "+stop.city.name} onClose={onClose}>
    <form className="stack" onSubmit={(event)=>{
      event.preventDefault();
      if (!result) return;
      if (!putTrip(result,trip.revision)) {setConflict(true);return;}
      onClose();
    }}>
      <div className="form-grid"><label>Check-in<input type="date" required value={start} onChange={(event)=>setStart(event.target.value)}/></label><label>Check-out<input type="date" required min={start || undefined} value={end} onChange={(event)=>setEnd(event.target.value)}/></label></div>
      <label>Hospedagem<select aria-label="Hospedagem" value={stayChoice} onChange={(event)=>setStayChoice(event.target.value)}>{stays.map((item)=><option key={item.id} value={item.id}>{item.type} · {item.name} · {item.nightly === null ? "sem valor" : money(convert(item.nightly,plan.currency),plan.currency)+"/noite"}</option>)}<option value="manual">Informar hospedagem manualmente</option></select></label>
      {stayChoice==="manual" && <div className="form-grid"><label>Nome da hospedagem<input required value={manualStay} onChange={(event)=>setManualStay(event.target.value)} maxLength={80}/></label><label>Diária estimada em BRL<input type="number" min="0" step=".01" placeholder="Em aberto" value={manualNight} onChange={(event)=>setManualNight(event.target.value)}/></label></div>}
      {stayChoice==="manual" && <div className="form-grid"><label>Latitude da hospedagem<input type="number" min="-85" max="85" step="any" value={manualLat} onChange={(event)=>setManualLat(event.target.value)} required={!!manualLon} placeholder="Opcional"/></label><label>Longitude da hospedagem<input type="number" min="-180" max="180" step="any" value={manualLon} onChange={(event)=>setManualLon(event.target.value)} required={!!manualLat} placeholder="Opcional"/></label></div>}
      {previous && <label>Passagem de {previous.city.name}<select value={legChoice} onChange={(event)=>setLegChoice(event.target.value)}>{transit.map((item)=><option key={item.mode} value={item.mode}>{item.mode} · {item.price===null ? "sem oferta" : money(convert(item.price,plan.currency),plan.currency)+" / pessoa"}</option>)}<option value="manual">Informar conexão manualmente</option></select></label>}
      {legChoice==="manual" && <div className="form-grid"><label>Modalidade<select value={manualMode} onChange={(event)=>setManualMode(event.target.value as Leg["mode"])}><option>Avião</option><option>Ônibus</option></select></label><label>Valor por pessoa em BRL<input type="number" min="0" step=".01" value={manualFare} onChange={(event)=>setManualFare(event.target.value)} placeholder="Em aberto"/></label><label>Duração em horas<input type="number" min="1" max="72" value={manualHours} onChange={(event)=>setManualHours(event.target.value)} placeholder="Em aberto"/></label></div>}
      {error && <p className="form-error">{error}</p>}
      {conflict && <p className="form-error">A viagem mudou em outra aba. Feche e reabra a edição para revisar a versão atual.</p>}
      {result && <div className="edit-preview" aria-live="polite"><strong>{delta===0 ? "O subtotal conhecido permanece igual" : (delta<0 ? "Economia de " : "Acréscimo de ")+money(Math.abs(delta),plan.currency)}</strong><span>Subtotal atual {money(costs(trip).known,plan.currency)} → novo subtotal {money(costs(result).known,plan.currency)} · {costs(result).pending} itens sem valor</span>
        {!!affectedStops.length && <div className="replan-diff"><strong>Paradas afetadas</strong>{affectedStops.map(({original,updated})=><div className="replan-diff-row" key={updated.id}><span>{updated.city.name}</span><small>{shortDate(original.start)}–{shortDate(original.end)} → {shortDate(updated.start)}–{shortDate(updated.end)}</small></div>)}{moreAffected>0 && <small>+ {moreAffected} outras paradas afetadas</small>}</div>}
        {previous && updatedBefore && <span>{previous.city.name} → {stop.city.name} · partida em {shortDate(updatedBefore.end,true)}</span>}
        {next && updatedNext && <span>{stop.city.name} → {next.city.name} · partida em {shortDate(end,true)} · check-in em {shortDate(updatedNext.start,true)}</span>}
        <small className="quiet">Nada é salvo até você confirmar. Ao cancelar, o plano original permanece intacto. Reservas já registradas preservam o histórico e entram em revisão.</small>
      </div>}
      <div className="edit-actions"><button className="button button-outline" type="button" onClick={onClose}>Cancelar sem alterar</button><button className="button" type="submit" disabled={!result || conflict}>Confirmar replanejamento <Check size={17}/></button></div>
    </form>
  </Modal>;
}

function StopDetails({variant,index,trip,showStaySearch}: {
  variant:Variant;index:number;trip?:Trip;showStaySearch:boolean;
}) {
  const stop = variant.stops[index];
  const {currency,travelers} = variant.plan;
  const status = trip ? statusOf(stop,trip.journey?.currentStopId) : undefined;
  return <div className="stop-detail">
    <div className="stop-header">
      <div aria-live="polite">
        <span className="stop-country"><MapPin size={13}/> {stop.city.country}</span>
        <h3>{stop.city.name}</h3>
        <div className="stop-dates">{shortDate(stop.start,true)} – {shortDate(stop.end,true)} <span>· {daysBetween(stop.start,stop.end)} noites</span></div>
      </div>
      {status && <span className={"status stop-state "+status}>{stopStatusLabels[status]}</span>}
    </div>
    <section className="stay-keycard" aria-label="Hospedagem da parada">
      <span className="stay-keycard-icon" aria-hidden="true"><KeyRound size={19}/></span>
      <div className="stay-keycard-info">
        <small>Hospedagem</small><strong>{stop.stay.name}</strong>
        <small>{stop.stay.type} · {stop.stay.nightly===null ? "Sem valor" : money(convert(stop.stay.nightly,currency),currency)+"/noite estimada"} · {stop.stay.type==="Hostel" ? "por pessoa" : "por quarto"}</small>
      </div>
      {showStaySearch && <div className="stay-keycard-actions">
        <a className="button button-outline button-small" href={bookingStay(stop,travelers)} target="_blank" rel="noreferrer"><BedDouble size={14}/> Buscar hospedagem <ExternalLink size={12}/></a>
      </div>}
    </section>
  </div>;
}

function StopTravelOptions({variant,index,onEdit,actions}: {
  variant:Variant;index:number;onEdit?:()=>void;actions?:React.ReactNode;
}) {
  const stop=variant.stops[index];
  const inbound=variant.legs[index-1];
  const after=variant.legs[index];
  const {currency}=variant.plan;
  const ticket=ticketOptions(variant,index-1) ?? ticketOptions(variant,index);
  const legIcon=(leg:Leg)=>leg.mode==="Avião" ? <Plane size={17}/> : <Bus size={17}/>;
  if (!ticket && !inbound && !after && !onEdit) return null;
  return <div className="stop-detail stop-travel-options">
    {(inbound || (after && after.status!=="ready")) && <div className="stop-offers">
      {inbound && <div>{legIcon(inbound)}<div><strong>{variant.stops[index-1].city.name} → {stop.city.name}</strong><small>{inbound.mode} · {inbound.hours ? inbound.hours+"h estimadas" : "Duração pendente"}{inbound.price !== null && " · "+money(convert(inbound.price,currency),currency)+"/pessoa"}</small><Tag status={inbound.status}/></div></div>}
      {after && after.status!=="ready" && <div>{legIcon(after)}<div><strong>Próximo trecho · {variant.stops[index+1].city.name}</strong><Tag status={after.status}/></div></div>}
    </div>}
    {ticket && <div className="stop-booking" aria-label="Pesquisar passagens">
      <p className="quiet">Passagem {inbound ? "de chegada" : "de saída"} · {ticket.from.city.name} → {ticket.to.city.name} · {shortDate(ticket.from.end,true)}</p>
      {ticket.options.map(({leg,url},option)=><a key={leg.mode} className={"button button-small"+(option===0 ? "" : " button-outline")} href={url} target="_blank" rel="noreferrer">{legIcon(leg)} {leg.mode==="Avião" ? "Buscar voos" : "Buscar ônibus"} <ExternalLink size={12}/></a>)}
    </div>}
    {onEdit && <div className="stop-actions">{actions}<button type="button" className="button button-outline button-small" onClick={onEdit}><Pencil size={14}/> Editar parada</button></div>}
  </div>;
}

export function Itinerary({variant,trip,bookingOptions=trip ? {} : undefined,onCafes,nearbyAction,mapId}: {
  variant:Variant;trip?:Trip;bookingOptions?:RouteBookingOptions;onCafes?:()=>void;nearbyAction?:React.ReactNode;mapId?:string;
}) {
  const [selected,setSelected] = useState<string>();
  const [editing,setEditing] = useState(false);
  const currentId = trip?.journey?.currentStopId;
  const index = Math.max(0,variant.stops.findIndex((stop)=>stop.id===(selected ?? currentId)));
  const stop = variant.stops[index];
  const markers = useMemo(()=>variant.stops.map((item)=>({id:item.id,city:item.city,status:statusOf(item,currentId)})),[variant.stops,currentId]);
  const pending = useMemo(()=>variant.legs.map((leg)=>leg.status!=="ready"),[variant.legs]);
  const stopIsCurrent = stop.id===currentId;
  const finalStop = variant.stops.every((item)=>item.id===stop.id || item.done);
  function goToStop() {
    if (!trip) return;
    changeTrip(trip.tripId,(current)=>beginJourney(current,stop.id));
    setSelected(undefined);
  }
  function completeStop() {
    if (!trip) return;
    changeTrip(trip.tripId,(current)=>toggleStopCompleted(current,stop.id));
    if (stopIsCurrent && !finalStop) setSelected(undefined);
  }
  const actions = trip && <>
    {!stop.done && !trip.journey && <button className="button button-small" type="button" onClick={goToStop}><Flag size={14}/> Iniciar nesta parada</button>}
    {!stop.done && !stopIsCurrent && trip.journey && <button className="button button-small" type="button" onClick={goToStop}><Flag size={14}/> Estou nesta parada</button>}
    <button type="button" className={"button button-small"+(stopIsCurrent ? "" : " button-outline")} onClick={completeStop}>
      {stop.done ? <CircleCheck size={16}/> : stopIsCurrent ? <ArrowRight size={16}/> : <Circle size={15}/>}
      {stop.done ? "Reabrir parada" : stopIsCurrent ? finalStop ? "Concluir viagem" : "Concluir e avançar" : "Marcar parada como concluída"}
    </button>
  </>;
  return <>
    <TrailExplorer points={markers} pending={pending} selected={stop.id} onSelect={setSelected} tracking={!!trip} onCafes={onCafes} nearbyAction={nearbyAction}
      bookings={bookingOptions && {...bookingOptions,variant,trip}} mapId={mapId}
      stopOptions={<StopTravelOptions variant={variant} index={index} onEdit={trip ? ()=>setEditing(true) : undefined} actions={actions}/>}
      stop={stop} extras={<StopOpportunities stop={stop} key={stop.id}/>}>
      <StopDetails variant={variant} index={index} trip={trip} showStaySearch={!bookingOptions}/>
    </TrailExplorer>
    {!bookingOptions && <RouteTickets variant={variant}/>}
    {editing && trip && <EditStop trip={trip} index={index} onClose={()=>setEditing(false)}/>}
  </>;
}
