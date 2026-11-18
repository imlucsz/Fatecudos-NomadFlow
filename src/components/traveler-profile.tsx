"use client";

import Link from "next/link";
import { ArrowUpRight, Bookmark, Check, MapPin, Route, Settings } from "lucide-react";
import { useState } from "react";
import { accountSettingsPath } from "@/lib/account-path";
import { templates } from "@/lib/destinations";
import { shortDate, type Trip } from "@/lib/planning";
import { useLocal } from "./local-store";
import { ProfileAvatar } from "./profile-avatar";
import { ProfileMap } from "./profile-map";
import { RouteBookmark } from "./route-bookmark";
import { PageBanner } from "./site-chrome";
import { Media } from "./ui";

const filters=[["all","Todas"],["saved","Salvas"],["done","Concluídas"]] as const;
type TripFilter=typeof filters[number][0];

function isComplete(trip:Trip) {
  return trip.stops.length>0 && trip.stops.every((stop)=>stop.done);
}

export function ProfileBanner() {
  const {active,trips}=useLocal();
  if (!active) return null;
  const complete=trips.filter(isComplete).length;
  const summary=trips.length+" "+(trips.length===1 ? "viagem" : "viagens")+" · "+
    complete+" "+(complete===1 ? "concluída" : "concluídas");
  return <PageBanner title={active.name} description={summary}
    leading={<ProfileAvatar name={active.name} photo={active.avatar}/>}
    action={<Link className="button button-white" href={accountSettingsPath+"#perfil"}><Settings size={16}/> Editar perfil</Link>}/>;
}

export function TravelerProfile() {
  const {active,trips,published,savedRoutes}=useLocal();
  const [filter,setFilter]=useState<TripFilter>("all");
  if (!active) return null;
  const travel=trips.map((trip)=>({trip,complete:isComplete(trip),
    inProgress:!!trip.journey?.startedAt || trip.stops.some((stop)=>stop.done)}));
  const complete=travel.filter((row)=>row.complete).length;
  const shown=filter==="all" ? travel : travel.filter((row)=>row.complete===(filter==="done"));
  const savedTemplates=savedRoutes.flatMap((slug)=>{
    const item=published.find((route)=>route.slug===slug) ?? templates.find((route)=>route.slug===slug);
    return item ? [item] : [];
  });
  const counts={all:trips.length,saved:trips.length-complete,done:complete};

  return <div className="traveler-profile">
    <ProfileMap trips={trips}/>
    <section className="profile-collection" aria-labelledby="profile-trips-title">
      <div className="profile-collection-head">
        <h2 id="profile-trips-title">Viagens</h2>
        <div className="chip-row" role="group" aria-label="Filtrar viagens">
          {filters.map(([id,label])=><button type="button" key={id} className="filter-chip" aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label} <span>{counts[id]}</span></button>)}
        </div>
      </div>
      {shown.length ? <div className="profile-trips">{shown.map(({trip,inProgress,complete:finished})=>{
        const locations=[...new Set(trip.stops.map((stop)=>stop.city.country))];
        return <Link className="profile-trip panel" key={trip.tripId} href={"/viagens/"+trip.tripId}>
          <span className="profile-trip-icon">{finished ? <Check size={21}/> : <Route size={21}/>}</span>
          <div><h3>{trip.title}</h3><p>{locations.join(" · ")}</p></div>
          <span className="status">{finished ? "Concluída" : inProgress ? "Em andamento" : "Planejada"}</span>
          <span className="profile-trip-dates">{shortDate(trip.plan.start,true)} – {shortDate(trip.plan.endDate,true)}</span>
          <ArrowUpRight size={18} aria-hidden="true"/>
        </Link>;
      })}</div> : <div className="profile-empty panel">
        <MapPin size={21} aria-hidden="true"/><p>{filter==="done" ? "As viagens aparecem aqui quando todas as paradas forem concluídas." : "Suas próximas viagens aparecem aqui depois de salvar o roteiro."}</p>
        {filter!=="done" && <Link className="text-link" href="/planejar">Planejar viagem <ArrowUpRight size={14}/></Link>}
      </div>}
    </section>
    {filter!=="done" && <section className="profile-collection" aria-labelledby="profile-bookmarks-title">
      <div className="profile-collection-head"><h2 id="profile-bookmarks-title">Roteiros salvos</h2><Link className="text-link" href="/explorar">Explorar rotas <ArrowUpRight size={15}/></Link></div>
      {savedTemplates.length ? <div className="profile-bookmarks">{savedTemplates.map((item)=><article className="profile-bookmark panel" key={item.slug}>
        <Link href={"/explorar/"+item.slug}>
          <div className="profile-bookmark-photo"><Media name={item.image}/></div>
          <div><h3>{item.title}</h3><p>{item.origin.name} · {item.days} dias</p></div>
        </Link>
        <RouteBookmark item={item}/>
      </article>)}</div> : <div className="profile-empty panel"><Bookmark size={20} aria-hidden="true"/><p>Salve uma rota no Explorar para encontrá-la aqui quando quiser viajar.</p></div>}
    </section>}
  </div>;
}
