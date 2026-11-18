"use client";

import { geoGraticule10, geoMercator, geoPath } from "d3-geo";
import { feature, mesh } from "topojson-client";
import world from "world-atlas/countries-110m.json";
import type { GeometryCollection, Topology } from "topojson-specification";
import { LocateFixed, Minus, Plus } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type PointerEvent } from "react";
import type { City } from "@/lib/destinations";
import { stopStatusLabels, type StopStatus } from "@/lib/journey";
import { address } from "@/lib/planning";

const topology = world as unknown as Topology<{countries:GeometryCollection}>;
const countries = feature(topology,topology.objects.countries);
const borders = mesh(topology,topology.objects.countries,(a,b)=>a!==b);
const graticule = geoGraticule10();

export type MapPoint = {city:City;id:string;status?:StopStatus};
type Coordinate = [number,number];
type Size = {width:number;height:number};
const routeView = {zoom:1,x:0,y:0};

function projectRoute(points: MapPoint[], {width,height}: Size, immersive: boolean) {
  const located = points.flatMap((item,index)=>{
    const point = address(item.city);
    return point ? [{item,index,position:[point.lon,Math.max(-85,Math.min(85,point.lat))] as Coordinate}] : [];
  });
  const longitudes = located.map((item)=>item.position[0]);
  const projection = geoMercator();
  if (Math.max(...longitudes)-Math.min(...longitudes)>180) projection.rotate([180,0]);
  if (located.length) {
    const coords = located.map((item)=>item.position);
    if (new Set(coords.map((pair)=>pair.join(","))).size===1) {
      const [lon,lat] = coords[0];
      coords.push([lon-12,Math.max(-85,lat-9)],[lon+12,Math.min(85,lat+9)]);
    }
    const insetX = Math.min(74,width/5), insetY = Math.min(66,height/5);
    const top = immersive ? Math.min(77,height/3) : insetY;
    projection.fitExtent([[insetX,top],[width-insetX,height-insetY]],{type:"MultiPoint",coordinates:coords});
  } else projection.scale(83).translate([width/2,height/2]);
  const path = geoPath(projection);
  return {
    land:path(countries) ?? "", borders:path(borders) ?? "", grid:path(graticule) ?? "",
    dots:located.map(({item,index,position})=>({item,index,xy:projection(position)!})),
  };
}

const pinOffsets: Coordinate[] = [[0,0],...[32,57,83,111].flatMap((radius)=>Array.from({length:12},(_,step): Coordinate => {
  const angle = Math.PI*2*step/12;
  return [Math.cos(angle)*radius,Math.sin(angle)*radius];
}))];

function arrangePins(dots: ReturnType<typeof projectRoute>["dots"], shift: Coordinate, zoom: number, size: Size, separate: boolean) {
  const placed: Coordinate[] = [];
  return dots.map((dot)=>{
    const origin: Coordinate = [dot.xy[0]*zoom+shift[0],dot.xy[1]*zoom+shift[1]];
    const visible = origin[0]>=-8 && origin[0]<=size.width+8 && origin[1]>=-8 && origin[1]<=size.height+8;
    const pin = !separate || !visible ? origin : pinOffsets
      .map(([x,y]): Coordinate => [origin[0]+x,origin[1]+y])
      .find(([x,y])=>x>=15 && x<=size.width-15 && y>=16 && y<=size.height-21 && placed.every(([a,b])=>Math.hypot(x-a,y-b)>=29)) ?? origin;
    if (visible) placed.push(pin);
    return {...dot,origin,pin,visible};
  });
}

function segment(from: Coordinate, to: Coordinate) {
  const [x,y] = from, [u,v] = to;
  const length = Math.hypot(u-x,v-y);
  const midX = (x+u)/2, midY = (y+v)/2-Math.min(28,length*.12);
  const t = .57, s = 1-t;
  const arrowX = x*s*s+2*midX*t*s+u*t*t;
  const arrowY = y*s*s+2*midY*t*s+v*t*t;
  const angle = Math.atan2((midY-y)*s+(v-midY)*t,(midX-x)*s+(u-midX)*t)*180/Math.PI;
  return {
    shape:"M"+x+","+y+" Q"+midX+","+midY+" "+u+","+v,
    arrow:length >= 24 ? "translate("+arrowX+" "+arrowY+") rotate("+angle+")" : undefined,
  };
}

export function RouteMap({points,selected,onSelect,pending=[],compact=false,immersive=false,playback=0,initialZoom=1}: {
  points:MapPoint[];selected?:string;onSelect?:(id:string)=>void;pending?:boolean[];
  compact?:boolean;immersive?:boolean;playback?:number;initialZoom?:number;
}) {
  const [camera,setCamera] = useState(()=>({...routeView,zoom:initialZoom}));
  const [panning,setPanning] = useState(false);
  const [size,setSize] = useState({width:660,height:390});
  const container = useRef<HTMLDivElement>(null);
  const drag = useRef<{pointer:number;startX:number;startY:number;x:number;y:number}|null>(null);
  const clip = useId();
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      const {width,height} = entry.contentRect;
      if (width > 0 && height > 0) setSize({width,height});
    });
    observer.observe(node);
    return () => observer.disconnect();
  },[]);
  const {width,height} = size;
  const {zoom} = camera;
  const geometry = useMemo(()=>projectRoute(points,size,immersive),[points,size,immersive]);
  const anchor = zoom>1 ? geometry.dots.find((dot)=>dot.item.id===selected)?.xy : undefined;
  const [cx,cy] = anchor ?? [width/2,height/2];
  const shift: Coordinate = [width/2-cx*zoom+camera.x,height/2-cy*zoom+camera.y];
  const dots = arrangePins(geometry.dots,shift,zoom,size,!compact);
  const legs = dots.slice(1).flatMap((destination,i)=>{
    const origin = dots[i];
    if (origin.index!==destination.index-1) return [];
    const visited = destination.item.status==="visited" || (destination.item.status==="current" && origin.item.status==="visited");
    return [{
      ...segment(origin.pin,destination.pin),index:i,visited,
      pending:!visited && !!pending[destination.index-1], key:destination.item.id,
    }];
  });
  const delay = Math.min(112,1330/Math.max(1,legs.length-1));

  function startPan(event: PointerEvent<SVGSVGElement>) {
    if (compact || event.button!==0 || (event.pointerType==="touch" && !immersive) || (event.target as Element).closest(".map-pin")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {pointer:event.pointerId,startX:event.clientX,startY:event.clientY,x:camera.x,y:camera.y};
    setPanning(true);
  }
  function pan(event: PointerEvent<SVGSVGElement>) {
    const start = drag.current;
    if (!start || start.pointer!==event.pointerId) return;
    const x = start.x+event.clientX-start.startX;
    const y = start.y+event.clientY-start.startY;
    setCamera({...camera,x,y});
  }
  function endPan(event: PointerEvent<SVGSVGElement>) {
    if (drag.current?.pointer!==event.pointerId) return;
    drag.current = null;
    setPanning(false);
  }
  function pick(id: string) {
    if (zoom>1 && id!==selected) setCamera({...camera,x:0,y:0});
    onSelect?.(id);
  }
  function changeZoom(factor: number) {
    setCamera((view)=>{
      const next = Math.min(12,Math.max(.72,view.zoom*factor));
      return next===view.zoom ? view : {zoom:next,x:0,y:0};
    });
  }
  return <div ref={container} className={"route-map"+(compact ? " route-map-compact" : "")+(immersive ? " route-map-immersive" : "")}>
    <svg className={"map-viewport"+(panning ? " is-panning" : "")} width="100%" height="100%" viewBox={"0 0 "+width+" "+height}
      aria-label="Mapa ilustrativo do itinerário" role={onSelect ? "group" : "img"}
      onPointerDown={startPan} onPointerMove={pan} onPointerUp={endPan} onPointerCancel={endPan} onLostPointerCapture={endPan}>
      <defs><clipPath id={clip}><rect width={width} height={height}/></clipPath></defs>
      <g clipPath={"url(#"+clip+")"}>
        <g transform={"translate("+shift.join(" ")+") scale("+zoom+")"}>
          <path d={geometry.grid} className="map-grid"/>
          <path d={geometry.land} className="map-land"/>
          <path d={geometry.borders} className="map-borders"/>
        </g>
        <g key={playback} aria-hidden="true" className="map-trail-lines">
          {legs.map((leg,i)=>{
            const id = clip+"-trail-"+leg.index;
            return <g key={leg.key} className={(leg.visited ? "map-segment visited" : "map-segment")+(leg.pending ? " is-pending" : "")}>
              {immersive && <mask id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={width} height={height}>
                <path d={leg.shape} pathLength={1} className="map-reveal" fill="none" stroke="white" strokeWidth={24} style={{animationDelay:i*delay+"ms"}}/>
              </mask>}
              <g mask={immersive ? "url(#"+id+")" : undefined}>
                <path d={leg.shape} className="map-leg"/>
                {leg.arrow && !compact && <path d="M-5,-4 L0,0 L-5,4" transform={leg.arrow} className="map-direction"/>}
              </g>
            </g>;
          })}
        </g>
        {dots.map(({item,index,origin,pin,visible})=>{
          const current = item.id===selected;
          const status = item.status ?? "upcoming";
          const title = (index+1)+". "+item.city.name+", "+item.city.country+" · "+stopStatusLabels[status];
          return <g key={item.id}>
            {(origin[0]!==pin[0] || origin[1]!==pin[1]) && visible && <path className="map-pin-leader" d={"M"+origin.join(",")+" L"+pin.join(",")} aria-hidden="true"/>}
            <g className={"map-pin "+status+(current ? " selected" : "")} transform={"translate("+pin.join(" ")+")"}
              onClick={onSelect ? ()=>pick(item.id) : undefined} role={onSelect ? "button" : undefined}
              aria-pressed={onSelect ? current : undefined} tabIndex={onSelect && visible ? 0 : undefined} aria-hidden={onSelect && !visible ? true : undefined} aria-label={title}
              onKeyDown={onSelect ? (event)=>{if (event.key==="Enter" || event.key===" ") {event.preventDefault();pick(item.id);}} : undefined}>
              <title>{title}</title>
              {current && <circle className="map-pin-ring" r={16}/>}
              <circle className="map-pin-core" r={compact ? 9 : 11.5}/>
              <text textAnchor="middle" dy=".35em">{index+1}</text>
              {current && <text className="map-pin-label" x={pin[0]>width-135 ? -19 : 19} textAnchor={pin[0]>width-135 ? "end" : "start"} dy=".35em">{item.city.name}</text>}
            </g>
          </g>;
        })}
      </g>
    </svg>
    {!compact && <div className="map-controls" aria-label="Controles do mapa">
      <button type="button" aria-label="Aproximar mapa" title="Aproximar mapa" disabled={zoom>=12} onClick={()=>changeZoom(1.45)}><Plus size={17}/></button>
      <button type="button" aria-label="Afastar mapa" title="Afastar mapa" disabled={zoom<=.72} onClick={()=>changeZoom(1/1.45)}><Minus size={17}/></button>
      <button type="button" aria-label="Enquadrar rota inteira" title="Enquadrar rota inteira" onClick={()=>setCamera(routeView)}><LocateFixed size={17}/></button>
    </div>}
    {!dots.length && <p className="map-message">Nenhuma parada com coordenadas</p>}
    <div className="map-attribution">Linhas ilustrativas · Natural Earth{dots.length<points.length ? " · "+(points.length-dots.length)+" sem coordenadas" : ""}</div>
  </div>;
}
