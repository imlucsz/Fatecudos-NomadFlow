"use client";

import { ArrowUpRight, Check, Coffee, Compass, Flag, Laptop, LocateFixed, Map as MapIcon, MapPin, RotateCcw, Utensils } from "lucide-react";
import type { Feature } from "geojson";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { stopStatusLabels } from "@/lib/journey";
import { address, type Stop } from "@/lib/planning";
import { findNearbyPlaces, nearbyCategories, type NearbyCategory, type NearbyPlace } from "@/lib/trail-geography";
import { GlobeTrail } from "./globe-trail";
import { RouteBookings, type RouteBookingsProps } from "./route-bookings";
import { RouteMap, type MapPoint } from "./route-map";
import { TrailLoader } from "./trail-loader";

const icons = {"Cafés":Coffee,"Turismo":Compass,"Trabalho":Laptop,"Comida":Utensils};
const emptyPlaces:NearbyPlace[] = [];
const radii=[.5,1,2,5,10];
type NearbyData = {key:string;features:Feature[] | null};

function NearbyList({category,places,loading,failed,radius,active,onPlace,onRadius,onRetry}: {
  category:NearbyCategory;places:NearbyPlace[];loading:boolean;failed:boolean;radius:number;active?:NearbyPlace;
  onPlace:(place:NearbyPlace)=>void;onRadius:(radius:number)=>void;onRetry:()=>void;
}) {
  const message=loading ? "Buscando "+category.toLowerCase()+" nos arredores…" : failed ? "A busca está indisponível agora."
    : places.length ? places.length+(places.length===1 ? " lugar" : " lugares")+" · distância em linha reta"
    : "Nenhum local de "+category.toLowerCase()+" mapeado neste raio.";
  const wider=radii[radii.indexOf(radius)+1];
  return <div className="trail-results" aria-label="Locais próximos">
    <p className="trail-results-status" role="status">{message}</p>
    {active && <div className="trail-place-detail">
      <MapPin size={17}/><div><strong>{active.name}</strong><small>{active.kind}</small></div>
      <a className="icon-button" aria-label={"Abrir "+active.name+" no OpenStreetMap"} href={osmLink(active.position.lat,active.position.lon)} target="_blank" rel="noreferrer"><ArrowUpRight size={15}/></a>
    </div>}
    {places.length>0 && <ol key={category} className="trail-place-list" aria-label={category+" por perto"}>
      {places.map((place,index)=><li key={place.id}><button type="button" aria-pressed={place.id===active?.id} onClick={()=>onPlace(place)}>
        <span className="trail-place-number">{index+1}</span><span><strong>{place.name}</strong><small>{place.kind}</small></span>
        <small>{place.km<1 ? Math.round(place.km*1000)+" m" : place.km.toLocaleString("pt-BR",{maximumFractionDigits:1})+" km"}</small>
      </button></li>)}
    </ol>}
    {failed && <button type="button" className="text-link trail-results-action" onClick={onRetry}><RotateCcw size={14}/> Tentar novamente</button>}
    {!loading && !failed && places.length===0 && wider && <button type="button" className="text-link trail-results-action" onClick={()=>onRadius(wider)}>Ampliar raio para {wider} km <ArrowUpRight size={14}/></button>}
  </div>;
}

function osmLink(lat:number,lon:number) {
  return "https://www.openstreetmap.org/?mlat="+lat+"&mlon="+lon+"#map=16/"+lat+"/"+lon;
}

export function TrailExplorer({points,selected,onSelect,pending,tracking=false,children,stop,stopOptions,extras,onCafes,nearbyAction,bookings,mapId}: {
  points:MapPoint[];selected:string;onSelect:(id:string)=>void;pending?:boolean[];
  tracking?:boolean;children:React.ReactNode;stop?:Stop;stopOptions?:React.ReactNode;extras?:React.ReactNode;
  onCafes?:()=>void;nearbyAction?:React.ReactNode;
  bookings?:RouteBookingsProps;mapId?:string;
}) {
  const [playback,setPlayback] = useState(0);
  const [cameraRequest,setCameraRequest] = useState(0);
  const [view,setView] = useState<"route"|"nearby"|"lodging">("route");
  const [mapStatus,setMapStatus] = useState<"loading"|"ready"|"unavailable">("loading");
  const [radius,setRadius] = useState(2);
  const [category,setCategory] = useState<NearbyCategory>("Cafés");
  const [results,setResults] = useState<NearbyData>();
  const [retry,setRetry] = useState(0);
  const [chosen,setChosen] = useState<string>();
  const cache=useRef(new Map<string,Feature[]>());
  const explorer = useRef<HTMLElement>(null);
  const panel = useRef<HTMLElement>(null);
  const rail = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const filters = useRef<HTMLDivElement>(null);
  const nearbyId=useId();
  const detailsId=useId();
  const pick = Math.max(0,points.findIndex((point)=>point.id===selected));
  const city = points[pick].city;
  const first = points[0].city, last = points[points.length-1].city;
  const location = stop?.stay.position ?? address(city);
  const lodging = !!stop?.stay.position;
  const demoLodging = lodging && stop?.stay.id!=="manual";
  const label = lodging ? stop.stay.name : "Centro de "+city.name;
  const lat=location?.lat, lon=location?.lon;
  const areaRadius=view==="lodging" ? 2 : radius;
  const area = useMemo(()=>view!=="route" && lat!==undefined && lon!==undefined
    ? {point:{lat,lon},radius:areaRadius,label,lodging} : undefined,[view,lat,lon,areaRadius,label,lodging]);
  const showNearby=view==="nearby" && !!area;
  const search = showNearby ? [lat,lon,areaRadius,retry].join("|") : "";
  const nearby = results?.key===search ? results.features : undefined;
  const places = useMemo(()=>area && nearby ? findNearbyPlaces(nearby,area,category) : emptyPlaces,[area,nearby,category]);
  const active = places.find((place)=>place.id===chosen);
  const choosePlace = (place:NearbyPlace)=>setChosen(place.id);
  function changeRadius(value:number) {setRadius(value);setChosen(undefined);}
  const focusStop = (id:string)=>{
    onSelect(id);
    setView("nearby");
    setChosen(undefined);
  };
  function openNearby() {
    setView("nearby");
    setChosen(undefined);
    requestAnimationFrame(()=>{
      if (filters.current && filters.current.getBoundingClientRect().bottom+48>window.innerHeight) {
        filters.current.scrollIntoView({block:"center",behavior:"instant"});
      }
    });
  }
  function focusLodging(id:string) {
    onSelect(id);
    setView("lodging");
    setChosen(undefined);
    setCameraRequest((value)=>value+1);
    requestAnimationFrame(()=>{
      if (panel.current) panel.current.scrollTop=0;
      explorer.current?.focus({preventScroll:true});
      stage.current?.scrollIntoView({block:"start",behavior:"instant"});
    });
  }
  function showRoute() {
    setView("route");
    setCameraRequest((value)=>value+1);
  }
  useEffect(()=>{
    if (!area || !search) return;
    const cached=cache.current.get(search);
    const controller=new AbortController();
    const timeout=window.setTimeout(()=>controller.abort(),12000);
    let cancelled=false;
    async function load() {
      if (!area) return;
      try {
        const features=cached ?? await (await import("@/lib/nearby-tiles")).loadNearbyFeatures(area,controller.signal);
        if (cancelled) return;
        if (cache.current.size>=8 && !cached) cache.current.delete(cache.current.keys().next().value!);
        cache.current.set(search,features);
        setResults({key:search,features});
      } catch {
        if (!cancelled) setResults({key:search,features:null});
      } finally {window.clearTimeout(timeout);}
    }
    void load();
    return ()=>{cancelled=true;controller.abort();window.clearTimeout(timeout);};
  },[area,search]);
  useEffect(()=>{
    if (panel.current) panel.current.scrollTop=0;
    const frame = requestAnimationFrame(()=>{
      const selectedButton = rail.current?.querySelector('[aria-pressed="true"]');
      if (!rail.current || !selectedButton) return;
      const viewport = rail.current.getBoundingClientRect();
      const button = selectedButton.getBoundingClientRect();
      if (button.left<viewport.left) rail.current.scrollLeft+=button.left-viewport.left-6;
      if (button.right>viewport.right) rail.current.scrollLeft+=button.right-viewport.right+6;
    });
    return ()=>cancelAnimationFrame(frame);
  },[selected]);
  const lodgingView=view==="lodging" && !!area;
  const map=<section id={mapId} ref={explorer} tabIndex={-1} className={"panel trail-explorer"+(stop ? " trail-itinerary" : "")} data-view={area ? view : "route"} aria-label="Mapa da viagem">
      <div className="trail-stage" ref={stage}>
        {mapStatus==="unavailable"
          ? <RouteMap key={area ? "stop-"+selected+"-"+cameraRequest : "route"} initialZoom={area ? 6 : undefined}
              points={points} selected={selected} onSelect={focusStop} pending={pending} immersive playback={playback}/>
          : <GlobeTrail points={points} selected={selected} pending={pending} playback={playback} cameraRequest={cameraRequest}
              area={area} places={places} activePlace={active}
              onSelect={focusStop} onPlace={choosePlace} onStatus={setMapStatus}/>}
        {mapStatus==="loading" && <TrailLoader/>}
        {mapStatus!=="loading" && <div className="trail-route-label">
          <small>{mapStatus==="unavailable" ? "Rota ilustrada" : lodgingView
            ? lodging ? "Hospedagem"+(demoLodging ? " · posição de demonstração" : "") : "Centro da cidade"
            : showNearby ? "Arredores · "+radius+" km" : "Globo 3D"}</small>
          <strong>{lodgingView ? (mapStatus==="ready" ? label : city.name+", "+city.country)
            : showNearby && mapStatus==="ready" ? city.name+", "+city.country
            : first.id===last.id ? "Circuito · "+first.name : <>{first.name} <span aria-hidden="true">→</span> {last.name}</>}</strong>
        </div>}
        {mapStatus!=="loading" && <div className="trail-map-toolbar">
          <div className="trail-view" role="group" aria-label="Visualização do mapa">
            <button type="button" aria-pressed={view==="route"} onClick={showRoute}><MapIcon size={15}/> Rota</button>
            <button type="button" data-tutorial-target="nearby" disabled={!location} aria-pressed={showNearby} aria-controls={showNearby ? nearbyId : undefined} onClick={openNearby}><LocateFixed size={15}/> Arredores</button>
            {view==="route" && <button type="button" className="trail-replay-map" onClick={()=>{showRoute();setPlayback((value)=>value+1);}}><RotateCcw size={14}/> Rever trilha</button>}
          </div>
        </div>}
        {mapStatus==="unavailable" && <div className="trail-network-note" role="status">
          <span>O mapa detalhado está indisponível.</span><button type="button" onClick={()=>setMapStatus("loading")}><RotateCcw size={13}/> Tentar de novo</button>
        </div>}
      </div>
      <div className="trail-navigation">
        <div className="trail-navigation-meta">
          <p className="trail-counter" aria-live="polite"><Flag size={14} aria-hidden="true"/> Parada {pick+1} de {points.length}</p>
          {tracking && <div className="trail-legend" aria-label="Legenda da trilha">
            <span><i className="visited"/> Concluída</span><span><i className="current"/> Parada atual</span><span><i className="upcoming"/> A visitar</span>
          </div>}
        </div>
        <nav ref={rail} className="trail-stops" aria-label="Paradas da trilha">
          {points.map((point,index)=>{
            const status = point.status ?? "upcoming";
            return <button type="button" key={point.id} className={"trail-stop "+status} aria-pressed={point.id===selected} aria-controls={detailsId}
              aria-label={"Parada "+(index+1)+": "+point.city.name+", "+point.city.country+(tracking ? " · "+stopStatusLabels[status] : "")} onClick={()=>focusStop(point.id)}>
              <span className="trail-stop-number">{status==="visited" ? <Check size={14}/> : index+1}</span>
              <span className="trail-stop-label"><strong>{point.city.name}</strong><small>{point.city.country}</small></span>
            </button>;
          })}
        </nav>
      </div>
      <aside id={detailsId} ref={panel} className="trail-details" aria-label="Detalhes da parada" tabIndex={0}>
        {children}
        {showNearby && <section id={nearbyId} className="trail-nearby" data-tutorial-target={nearbyAction ? "cafes-results" : undefined} aria-label="Buscar nos arredores">
          <div ref={filters}>
            <div className="trail-nearby-head"><div><h3>Arredores</h3><p><MapPin size={13}/> {label}{demoLodging && <small> · posição de demonstração</small>}</p></div>
              <label className="trail-radius"><span>Raio</span><select aria-label="Raio da busca no mapa" value={radius} onChange={(event)=>changeRadius(+event.target.value)}>{radii.map((value)=><option value={value} key={value}>{value<1 ? "500 m" : value+" km"}</option>)}</select></label>
            </div>
            <div className="trail-map-filters" role="group" aria-label="Categorias de lugares">{nearbyCategories.map((item)=>{
              const Icon=icons[item];
              return <button type="button" key={item} aria-pressed={category===item} data-tutorial-target={item==="Cafés" ? "cafes" : undefined} onClick={()=>{
                setCategory(item);setChosen(undefined);
                if (item==="Cafés") onCafes?.();
              }}><Icon size={15}/> {item}</button>;
            })}</div>
          </div>
          {nearbyAction && <div className="tutorial-map-action">{nearbyAction}</div>}
          <NearbyList category={category} places={places} loading={nearby===undefined} failed={nearby===null} radius={radius} active={active} onPlace={choosePlace} onRadius={changeRadius} onRetry={()=>setRetry((value)=>value+1)}/>
          <a className="trail-nearby-source" href={osmLink(area.point.lat,area.point.lon)} target="_blank" rel="noreferrer">OpenStreetMap <ArrowUpRight size={12}/></a>
        </section>}
        {stopOptions}
        {mapStatus==="ready" && view==="route" && <p className="quiet trail-route-note">Os trechos ligam as paradas da viagem e representam o trajeto planejado.</p>}
        {view!=="route" && !location && <p className="trail-open-nearby quiet">Esta parada ainda está sem coordenadas.</p>}
        {mapStatus==="unavailable" && location && !showNearby && <a className="text-link trail-open-nearby" href={osmLink(location.lat,location.lon)} target="_blank" rel="noreferrer">Ver a região no OpenStreetMap <ArrowUpRight size={15}/></a>}
        {extras && <details className="trail-extras"><summary>Freelas e trocas de demonstração</summary>{extras}</details>}
      </aside>
  </section>;
  return bookings ? <RouteBookings {...bookings} onStay={focusLodging}>{map}</RouteBookings> : map;
}
