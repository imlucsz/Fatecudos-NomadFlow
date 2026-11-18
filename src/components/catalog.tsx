"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, Globe2, MapPin, Route, Search, Star } from "lucide-react";
import { accountPath } from "@/lib/account-path";
import { templates, type Template } from "@/lib/destinations";
import { costs, fx, money, normalize, shortDate } from "@/lib/planning";
import { countryForCity } from "@/lib/world-catalog";
import { endTutorial, toggleRouteStar, updateTutorial, useLocal } from "./local-store";
import { Cta, Empty, Media } from "./ui";
import { TrailExplorer } from "./trail-explorer";
import { TutorialCard } from "./tutorial";
import { RouteBookmark } from "./route-bookmark";

const continents=[
  ["all","Todos"],["SA","América do Sul"],["NA","América do Norte"],["EU","Europa"],
  ["AS","Ásia"],["AF","África"],["OC","Oceania"],
] as const;
const likeLabel=(count:number)=>count+(count===1 ? " curtida" : " curtidas");
const usageLabel=(count:number)=>count+(count===1 ? " uso" : " usos");
const durationLabel=(days:number)=>days===365 || days===366 ? "1 ano" : days===730 || days===731 ? "2 anos" : days+" dias";
const priceInBRL=(item:Template)=>item.price===null ? Infinity : item.price/fx[item.currency];

function RouteStar({item,returnTo}: {item:Template;returnTo:string}) {
  const {active,routeActivity} = useLocal();
  const stars=routeActivity[item.slug]?.stars ?? [];
  const liked=!!active && stars.includes(active.id);
  const count=likeLabel(stars.length);
  const content=<><Star size={16} fill={liked ? "currentColor" : "none"} aria-hidden="true"/><span aria-hidden="true">{stars.length}</span></>;
  if (!active) return <Link className="catalog-star" href={accountPath(returnTo)} aria-label={"Entre para curtir "+item.title+" · "+count}>{content}</Link>;
  if (active.id===item.owner) return <span className="catalog-star" role="img" aria-label={count}>{content}</span>;
  return <button type="button" className="catalog-star" aria-pressed={liked} aria-label={"Curtir "+item.title+" · "+count} onClick={()=>toggleRouteStar(item.slug)}>{content}</button>;
}

function TemplateCard({item,author,uses,rank}: {item:Template;author?:string;uses:number;rank?:number}) {
  const href="/explorar/"+item.slug;
  return <article className="catalog-card panel">
    <Link className="catalog-card-link" href={href}>
      <div className="catalog-photo"><Media name={item.image}/><span>{item.owner ? "Comunidade" : "Roteiro pronto"}</span>{rank && <span className="catalog-rank" aria-label={rank+"º lugar"}>#{rank}</span>}</div>
      <div className="catalog-body"><div><h2>{item.title}</h2><ArrowUpRight size={19} aria-hidden="true"/></div>
        {author && <span className="catalog-author">Por {author}</span>}
        {item.description && <p>{item.description}</p>}
        <div className="catalog-meta"><span><CalendarDays size={14}/> {durationLabel(item.days)}</span><span><Route size={14}/> {item.sequence.length+2} paradas</span></div>
        <div className="catalog-card-footer"><span>{item.price===null ? "Estimativa em aberto" : <><strong>{money(item.price,item.currency)}</strong> estimados</>}</span>{uses>0 && <span>{usageLabel(uses)}</span>}</div>
      </div>
    </Link>
    <div className="catalog-card-actions"><RouteBookmark item={item}/><RouteStar item={item} returnTo={href}/></div>
  </article>;
}

function CatalogResults({initial}: {initial:string}) {
  const {published,profiles,routeActivity,tutorial} = useLocal();
  const [query,setQuery] = useState(initial);
  const [page,setPage] = useState(1);
  const [continent,setContinent] = useState<string>("all");
  const [source,setSource] = useState("all");
  const [duration,setDuration] = useState("all");
  const [order,setOrder] = useState("featured");
  const [sawCommunity,setSawCommunity] = useState(false);
  const [finishedTutorial,setFinishedTutorial] = useState(false);
  const routes=useMemo(()=>[...published,...templates].map((item)=>{
    const places=[item.origin,...item.sequence,item.end];
    const regions=new Set(places.map((place)=>countryForCity(place)?.continent));
    const regionNames=continents.filter(([code])=>regions.has(code)).map(([,label])=>label);
    const author=profiles.find((profile)=>profile.id===item.owner)?.name;
    const search=normalize([item.title,item.description,author,...item.tags,...regionNames,...places.flatMap((place)=>[place.name,place.country])].join(" "));
    return {item,regions,author,search,stars:routeActivity[item.slug]?.stars.length ?? 0,uses:routeActivity[item.slug]?.uses.length ?? 0};
  }),[published,profiles,routeActivity]);
  const terms=normalize(query).split(/\s+/).filter(Boolean);
  const items=routes.filter(({item,regions,search})=>
    terms.every((term)=>search.includes(term)) && (continent==="all" || regions.has(continent)) &&
    (source==="all" || (source==="community")===(!!item.owner)) &&
    (duration==="all" || (duration==="month" ? item.days<=30 : item.days>=365)));
  if (order==="popular") items.sort((a,b)=>b.stars-a.stars || b.uses-a.uses);
  if (order==="used") items.sort((a,b)=>b.uses-a.uses || b.stars-a.stars);
  if (order==="price") items.sort((a,b)=>priceInBRL(a.item)-priceInBRL(b.item));
  return <>
    <TutorialCard step="explore" title={sawCommunity ? "Conclua seu primeiro roteiro" : "Descubra roteiros prontos e da comunidade"} targets={[sawCommunity ? "catalog-summary" : "source"]}
      action={sawCommunity && <button type="button" className="button button-small" onClick={()=>{endTutorial("complete");setFinishedTutorial(true);}}>Concluir tutorial <ArrowRight size={15}/></button>}>
      {sawCommunity ? <p>O catálogo mostra os roteiros da comunidade publicados neste navegador. Seu roteiro de teste fica em <strong>Minhas viagens</strong>.</p>
        : <p>Clique em <strong>Tipo de roteiro</strong> e escolha <strong>Da comunidade</strong>. No mesmo filtro, você também encontra os roteiros prontos.</p>}
    </TutorialCard>
    {finishedTutorial && <p className="notice" role="status">Tutorial concluído. Seu roteiro de teste está em Minhas viagens.</p>}
    <div className="catalog-search"><Search size={19}/><input type="search" value={query} onChange={(event)=>{setQuery(event.target.value);setPage(1);}} placeholder="Buscar por cidade, país ou roteiro" aria-label="Buscar rotas"/></div>
    <div className="catalog-continents" role="group" aria-label="Continentes">{continents.map(([code,label])=><button type="button" key={code} aria-pressed={continent===code} onClick={()=>{setContinent(code);setPage(1);}}>{label}</button>)}</div>
    <div className="catalog-toolbar">
      <p role="status" data-tutorial-target="catalog-summary">{items.length} {items.length===1 ? "roteiro" : "roteiros"}</p>
      <div className="catalog-selects">
        <select aria-label="Tipo de roteiro" data-tutorial-target="source" value={source} onChange={(event)=>{
          setSource(event.target.value);
          setPage(1);
          if (tutorial?.step==="explore" && event.target.value==="community") setSawCommunity(true);
        }}><option value="all">Todas as rotas</option><option value="ready">Roteiros prontos</option><option value="community">Da comunidade</option></select>
        <select aria-label="Duração da rota" value={duration} onChange={(event)=>{setDuration(event.target.value);setPage(1);}}><option value="all">Qualquer duração</option><option value="month">Até 30 dias</option><option value="year">1 ano ou mais</option></select>
        <select aria-label="Ordenar rotas" value={order} onChange={(event)=>{setOrder(event.target.value);setPage(1);}}><option value="featured">Em destaque</option><option value="popular">Mais curtidas</option><option value="used">Mais usadas</option><option value="price">Menor custo estimado</option></select>
      </div>
    </div>
    {order==="price" && <p className="quiet catalog-price-note">Valores comparados em reais pela conversão da demonstração.</p>}
    {items.length ? <div className="catalog-grid">{items.slice(0,page*9).map(({item,author,stars,uses},index)=><TemplateCard item={item} key={item.slug} author={author} uses={uses} rank={(order==="popular" && stars>0 || order==="used" && uses>0) ? index+1 : undefined}/>)}</div> : <Empty title="Nenhum roteiro encontrado" description={source==="community" && !published.length ? "Os roteiros publicados por perfis deste navegador aparecem aqui." : "Experimente outra cidade, continente ou duração."}/>}
    {items.length>page*9 && <button className="button button-outline catalog-more" onClick={()=>setPage(page+1)}>Carregar mais roteiros</button>}
  </>;
}
export function Catalog() {
  const params=useSearchParams();
  const initial=params.get("destino") ?? "";
  return <CatalogResults initial={initial} key={initial}/>;
}

function TemplateMap({item}: {item:Template}) {
  const points = useMemo(()=>[item.origin,...item.sequence,item.end].map((city,index)=>({id:"template-"+index,city})),[item]);
  const [selected,setSelected] = useState(points[0].id);
  const index = Math.max(0,points.findIndex((point)=>point.id===selected));
  const point = points[index];
  return <TrailExplorer points={points} selected={selected} onSelect={setSelected}>
    <div className="stop-detail">
      <div className="stop-header" aria-live="polite"><div><span className="stop-country"><MapPin size={13}/> {point.city.country}</span><h3>{point.city.name}</h3>{!!item.nights[index] && <p className="quiet">{item.nights[index]} noites sugeridas</p>}</div></div>
      <div className="stop-offers">
        <p className="stat-row"><span>Duração do modelo</span><strong>{item.days} dias · {points.length} paradas</strong></p>
        <p className="stat-row"><span>Estimativa histórica</span><strong>{item.price===null ? "Em aberto" : money(item.price,item.currency)}</strong></p>
      </div>
    </div>
  </TrailExplorer>;
}

export function TemplatePage({slug}: {slug:string}) {
  const {published,profiles,ready,routeActivity} = useLocal();
  const item = [...published,...templates].find((route)=>route.slug===slug);
  if (!item && !ready) return <p className="quiet" role="status">Abrindo roteiro…</p>;
  if (!item) return <Empty title="Modelo indisponível" description="O modelo pode ter sido retirado ou estar em outro navegador." href="/explorar" label="Voltar ao catálogo"/>;
  const author=profiles.find((profile)=>profile.id===item.owner)?.name;
  const uses=routeActivity[slug]?.uses.length ?? 0;
  return <>
    <Link className="text-link back-link" href="/explorar"><ArrowLeft size={16}/> Explorar rotas</Link>
    <div className="template-hero" style={{backgroundImage:"linear-gradient(90deg,rgba(11,22,26,.84),rgba(11,22,26,.26)),url('/images/"+item.image+".webp')"}}>
      <div><span className="eyebrow"><Globe2 size={16}/> {author ? "Por "+author : item.owner ? "Comunidade" : "Roteiro pronto"}{uses>0 && " · "+usageLabel(uses)}</span><h1>{item.title}</h1>{item.description && <p>{item.description}</p>}</div>
      <div className="template-actions"><RouteBookmark item={item}/><RouteStar item={item} returnTo={"/explorar/"+slug}/><Cta href={"/planejar?modelo="+encodeURIComponent(item.slug)} className="button-white">Usar como modelo</Cta></div>
    </div>
    <TemplateMap item={item} key={item.slug}/>
  </>;
}

export function MyTrips() {
  const {trips,ownedModels,published,owner,routeActivity,tutorial} = useLocal();
  const models=new Map(ownedModels.map((item)=>[item.tripId,item]));
  const publicModels=published.filter((item)=>item.owner===owner);
  const publicSlugs=new Set(publicModels.map((item)=>item.slug));
  const likes=publicModels.reduce((total,item)=>total+(routeActivity[item.slug]?.stars.length ?? 0),0);
  return <>
    <TutorialCard step="trips" title="Encontre a viagem que você salvou" targets={["saved-trip"]}>
      <p>Abra o card destacado. Em <strong>Minhas viagens</strong>, o mapa reúne as passagens e hospedagens de cada roteiro, e a aba Agenda mostra os compromissos.</p>
    </TutorialCard>
    {publicModels.length>0 && <p className="trips-likes-total"><Star size={16} aria-hidden="true"/> {likeLabel(likes)} nas suas rotas publicadas</p>}
    {trips.length ? <div className="trip-cards">{trips.map((trip)=>{
      const totals=costs(trip);
      const done=trip.stops.filter((stop)=>stop.done).length;
      const model=models.get(trip.tripId);
      const guided=tutorial?.step==="trips" && tutorial.tripId===trip.tripId;
      return <Link className="trip-card panel" href={"/viagens/"+trip.tripId} key={trip.tripId} data-tutorial-target={guided ? "saved-trip" : undefined}
        onClick={guided ? ()=>updateTutorial("trips",{openingSavedTrip:true}) : undefined}>
        <div className="trip-card-icon"><MapPin size={22}/></div><div className="trip-card-title"><h2>{trip.title}</h2><p>{shortDate(trip.plan.start,true)} – {shortDate(trip.plan.endDate,true)}</p>{model && <span className="trip-card-likes">{publicSlugs.has(model.slug) ? <><Star size={13} aria-hidden="true"/> {likeLabel(routeActivity[model.slug]?.stars.length ?? 0)}</> : "Roteiro privado"}</span>}</div>
        <div><strong>{done} de {trip.stops.length} paradas concluídas</strong><progress max={trip.stops.length} value={done}/></div>
        <div><strong>{money(totals.known,trip.plan.currency)}</strong><p>{totals.pending ? "Subtotal conhecido" : "Total estimado"}</p></div><ArrowRight size={21}/>
      </Link>;
    })}</div> : <Empty title="Suas viagens salvas aparecem aqui" description="Depois de montar sua rota, escolha um pacote e clique em Salvar viagem."/>}
  </>;
}
