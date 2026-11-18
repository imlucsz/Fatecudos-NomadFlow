"use client";

import { Check, LocateFixed, MapPin, Maximize, Minus, Plus } from "lucide-react";
import { geoEquirectangular, geoGraticule10, geoPath } from "d3-geo";
import { feature, mesh } from "topojson-client";
import world from "world-atlas/countries-110m.json";
import type { GeometryCollection, Topology } from "topojson-specification";
import { useEffect, useId, useMemo, useRef, useState, type PointerEvent } from "react";
import { address, type Trip } from "@/lib/planning";
import { countryForCity, countryFromFeature } from "@/lib/world-catalog";
import { Modal } from "./ui";

const worldWidth=1200, worldHeight=600;
const topology=world as unknown as Topology<{countries:GeometryCollection<{name:string}>}>;
const projection=geoEquirectangular().scale(worldWidth/(2*Math.PI))
  .translate([worldWidth/2,worldHeight/2]).clipExtent([[0,0],[worldWidth,worldHeight]]);
const path=geoPath(projection);
const grid=path(geoGraticule10()) ?? "";
const borders=path(mesh(topology,topology.objects.countries)) ?? "";
const countries=feature(topology,topology.objects.countries).features.map((country,index)=>({
  key:String(country.id ?? country.properties.name)+"-"+index,
  code:countryFromFeature(country.id,country.properties.name)?.code,
  shape:path(country) ?? "",
}));

function visitedMap(trips:Trip[]) {
  const cities=[...new Map(trips.flatMap((trip)=>trip.stops.filter((stop)=>stop.done).map(({city})=>[city.name+"|"+city.country,city] as const))).values()];
  const visitedCountries=[...new Set(cities.map((city)=>city.country))];
  const codes=new Set(cities.map((city)=>countryForCity(city)?.code));
  const pins=cities.flatMap((city)=>{
    const point=address(city);
    const pixel=point && projection([point.lon,point.lat]);
    return pixel ? [{key:city.name+"|"+city.country,city,x:pixel[0],y:pixel[1]}] : [];
  });
  const legs=trips.flatMap((trip)=>trip.stops.slice(1).flatMap((stop,index)=>{
    const from=trip.stops[index];
    if (!stop.done || !from.done) return [];
    const a=address(from.city), b=address(stop.city);
    if (!a || !b) return [];
    const shape=path({type:"LineString",coordinates:[[a.lon,a.lat],[b.lon,b.lat]]});
    return shape ? [{key:trip.tripId+"-"+stop.id,shape}] : [];
  }));
  return {cities,visitedCountries,codes,pins,legs};
}

const overview={zoom:1,x:worldWidth/2,y:worldHeight/2};
type Camera=typeof overview;
type Point=ReturnType<typeof visitedMap>["pins"][number];
const closestCopy=(x:number,center:number)=>x+Math.round((center-x)/worldWidth)*worldWidth;
const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]} as const;

function visibleLatitude(y:number,viewHeight:number) {
  const half=Math.min(worldHeight,viewHeight)/2;
  return Math.min(worldHeight-half,Math.max(half,y));
}

function PassportArt({data,camera,setCamera,label,onCity,onReset,immersive=false}: {
  data:ReturnType<typeof visitedMap>;camera:Camera;setCamera:(value:Camera)=>void;label?:string;
  onCity:(point:Point)=>void;onReset:()=>void;immersive?:boolean;
}) {
  const map=useRef<SVGSVGElement>(null);
  const worldId=useId();
  const drag=useRef<{pointer:number;clientX:number;clientY:number;factor:number;x:number;y:number}|null>(null);
  const [dragging,setDragging]=useState(false);
  const [viewport,setViewport]=useState({width:worldWidth,height:worldHeight});
  useEffect(()=>{
    const node=map.current;
    if (!node) return;
    const observer=new ResizeObserver(([entry])=>{
      const {width,height}=entry.contentRect;
      if (width>0 && height>0) setViewport({width,height});
    });
    observer.observe(node);
    return ()=>observer.disconnect();
  },[]);

  const {width,height}=viewport;
  const {zoom,x}=camera;
  const scale=Math.max(width/worldWidth,height/worldHeight)*zoom;
  const viewWidth=width/scale, viewHeight=height/scale;
  const y=visibleLatitude(camera.y,viewHeight);
  const transform="matrix("+[scale,0,0,scale,width/2-x*scale,height/2-y*scale].join(",")+")";
  const column=Math.floor(x/worldWidth);
  const worldLayer=useMemo(()=><g id={worldId}>
    <path d={grid} className="profile-map-grid"/>
    {countries.map(({key,code,shape})=><path key={key} d={shape} className={"profile-map-land"+(code && data.codes.has(code) ? " is-visited" : "")}/>)}
    <path d={borders} className="profile-map-borders"/>
    {data.legs.map(({key,shape})=><path key={key} d={shape} className="profile-map-trail"/>)}
  </g>,[worldId,data.codes,data.legs]);

  function start(event:PointerEvent<SVGSVGElement>) {
    if (event.button!==0 || !event.isPrimary || (event.target as Element).closest(".profile-map-pin")) return;
    const screenScale=event.currentTarget.getScreenCTM()?.a;
    if (!screenScale) return;
    drag.current={pointer:event.pointerId,clientX:event.clientX,clientY:event.clientY,factor:1/(screenScale*scale),x,y};
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }
  function move(event:PointerEvent<SVGSVGElement>) {
    const origin=drag.current;
    if (origin?.pointer!==event.pointerId) return;
    setCamera({zoom,
      x:origin.x-(event.clientX-origin.clientX)*origin.factor,
      y:visibleLatitude(origin.y-(event.clientY-origin.clientY)*origin.factor,viewHeight),
    });
  }
  function end(event:PointerEvent<SVGSVGElement>) {
    if (drag.current?.pointer!==event.pointerId) return;
    drag.current=null;
    setDragging(false);
  }
  function changeZoom(factor:number) {
    setCamera({zoom:Math.max(1,Math.min(5,zoom*factor)),x,y});
  }
  return <div className="profile-map-art" data-immersive={immersive} data-dragging={dragging}>
    <svg ref={map} viewBox={"0 0 "+width+" "+height} role="group" aria-label="Mapa de países visitados" tabIndex={0}
      aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown" onKeyDown={(event)=>{
        const direction=directions[event.key as keyof typeof directions];
        if (event.target!==event.currentTarget || !direction) return;
        event.preventDefault();
        setCamera({zoom,x:x+direction[0]*viewWidth/6,y:visibleLatitude(y+direction[1]*viewHeight/6,viewHeight)});
      }}
      onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>
      <defs>{worldLayer}</defs>
      <g className="profile-map-camera" style={{transform}}>
        {/* Three neighboring copies cover the viewport while the camera crosses either seam. */}
        {[column-1,column,column+1].map((copy)=><use key={copy} href={"#"+worldId} x={copy*worldWidth} aria-hidden="true"/>)}
        {data.pins.map((point)=>{
          const px=closestCopy(point.x,x);
          const visible=Math.abs(px-x)<=viewWidth/2 && Math.abs(point.y-y)<=viewHeight/2;
          return <g key={point.key} className="profile-map-pin" role="button" tabIndex={visible ? 0 : -1}
            aria-hidden={!visible} aria-label={point.city.name+", "+point.city.country}
            onClick={()=>onCity(point)} onKeyDown={(event)=>{if (event.key==="Enter" || event.key===" ") {event.preventDefault();onCity(point);}}}>
            <title>{point.city.name}, {point.city.country}</title>
            <circle className="profile-map-pin-halo" cx={px} cy={point.y} r={10/scale}/>
            <circle className="profile-map-pin-dot" cx={px} cy={point.y} r={5/scale}/>
          </g>;
        })}
      </g>
    </svg>
    <div className="profile-map-tools" aria-label="Controles do mapa">
      <button type="button" className="icon-button" title="Aproximar mapa" aria-label="Aproximar mapa" disabled={zoom>=5} onClick={()=>changeZoom(1.5)}><Plus size={17}/></button>
      <button type="button" className="icon-button" title="Afastar mapa" aria-label="Afastar mapa" disabled={zoom<=1} onClick={()=>changeZoom(1/1.5)}><Minus size={17}/></button>
      <button type="button" className="icon-button" title="Voltar à visão mundial" aria-label="Voltar à visão mundial" onClick={onReset}><LocateFixed size={17}/></button>
    </div>
    {label && <div className="profile-map-selection" role="status"><MapPin size={15}/>{label}</div>}
    {data.cities.length>0 && <div className="passport-stamp"><Check size={21} aria-hidden="true"/><span>Passei<br/>por aqui</span></div>}
  </div>;
}

export function ProfileMap({trips}: {trips:Trip[]}) {
  const data=useMemo(()=>visitedMap(trips),[trips]);
  const [camera,setCamera]=useState(overview);
  const [active,setActive]=useState<{label:string;country:string}>();
  const [fullscreen,setFullscreen]=useState(false);
  function reset() {
    setCamera((current)=>({...overview,x:closestCopy(overview.x,current.x)}));
    setActive(undefined);
  }
  function focus(x:number,y:number,label:string,country:string) {
    setActive({label,country});
    setCamera((current)=>({zoom:2.8,x:closestCopy(x,current.x),y}));
  }
  function selectCountry(country:string) {
    const points=data.pins.filter((point)=>point.city.country===country);
    if (!points.length) return;
    const x=points.reduce((sum,point)=>sum+closestCopy(point.x,points[0].x),0)/points.length;
    const y=points.reduce((sum,point)=>sum+point.y,0)/points.length;
    focus(x,y,country,country);
  }
  const props={data,camera,setCamera,label:active?.label,onReset:reset,
    onCity:(point:Point)=>focus(point.x,point.y,point.city.name+", "+point.city.country,point.city.country)};
  const chips=data.visitedCountries.length>0 && <ul className="passport-countries" aria-label="Países visitados">
    {data.visitedCountries.map((country)=><li key={country}><button type="button" aria-pressed={active?.country===country}
      onClick={()=>selectCountry(country)} disabled={!data.pins.some((point)=>point.city.country===country)}>{country}</button></li>)}
  </ul>;

  return <section className="profile-passport" aria-labelledby="profile-map-title">
    <div className="profile-passport-top">
      <div><h2 id="profile-map-title">Meu mapa de viagens</h2><p>{data.cities.length
        ? data.visitedCountries.length+" "+(data.visitedCountries.length===1 ? "país visitado" : "países visitados")+" · "+data.cities.length+" "+(data.cities.length===1 ? "cidade" : "cidades")
        : "Aguardando sua primeira parada concluída"}</p></div>
      <button type="button" className="button button-outline button-small" onClick={()=>setFullscreen(true)}><Maximize size={15}/> Tela cheia</button>
    </div>
    <PassportArt {...props}/>
    {chips}
    {fullscreen && <Modal title="Meu mapa de viagens" className="profile-map-dialog" onClose={()=>setFullscreen(false)}>
      <PassportArt {...props} immersive/>
      {chips}
    </Modal>}
  </section>;
}
