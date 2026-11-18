"use client";

import { ArrowLeft, ArrowRight, Flag, Globe2, LocateFixed, MapPin, Plus, Search, X } from "lucide-react";
import { useState } from "react";
import type { City } from "@/lib/destinations";
import { normalize, type Plan } from "@/lib/planning";
import { citiesOfCountry, countryForCity, findCountry, worldCountries, type Country } from "@/lib/world-catalog";
import { WorldPlannerMap } from "./world-planner-map";

export type RouteField = "origin" | "via" | "end";
export type ManualPlace = {field:RouteField;country?:Country;replaceId?:string};
const fields = [["origin","Origem"],["end","Destino"],["via","Adicionar parada"]] as const;

export function putRouteCity(plan:Plan,field:RouteField,place:City,replaceId?:string): Plan {
  if (field==="origin") return {...plan,origin:place,via:plan.via.filter((item)=>item.id!==place.id),nightWeights:undefined};
  if (field==="end") return {...plan,end:place,loop:false,via:plan.via.filter((item)=>item.id!==place.id),nightWeights:undefined};
  if (place.id===plan.origin.id || place.id===(plan.loop ? plan.origin : plan.end).id) return plan;
  if (plan.via.some((item)=>item.id===place.id)) return plan;
  const via=replaceId && plan.via.some((item)=>item.id===replaceId)
    ? plan.via.map((item)=>item.id===replaceId ? place : item)
    : [...plan.via,place];
  return {...plan,via,nightWeights:undefined};
}

function countryMatches(value:string) {
  const query=normalize(value);
  if (!query) return [];
  return worldCountries.map((country)=>{
    const title=normalize(country.name), original=normalize(country.original);
    return {country,rank:title.startsWith(query) ? 1 : original.startsWith(query) ? 2 : title.includes(query) || original.includes(query) ? 3 : 0};
  }).filter((item)=>item.rank>0).sort((a,b)=>a.rank-b.rank).slice(0,7).map((item)=>item.country);
}

export function PlannerRoute({plan,points,onUpdate,onManual}:{
  plan:Plan;points:City[];onUpdate:(plan:Plan)=>void;onManual:(intent:ManualPlace)=>void;
}) {
  const [field,setField] = useState<RouteField>("via");
  const [focus,setFocus] = useState<Country>();
  const [town,setTown] = useState<City>();
  const [replaceId,setReplaceId] = useState<string>();
  const [input,setInput] = useState("");
  const [searchOpen,setSearchOpen] = useState(false);
  const last=plan.loop ? plan.origin : plan.end;
  const coverage=new Set(points.map((place)=>place.country)).size;
  const options=focus ? citiesOfCountry(focus.code) : [];
  const suggestions=searchOpen ? countryMatches(input) : [];

  function placeCity(place:City) {
    if (field==="via" && (place.id===plan.origin.id || place.id===last.id)) return;
    onUpdate(putRouteCity(plan,field,place,replaceId));
    setTown(place);
    if (field==="via") setReplaceId(place.id);
  }

  function focusCountry(country:Country,writeName=true) {
    setFocus(country);
    setTown(undefined);
    setSearchOpen(false);
    if (writeName) setInput(country.name);
    const isSameCountry=(place:City)=>countryForCity(place)?.code===country.code;
    if (field!=="via") {
      const current=field==="origin" ? plan.origin : last;
      const suggested=isSameCountry(current) ? current : citiesOfCountry(country.code)[0];
      if (suggested && (suggested.id!==current.id || field==="end" && plan.loop)) onUpdate(putRouteCity(plan,field,suggested));
      setReplaceId(undefined);
      return;
    }
    const existing=plan.via.find(isSameCountry);
    const represented=existing || isSameCountry(plan.origin) || isSameCountry(last);
    const suggested=existing ?? (!represented ? citiesOfCountry(country.code)[0] : undefined);
    setReplaceId(suggested?.id);
    if (suggested && !existing) onUpdate(putRouteCity(plan,"via",suggested));
  }

  function resetMap() {
    setFocus(undefined);
    setTown(undefined);
    setReplaceId(undefined);
    setInput("");
    setSearchOpen(false);
  }

  function changeField(role:RouteField) {
    setField(role);
    setTown(undefined);
    setReplaceId(role==="via" && focus ? plan.via.find((place)=>countryForCity(place)?.code===focus.code)?.id : undefined);
  }

  function remove(place:City) {
    onUpdate({...plan,via:plan.via.filter((item)=>item.id!==place.id),nightWeights:undefined});
    if (place.id===replaceId) {setReplaceId(undefined);setTown(undefined);}
  }

  function move(place:City,direction:number) {
    const start=plan.via.findIndex((item)=>item.id===place.id);
    const end=start+direction;
    if (start<0 || end<0 || end>=plan.via.length) return;
    const via=[...plan.via];
    [via[start],via[end]]=[via[end],via[start]];
    onUpdate({...plan,via,nightWeights:undefined});
  }

  return <section className="planner-atlas" aria-label="Construtor de rota">
    <div className="atlas-body">
      <div className="atlas-stage">
        <div className="atlas-map-toolbar">
          <div className="atlas-search-wrap">
            <label className="atlas-search"><Search size={17}/><input type="search" placeholder="Digite um país" aria-label="Buscar país" value={input}
              onChange={(event)=>{
                const value=event.target.value;
                setInput(value);
                setSearchOpen(true);
                const exact=value.trim().length>=3 ? findCountry(value) : undefined;
                if (exact) focusCountry(exact,false);
              }} onFocus={()=>setSearchOpen(!findCountry(input))}
              onKeyDown={(event)=>{
                if (event.key==="Escape") setSearchOpen(false);
                if (event.key==="Enter") {
                  event.preventDefault();
                  const match=findCountry(input) ?? suggestions[0];
                  if (match) focusCountry(match);
                }
              }}/></label>
            {searchOpen && input.trim() && <div className="atlas-search-results" aria-label="Países encontrados">
              {suggestions.length ? suggestions.map((country)=><button type="button" key={country.code} onClick={()=>focusCountry(country)}><span>{country.name}</span><small>{country.code}</small></button>)
                : <p>Nenhum país encontrado.</p>}
            </div>}
          </div>
          {focus && <button type="button" className="atlas-overview" onClick={resetMap}><Globe2 size={15}/> Visão global</button>}
        </div>
        <WorldPlannerMap points={points} country={focus} city={town} editable onCountry={focusCountry} onCity={placeCity}/>
        <div className="atlas-map-footer"><span><i/> {coverage} {coverage===1 ? "país na rota" : "países na rota"}</span><span><a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth</a> · <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">GeoNames</a></span></div>
      </div>
      <aside className="atlas-inspector" aria-label="Seleção de cidades">
          <div className="atlas-inspector-title"><span className="atlas-inspector-icon"><LocateFixed size={18}/></span><div><h2>{focus?.name ?? "Escolha no mapa"}</h2><p>{focus ? "Escolha a cidade para usar na rota." : "Clique num país ou use a busca para começar."}</p></div></div>
          <div className="atlas-role" role="group" aria-label="Papel da cidade na rota">{fields.map(([role,label])=><button type="button" key={role} data-tutorial-target={"manual-"+role}
            aria-pressed={role===field} onClick={()=>changeField(role)}>{label}</button>)}</div>
          {focus && <div className="atlas-city-list" aria-label={"Cidades de "+focus.name}>
            {options.map((place)=>{
              const selected=field==="via" ? plan.via.some((item)=>item.id===place.id) : (field==="origin" ? plan.origin : last).id===place.id;
              return <button type="button" key={place.id} aria-pressed={selected}
                disabled={field==="via" && [plan.origin.id,last.id].includes(place.id)}
                onClick={()=>placeCity(place)}><MapPin size={14}/><span>{place.name}</span>{selected && <span className="atlas-city-selected">Na rota</span>}</button>;
            })}
            {!options.length && <p>Use uma cidade informada por você.</p>}
          </div>}
          {focus && field==="via" && replaceId && <button type="button" className="atlas-secondary" onClick={()=>{setReplaceId(undefined);setTown(undefined);}}>Escolher outra parada neste país <Plus size={14}/></button>}
          <button type="button" className="atlas-secondary" onClick={()=>onManual({field,country:focus,replaceId})}>Informar cidade manualmente <Plus size={14}/></button>
      </aside>
    </div>
    <div className="atlas-stops" data-tutorial-target="manual-sequence">
      <div className="atlas-stop-track" aria-label="Sequência da rota">
        <span className="atlas-route-chip atlas-endpoint"><Flag size={14}/><span>{plan.origin.name}<small>Origem</small></span></span>
        {plan.via.map((place,index)=><div className="atlas-route-chip" key={place.id}>
          <span>{place.name}<small>{place.country}</small></span>
          {plan.fixed && plan.via.length>1 && <><button type="button" disabled={index===0} aria-label={"Mover "+place.name+" para antes"} onClick={()=>move(place,-1)}><ArrowLeft size={12}/></button><button type="button" disabled={index===plan.via.length-1} aria-label={"Mover "+place.name+" para depois"} onClick={()=>move(place,1)}><ArrowRight size={12}/></button></>}
          <button type="button" aria-label={"Remover "+place.name} onClick={()=>remove(place)}><X size={14}/></button>
        </div>)}
        <span className="atlas-route-chip atlas-endpoint"><MapPin size={14}/><span>{last.name}<small>{plan.loop ? "Retorno" : "Destino"}</small></span></span>
      </div>
      <div className="atlas-route-options">
        <label className="check"><input type="checkbox" checked={plan.loop} onChange={(event)=>onUpdate({...plan,loop:event.target.checked,nightWeights:undefined})}/> Retornar à origem</label>
        <label className="check"><input type="checkbox" checked={plan.fixed} onChange={(event)=>onUpdate({...plan,fixed:event.target.checked,nightWeights:undefined})}/> Fixar ordem das paradas</label>
      </div>
    </div>
  </section>;
}
