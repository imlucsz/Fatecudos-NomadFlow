"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, Check, Coins, Flag, Route, Share2, Star } from "lucide-react";
import { useState } from "react";
import type { Template } from "@/lib/destinations";
import { accountSettingsPath } from "@/lib/account-path";
import { shortDate, type Trip } from "@/lib/planning";
import { beginJourney, journeySummary } from "@/lib/journey";
import { publishTrip } from "@/lib/publishing";
import { changeTrip, publish, setRouteVisibility, useLocal, withdraw } from "./local-store";
import { Budget } from "./compare";
import { Itinerary } from "./itinerary";
import { Agenda } from "./trip-agenda";
import { Empty, Modal } from "./ui";

function ShareDialog({trip,model,onClose}: {trip:Trip;model?:Template;onClose:() => void}) {
  const {owner,hidePublishedRoutes,published} = useLocal();
  const visible=!!model && published.some((item)=>item.slug===model.slug);
  const [title,setTitle] = useState(model?.title ?? trip.title);
  const [description,setDescription] = useState(model?.description ?? "");
  const [removing,setRemoving] = useState(false);
  return <Modal title={model ? "Gerenciar modelo" : "Publicar como modelo"} onClose={onClose}>
    {removing && model ? <div className="stack"><p>Retirar o modelo fecha a página no catálogo. Viagens que já foram copiadas continuam disponíveis.</p><button className="button" onClick={()=>{withdraw(model.slug);onClose();}}>Retirar modelo do catálogo</button><button className="button button-outline" onClick={()=>setRemoving(false)}>Cancelar</button></div> :
    <form className="stack" onSubmit={(event)=>{
      event.preventDefault();
      if (!title.trim()) return;
      publish(publishTrip(trip,owner,title.trim(),description.trim(),model));
      onClose();
    }}>
      <p className="quiet">{model && !visible ? "Este roteiro está privado. Você pode atualizar os dados e escolher quando exibi-lo no Explorar." : "O catálogo deste navegador recebe a sequência, as noites relativas e a estimativa histórica. Outros perfis locais poderão usar esse modelo."}</p>
      <label>Título público<input value={title} onChange={(event)=>setTitle(event.target.value)} required maxLength={90}/></label>
      <label>Descrição pública<textarea value={description} onChange={(event)=>setDescription(event.target.value)} maxLength={200}/></label>
      <button className="button" type="submit">{model ? visible ? "Publicar nova versão" : "Salvar nova versão" : "Publicar modelo"} <ArrowUpRight size={17}/></button>
      {model && <div className="share-actions">
        {visible && <Link className="text-link" href={"/explorar/"+model.slug}>Ver versão {model.version} <ArrowUpRight size={15}/></Link>}
        {hidePublishedRoutes ? <Link className="text-link" href={accountSettingsPath+"#privacidade"}>Privacidade das rotas</Link>
          : <button type="button" className="text-link" onClick={()=>{setRouteVisibility(model.slug,visible ? "private" : "public");onClose();}}>{visible ? "Tornar privado" : "Tornar público"}</button>}
        <button type="button" className="text-link" onClick={()=>setRemoving(true)}>Retirar do catálogo</button>
      </div>}
    </form>}
  </Modal>;
}

function JourneyProgress({trip,model}: {trip:Trip;model?:Template}) {
  const {routeActivity} = useLocal();
  const likes=model ? routeActivity[model.slug]?.stars.length ?? 0 : 0;
  const {current,visited,upcoming,remaining} = journeySummary(trip);
  const countries = (stops: Trip["stops"])=>[...new Set(stops.map((stop)=>stop.city.country))].join(" · ");
  return <section className="panel journey-progress" aria-label="Progresso da viagem">
    <div className="trip-progress">
      <span className="trip-progress-icon">{remaining ? <Flag size={18}/> : <Check size={19}/>}</span>
      <div aria-live="polite"><strong>{visited.length} de {trip.stops.length} paradas concluídas</strong><progress aria-label="Paradas concluídas" value={visited.length} max={trip.stops.length}/></div>
      {remaining>0 && !trip.journey
        ? <button type="button" className="button button-small" onClick={()=>changeTrip(trip.tripId,(latest)=>beginJourney(latest))}>Iniciar viagem <ArrowRight size={15}/></button>
        : <span className="status">{remaining ? "Em viagem" : "Viagem concluída"}</span>}
    </div>
    <div className="journey-bands">
      <div><span><i className="visited"/> Países visitados</span><strong>{countries(visited) || "Nenhum ainda"}</strong></div>
      <div><span><i className="current"/> Parada atual</span><strong>{current ? current.city.name+", "+current.city.country : remaining ? "Viagem por iniciar" : "Trajeto concluído"}</strong></div>
      <div><span><i className="upcoming"/> Próximos países</span><strong>{countries(upcoming) || "Nenhuma próxima parada"}</strong></div>
    </div>
    {model && <div className="journey-model"><Link className="text-link" href={"/explorar/"+model.slug}>Ver rota no Explorar <ArrowUpRight size={15}/></Link><span><Star size={14} aria-hidden="true"/> {likes} {likes===1 ? "curtida" : "curtidas"}</span></div>}
  </section>;
}

function Travel({trip,section,model,reservation}: {trip:Trip;section?:string;model?:Template;reservation?:string}) {
  const {hidePublishedRoutes,published}=useLocal();
  const [sharing,setSharing] = useState(false);
  const publicModel=model && published.some((item)=>item.slug===model.slug) ? model : undefined;
  const tabs = [{path:"",label:"Mapa",icon:Route},{path:"/agenda",label:"Agenda",icon:CalendarDays}];
  const base = "/viagens/"+trip.tripId;
  return <>
    <Link className="text-link back-link" href="/viagens"><ArrowLeft size={16}/> Minhas viagens</Link>
    <div className="page-head"><div><span className="eyebrow"><Route size={16}/> Viagem salva</span><h1>{trip.title}</h1><p>{shortDate(trip.plan.start,true)} – {shortDate(trip.plan.endDate,true)} · {trip.plan.travelers} {trip.plan.travelers === 1 ? "viajante" : "viajantes"}</p></div><div className="page-head-actions">
      {hidePublishedRoutes && !model ? <Link className="button button-outline" href={accountSettingsPath+"#privacidade"}><Share2 size={16}/> Privacidade das rotas</Link>
        : <button className="button button-outline" onClick={()=>setSharing(true)}><Share2 size={16}/> {model ? "Gerenciar modelo" : "Publicar como modelo"}</button>}
    </div></div>
    <JourneyProgress trip={trip} model={publicModel}/>
    <nav className="trip-tabs" aria-label="Áreas da viagem">{tabs.map(({path,label,icon:Icon})=><Link key={label} href={base+path} aria-current={path===(section ? "/"+section : "") ? "page" : undefined}><Icon size={17}/> {label}</Link>)}</nav>
    {section==="agenda" ? <Agenda key={reservation} trip={trip} reservation={reservation}/> :
      <div className="stack"><Itinerary variant={trip} trip={trip}/>
        <section className="panel feature-panel"><h2><Coins size={20}/> Orçamento da viagem</h2><Budget variant={trip}/></section>
      </div>}
    {sharing && <ShareDialog trip={trip} model={model} onClose={()=>setSharing(false)}/>}
  </>;
}

export function TripPage({id,section,reservation}: {id:string;section?:string;reservation?:string}) {
  const {trips,ownedModels} = useLocal();
  const trip = trips.find((item)=>item.tripId===id);
  if (!trip) return <Empty title="Viagem indisponível" description="Procure o roteiro em Minhas viagens ou mude para o perfil em que você o salvou." href="/viagens" label="Minhas viagens"/>;
  if (section && section!=="agenda") return <Empty title="Área da viagem indisponível" description="Abra o mapa ou a agenda pelo roteiro da viagem." href={"/viagens/"+id} label="Voltar ao roteiro"/>;
  return <Travel trip={trip} section={section} reservation={reservation} model={ownedModels.find((item)=>item.tripId===id)} key={trip.tripId}/>;
}
