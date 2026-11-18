"use client";

import { geoGraticule10, geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import world from "world-atlas/countries-110m.json";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { Country } from "@/lib/world-catalog";
import { citiesOfCountry, countryForCity, countryFromFeature } from "@/lib/world-catalog";
import { address } from "@/lib/planning";
import type { City } from "@/lib/destinations";

const width=920, height=498;
const topology=world as unknown as Topology<{countries:GeometryCollection<{name:string}>}>;
const sphere={type:"Sphere"} as const;
const projection=geoNaturalEarth1().fitExtent([[12,8],[width-12,height-8]],sphere);
const path=geoPath(projection);
const planet=path(sphere) ?? "";
const grid=path(geoGraticule10()) ?? "";
const outline=feature(topology,topology.objects.countries).features.map((region,index)=>({
  key:String(region.id ?? index)+"-"+index,
  country:countryFromFeature(region.id,region.properties.name),
  geometry:region,
  shape:path(region) ?? "",
}));

const continentLabels:[string,number,number][]=[
  ["América do Norte",-112,51],["América do Sul",-63,-17],["Europa",19,56],["África",19,2],
  ["Ásia",92,41],["Oceania",143,-30],
];

function project(place:City) {
  const position=address(place);
  return position && projection([position.lon,position.lat]);
}

function camera(country?:Country,city?:City) {
  const location=city && project(city);
  if (location) return {x:width/2-location[0]*8,y:height/2-location[1]*8,scale:8};
  if (!country) return {x:0,y:0,scale:1};
  const shapes=outline.filter((region)=>region.country?.code===country.code).flatMap(({geometry:region})=>{
    const geometry=region.geometry;
    return geometry.type==="MultiPolygon" ? geometry.coordinates.map((coordinates)=>({type:"Polygon" as const,coordinates}))
      : geometry.type==="Polygon" ? [geometry] : [];
  });
  if (shapes.length) {
    const largest=shapes.reduce((best,current)=>path.area(current)>path.area(best) ? current : best);
    const [[x1,y1],[x2,y2]]=path.bounds(largest);
    const scale=Math.min(6,Math.max(1.25,Math.min(width*.72/Math.max(1,x2-x1),height*.7/Math.max(1,y2-y1))));
    return {x:width/2-(x1+x2)/2*scale,y:height/2-(y1+y2)/2*scale,scale};
  }
  const first=citiesOfCountry(country.code)[0];
  const center=first && project(first);
  return center ? {x:width/2-center[0]*5,y:height/2-center[1]*5,scale:5} : {x:0,y:0,scale:1};
}

export function WorldPlannerMap({points,country,city,editable,onCountry,onCity}:{
  points:City[];country?:Country;city?:City;editable:boolean;onCountry?:(country:Country)=>void;onCity?:(city:City)=>void;
}) {
  const view=camera(country,city);
  const selected=new Set(points.map((place)=>countryForCity(place)?.code));
  const local=country && editable ? citiesOfCountry(country.code).slice(0,12) : [];
  const route=points.slice(1).map((end,index)=>{
    const a=address(points[index]), b=address(end);
    return a && b ? path({type:"LineString",coordinates:[[a.lon,a.lat],[b.lon,b.lat]]}) ?? "" : "";
  }).join("");
  const transformed=(point:[number,number])=>[point[0]*view.scale+view.x,point[1]*view.scale+view.y];
  const labelPoint=city && project(city);
  const cityLabels:[number,number][]=[];
  return <svg viewBox={"0 0 "+width+" "+height} className="planner-earth" role="group" aria-label="Mapa-múndi do planejamento">
    <g className="earth-camera" style={{transform:"translate("+view.x+"px,"+view.y+"px) scale("+view.scale+")"}}>
      <path d={planet} className="earth-ocean"/>
      <path d={grid} className="earth-grid"/>
      {outline.map(({key,country:region,shape})=>{
        const marked=region && selected.has(region.code);
        const focused=region?.code===country?.code && !!country;
        const selectable=!!region && editable;
        const pick=()=>{if (region) onCountry?.(region);};
        return <path key={key} d={shape} className={"earth-country earth-"+(region?.continent ?? "other")+(marked ? " selected" : "")+(focused ? " focused" : "")}
          data-country={region?.code} role={selectable ? "button" : undefined} aria-label={selectable ? region.name : undefined}
          aria-pressed={selectable ? !!marked : undefined} aria-hidden={!selectable || undefined} tabIndex={selectable && focused ? 0 : undefined}
          onClick={selectable ? pick : undefined} onKeyDown={selectable ? (event)=>{
            if (event.key==="Enter" || event.key===" ") {event.preventDefault();pick();}
          } : undefined}><title>{region?.name}</title></path>;
      })}
      <path d={route} className="earth-route"/>
    </g>
    {!country && continentLabels.map(([label,lon,lat])=>{
      const point=projection([lon,lat])!;
      return <text key={label} x={point[0]} y={point[1]} className="earth-continent" textAnchor="middle" aria-hidden="true">{label}</text>;
    })}
    {points.map((place,index)=>{
      const point=project(place);
      if (!point || local.some((candidate)=>candidate.id===place.id)) return null;
      const [x,y]=transformed(point);
      return <g key={place.id+"-"+index} className="earth-route-pin" style={{transform:"translate("+x+"px,"+y+"px)"}} aria-hidden="true">
        <title>{place.name}</title><circle r={index===0 || index===points.length-1 ? 7 : 5}/>
        {(index===0 || index===points.length-1) && <text className="earth-pin-label" x={10} y={-8}>{place.name}</text>}
      </g>;
    })}
    {local.map((place,index)=>{
      const point=project(place);
      if (!point) return null;
      const [x,y]=transformed(point);
      if (x<10 || x>width-10 || y<10 || y>height-10) return null;
      const isPicked=place.id===city?.id;
      const placed=points.some((item)=>item.id===place.id);
      const showName=!city && (placed || index<3) && cityLabels.every(([lx,ly])=>Math.abs(x-lx)>100 || Math.abs(y-ly)>15);
      if (showName) cityLabels.push([x,y]);
      return <g key={place.id} className={"earth-city"+(isPicked || placed ? " selected" : "")} role="button" aria-label={"Escolher "+place.name+" no mapa"} aria-pressed={placed} tabIndex={isPicked ? 0 : undefined}
        style={{transform:"translate("+x+"px,"+y+"px)"}} onClick={()=>onCity?.(place)} onKeyDown={(event)=>{
          if (event.key==="Enter" || event.key===" ") {event.preventDefault();onCity?.(place);}
        }}><title>{place.name}</title><circle className="earth-city-hit" r={13}/><circle className="earth-city-core" r={isPicked ? 8 : 5}/>
        {showName && <text className="earth-pin-label" x={9} y={-9}>{place.name}</text>}
      </g>;
    })}
    {labelPoint && city && <text x={width/2+12} y={height/2-15} className="earth-pin-label earth-focus-label" aria-hidden="true">{city.name}</text>}
  </svg>;
}
