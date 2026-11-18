"use client";

import { ArrowUpRight, CalendarDays, Check, SlidersHorizontal, Wallet } from "lucide-react";
import { useState } from "react";
import { addDays, addMonths, arrivesAtEnd, daysBetween, extras, money, shortDate, stayTypes, type Currency, type Plan } from "@/lib/planning";
import { Modal } from "./ui";

export type PlannerSetting = "dates" | "budget" | "preferences";
const titles = {dates:"Datas da viagem",budget:"Orçamento e viajantes",preferences:"Preferências da viagem"};
const durations = [
  {label:"1 semana",end:(start:string)=>addDays(start,7)},
  {label:"2 semanas",end:(start:string)=>addDays(start,14)},
  {label:"3 semanas",end:(start:string)=>addDays(start,21)},
  ...[1,3,6,12,24].map((months)=>({label:months===1 ? "1 mês" : months===12 ? "1 ano" : months===24 ? "2 anos" : months+" meses",end:(start:string)=>addMonths(start,months)})),
];

function selectedDuration(plan:Plan) {
  return plan.start && plan.endDate ? durations.find((item)=>item.end(plan.start)===plan.endDate) : undefined;
}

export function tripDuration(plan:Plan) {
  if (!plan.start || !plan.endDate) return "Datas em aberto";
  const days=daysBetween(plan.start,plan.endDate);
  return selectedDuration(plan)?.label ?? days+(days===1 ? " dia" : " dias");
}

export function PlannerDetails({plan,onSetting,withPreferences=false}: {
  plan:Plan;onSetting:(setting:PlannerSetting)=>void;withPreferences?:boolean;
}) {
  return <div className="planner-details" aria-label="Ajustes do roteiro">
    <button type="button" onClick={()=>onSetting("dates")}><CalendarDays size={18}/><span><strong>Datas e duração</strong><small>{plan.start ? tripDuration(plan)+" · saída em "+shortDate(plan.start) : "A combinar"}</small></span><ArrowUpRight size={14}/></button>
    <button type="button" onClick={()=>onSetting("budget")}><Wallet size={18}/><span><strong>Orçamento e viajantes</strong><small>{plan.budget ? money(plan.budget,plan.currency) : "Em aberto"} · {plan.travelers} {plan.travelers===1 ? "viajante" : "viajantes"}</small></span><ArrowUpRight size={14}/></button>
    {withPreferences && <button type="button" onClick={()=>onSetting("preferences")}><SlidersHorizontal size={18}/><span><strong>Mais preferências</strong><small>Transporte, estadia e gastos</small></span><ArrowUpRight size={14}/></button>}
  </div>;
}

export function PlannerSettingDialog({setting,plan,onClose,onSave}: {
  setting:PlannerSetting;plan:Plan;onClose:()=>void;onSave:(change:Partial<Plan>)=>string;
}) {
  const [draft,setDraft] = useState(plan);
  const [method,setMethod] = useState<"duration"|"calendar">(()=>selectedDuration(plan) ? "duration" : "calendar");
  const [error,setError] = useState("");
  const currentDuration=selectedDuration(draft);
  function update(change:Partial<Plan>) {setDraft((current)=>({...current,...change}));setError("");}

  return <Modal title={titles[setting]} onClose={onClose} className="planner-setting-dialog">
    <form className="stack" onSubmit={(event)=>{
      event.preventDefault();
      const change=setting==="dates" ? {start:draft.start,endDate:draft.endDate}
        : setting==="budget" ? {budget:draft.budget,currency:draft.currency,travelers:draft.travelers}
        : {pace:draft.pace,transport:draft.transport,stays:draft.stays,extras:draft.extras,internet:draft.internet};
      setError(onSave(change));
    }}>
      {setting==="dates" && <>
        <div className="planner-date-method" role="group" aria-label="Como definir o período">
          <button type="button" aria-pressed={method==="duration"} onClick={()=>setMethod("duration")}>Por duração</button>
          <button type="button" aria-pressed={method==="calendar"} onClick={()=>setMethod("calendar")}>Datas exatas</button>
        </div>
        <label>Quando você sai?<input type="date" required value={draft.start} onChange={(event)=>{
          const start=event.target.value;
          const previousDays=draft.start && draft.endDate ? daysBetween(draft.start,draft.endDate) : 0;
          const endDate=method==="duration" && start ? currentDuration?.end(start) ?? addDays(start,previousDays || 7) : draft.endDate;
          update({start,endDate});
        }}/></label>
        {method==="duration" ? <fieldset>
          <legend>Quanto tempo você quer viajar?</legend>
          <div className="chip-row">{durations.map((item)=><button key={item.label} type="button" className="filter-chip" disabled={!draft.start} aria-pressed={currentDuration===item} onClick={()=>update({endDate:item.end(draft.start)})}>{item.label}</button>)}</div>
          {draft.start && draft.endDate && <p className="quiet planner-date-range">{tripDuration(draft)} · {arrivesAtEnd(draft) ? "chegada" : "fim da viagem"} em {shortDate(draft.endDate,true)}</p>}
        </fieldset> : <label>{arrivesAtEnd(draft) ? "Quando você quer chegar?" : "Quando termina a viagem?"}<input type="date" required min={draft.start ? addDays(draft.start,1) : undefined} max={draft.start ? addMonths(draft.start,24) : undefined} value={draft.endDate} onChange={(event)=>update({endDate:event.target.value})}/></label>}
      </>}
      {setting==="budget" && <>
        <p className="quiet">Você pode deixar o orçamento em aberto e informar um valor depois.</p>
        <div className="form-grid"><label>Orçamento total<input type="number" min={0} step=".01" placeholder="Opcional" value={draft.budget ? draft.budget/100 : ""} onChange={(event)=>update({budget:Math.round(Number(event.target.value)*100)})}/></label>
          <label>Moeda<select value={draft.currency} onChange={(event)=>update({currency:event.target.value as Currency})}><option value="BRL">Real (BRL)</option><option value="USD">Dólar (USD)</option><option value="EUR">Euro (EUR)</option></select></label></div>
        <label>Viajantes<input type="number" min={1} max={20} required value={draft.travelers || ""} onChange={(event)=>update({travelers:Number(event.target.value)})}/></label>
      </>}
      {setting==="preferences" && <>
        <div className="form-grid">
          <label>Ritmo<select value={draft.pace} onChange={(event)=>update({pace:event.target.value as Plan["pace"]})}><option value="tranquilo">Tranquilo</option><option value="moderado">Moderado</option><option value="intenso">Intenso</option></select></label>
          <label>Transporte<select value={draft.transport} onChange={(event)=>update({transport:event.target.value as Plan["transport"]})}><option value="qualquer">Ônibus e avião</option><option>Ônibus</option><option>Avião</option></select></label>
        </div>
        <fieldset><legend>Hospedagens aceitas</legend><div className="checks">{stayTypes.map((stay)=><label className="check" key={stay}><input type="checkbox" checked={draft.stays.includes(stay)} onChange={(event)=>update({stays:event.target.checked ? [...draft.stays,stay] : draft.stays.filter((value)=>value!==stay)})}/> {stay}</label>)}</div></fieldset>
        <fieldset><legend>Incluir no orçamento</legend><div className="checks">{extras.map((item)=><label className="check" key={item}><input type="checkbox" checked={draft.extras.includes(item)} onChange={(event)=>update({extras:event.target.checked ? [...draft.extras,item] : draft.extras.filter((value)=>value!==item)})}/> {item}</label>)}</div></fieldset>
        <label className="check"><input type="checkbox" checked={draft.internet} onChange={(event)=>update({internet:event.target.checked})}/> Internet estável é prioridade</label>
      </>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button" type="submit">Salvar {setting==="dates" ? "datas" : "ajustes"} <Check size={17}/></button>
    </form>
  </Modal>;
}
