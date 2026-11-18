"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BedDouble, ChevronRight, Clock3, Coins, Globe2, Laptop, Scale, Sparkles, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { costs, daysBetween, editStop, generate, money, shortDate, stayOptions, strategies, transportOptions, type Strategy, type Trip, type Variant } from "@/lib/planning";
import { accountSettingsPath } from "@/lib/account-path";
import { saveTrip, useLocal, waitForWorkspaceSave } from "./local-store";
import { Empty, Modal } from "./ui";
import { Itinerary } from "./itinerary";
import { TicketJump } from "./route-tickets";
import { TutorialCard } from "./tutorial";

const icons = {economic:Coins,balanced:Scale,comfort:Sparkles,work:Laptop};

export function VariantOptions({variants,choice,onSelect,compact=false}: {
  variants:Variant[];choice:Strategy;onSelect:(choice:Strategy)=>void;compact?:boolean;
}) {
  return <div className="variant-grid" role="group" aria-label="Pacotes da viagem">
    {variants.map((item)=>{
      const data=costs(item), Icon=icons[item.id];
      const countryCount=new Set(item.stops.map((stop)=>stop.city.country)).size;
      return <button type="button" key={item.id} className="variant panel" aria-pressed={choice===item.id} onClick={()=>onSelect(item.id)}>
        {compact ? <span className="variant-title">{strategies[item.id].title}</span> : <><span className="variant-icon"><Icon size={19}/></span><h2>{strategies[item.id].title}</h2><p>{strategies[item.id].summary}</p></>}
        <strong>{money(data.known,item.plan.currency)}</strong><small>{data.pending ? (compact ? "Subtotal estimado" : "Subtotal estimado · "+data.pending+" itens a consultar") : "Estimativa total"}</small>
        {!compact && <span className="variant-meta"><span><Clock3 size={15}/> {data.hours}h com tempo estimado</span><span><Globe2 size={15}/> {countryCount} países/territórios</span></span>}
        {!compact && !!data.over && <span className="variant-over">{money(data.over,item.plan.currency)} acima do orçamento</span>}
      </button>;
    })}
  </div>;
}

export function Budget({variant}: {variant:Variant}) {
  const totals = costs(variant);
  const currency = variant.plan.currency;
  return <div className="stack budget">
    <div className="budget-total"><span>{totals.pending ? "Subtotal conhecido" : "Total estimado"}</span><strong>{money(totals.known,currency)}</strong></div>
    {totals.rows.map(({label,value})=><div className="stat-row" key={label}><span>{label}</span><strong>{value ? money(value,currency) : "Em aberto"}</strong></div>)}
    <div className="stat-row"><span>Orçamento</span><strong>{variant.plan.budget ? money(variant.plan.budget,currency) : "Em aberto"}</strong></div>
    {!!variant.plan.budget && <div className={"budget-difference "+(totals.over ? "over" : "spare")}><span>{totals.over ? "Acima do orçamento" : totals.spare ? "Folga no orçamento" : "Dentro do orçamento informado"}</span><strong>{money(totals.over || totals.spare,currency)}</strong></div>}
    {totals.pending>0 && <p className="quiet"><TriangleAlert size={15}/> {totals.pending} {totals.pending === 1 ? "item sem valor fica fora" : "itens sem valor ficam fora"} do subtotal e da diferença.</p>}
    <p className="quiet">Preços de demonstração, em BRL na origem.{currency !== "BRL" && " A conversão usa uma taxa fixa simulada."} Freelas e trocas ficam fora do cálculo.</p>
  </div>;
}

function asTrip(variant: Variant, title: string, tripId:string): Trip {
  return {...variant,tripId,title,revision:1,created:new Date().toISOString(),reservations:{},reminders:{}};
}

export function SaveDialog({variant,onClose}: {variant:Variant;onClose:() => void}) {
  const router = useRouter();
  const {hidePublishedRoutes}=useLocal();
  const defaultName = variant.plan.preset === "south" && variant.plan.loop ? "Volta pela América do Sul" : variant.plan.loop ? "Circuito por "+variant.stops[1].city.country : variant.plan.origin.name+" a "+variant.plan.end.name;
  const [title,setTitle] = useState(defaultName);
  const [publicTitle,setPublicTitle] = useState("");
  const [description,setDescription] = useState("");
  const [publishOnSave,setPublishOnSave] = useState(false);
  const makePublic=publishOnSave && !hidePublishedRoutes;
  const [tripId] = useState(()=>crypto.randomUUID());
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState("");
  return <Modal title="Salvar viagem" onClose={onClose}>
    <form className="stack" onSubmit={async (event)=>{
      event.preventDefault();
      if (saving || !title.trim()) return;
      const trip = asTrip(variant,title.trim(),tripId);
      const publication=makePublic ? {title:publicTitle.trim() || trip.title,description:description.trim()} : undefined;
      if (!saveTrip(trip,publication)) return;
      setSaving(true);
      setError("");
      if (!await waitForWorkspaceSave()) {
        setSaving(false);
        setError("O navegador não conseguiu guardar a viagem. Tente salvar novamente.");
        return;
      }
      router.push("/viagens/"+trip.tripId);
    }}>
      <TutorialCard step="save" title="Confirme seu roteiro" insideDialog>
        <p>Escolha um nome e clique em <strong>Salvar viagem</strong> para encontrar o roteiro em Minhas viagens.</p>
      </TutorialCard>
      <label>Nome da viagem<input value={title} onChange={(event)=>setTitle(event.target.value)} required maxLength={90}/></label>
      {hidePublishedRoutes ? <p className="quiet">A publicação no Explorar está desativada. <Link className="text-link" href={accountSettingsPath+"#privacidade"}>Alterar em configurações</Link></p>
        : <label className="check"><input type="checkbox" checked={makePublic} onChange={(event)=>setPublishOnSave(event.target.checked)}/> Publicar no Explorar</label>}
      {makePublic && <><p className="quiet">Outros perfis neste navegador poderão copiar o roteiro. A publicação inclui as paradas, a duração e as estimativas.</p><details className="save-public-details"><summary>Personalizar a publicação</summary><div className="stack"><label>Título público<input value={publicTitle} onChange={(event)=>setPublicTitle(event.target.value)} placeholder={title} maxLength={90}/></label><label>Descrição pública<textarea value={description} onChange={(event)=>setDescription(event.target.value)} maxLength={200}/></label></div></details></>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button" type="submit" disabled={saving}>{saving ? "Salvando…" : makePublic ? "Salvar e publicar" : "Salvar viagem"} <ArrowRight size={17}/></button>
    </form>
  </Modal>;
}

function savings(variant: Variant) {
  const old = costs(variant).known;
  const trip = {...variant,tripId:"preview",title:"Prévia",revision:1,created:new Date().toISOString(),reservations:{},reminders:{}};
  const choices = variant.stops.flatMap((stop,index)=>{
    const stay = stayOptions(stop.city).filter((item)=>item.nightly !== null && variant.plan.stays.includes(item.type)).sort((a,b)=>a.nightly!-b.nightly!)[0];
    const inbound = index ? variant.legs[index-1] : undefined;
    const bus = inbound && transportOptions(variant.stops[index-1].city,stop.city,inbound.id,inbound.from,inbound.to).find((item)=>item.mode==="Ônibus" && item.price !== null);
    const edits = [];
    if (stay && stay.id!==stop.stay.id) edits.push({title:stop.city.name+" · "+stop.stay.type+" → "+stay.type,change:{...stop,stay}});
    if (bus && inbound?.mode==="Avião") edits.push({title:variant.stops[index-1].city.name+" → "+stop.city.name+" de ônibus",change:{...stop,leg:bus}});
    return edits.flatMap(({title,change}) => {
      const {result} = editStop(trip,index,change);
      return result ? [{title,result,amount:old-costs(result).known}] : [];
    });
  });
  return choices.filter((item)=>item.amount>0).sort((a,b)=>b.amount-a.amount).slice(0,3);
}

function Comparison({variants}: {variants:Variant[]}) {
  const [choice,setChoice] = useState<Strategy>(variants.some((item)=>item.id==="balanced") ? "balanced" : variants[0].id);
  const [adjustments,setAdjustments] = useState<Partial<Record<Strategy,Variant>>>({});
  const [showSave,setShowSave] = useState(false);
  const [simulate,setSimulate] = useState(false);
  const variantsNow = variants.map((variant)=>adjustments[variant.id] ?? variant);
  const variant = variantsNow.find((item)=>item.id===choice)!;
  const totals=costs(variant);
  const suggestions = simulate ? savings(variant) : [];
  const countries = [...new Set(variant.stops.map((stop)=>stop.city.country))];
  return <>
    <Link className="text-link back-link" href="/planejar?editar=1"><ArrowLeft size={16}/> Editar planejamento</Link>
    <div className="page-head"><div><span className="eyebrow"><Scale size={16}/> Comparar propostas</span><h1>Escolha seu caminho.</h1><p>{variant.plan.origin.name} <ChevronRight size={14}/> {variant.plan.loop ? "Circuito com retorno" : variant.plan.end.name} · {daysBetween(variant.plan.start,variant.plan.endDate)} dias · {shortDate(variant.plan.start,true)}</p></div><div className="page-head-actions"><TicketJump/><button className="button" onClick={()=>setShowSave(true)}>Salvar viagem <ArrowRight size={17}/></button></div></div>
    {variants.length<3 && <p className="notice">Com as preferências e a duração atuais, há {variants.length} {variants.length === 1 ? "proposta distinta viável" : "propostas distintas viáveis"} na demonstração.</p>}
    <VariantOptions variants={variantsNow} choice={choice} onSelect={(id)=>{setChoice(id);setSimulate(false);}}/>
    <div className="stack">
      <Itinerary variant={variant}/>
      <div className="trip-support">
        <section className="panel feature-panel"><h2><Globe2 size={20}/> Cobertura da proposta</h2><div className="chip-row">{countries.map((country)=><span className="filter-chip" key={country}>{country}</span>)}</div><div className="stat-row"><span>Trechos com estimativa de transporte</span><strong>{variant.legs.filter((leg)=>leg.price!==null).length} de {variant.legs.length}</strong></div><p className="quiet">As linhas tracejadas marcam trechos que precisam de consulta. Confirme as regras de entrada, trânsito e permissão para trabalho com a autoridade de cada país.</p></section>
        <aside className="stack">
          <section className="panel feature-panel"><h2><Coins size={20}/> Composição do orçamento</h2><Budget variant={variant}/>{!!totals.over && <button type="button" className="button button-outline" onClick={()=>setSimulate(!simulate)}><BedDouble size={16}/> {simulate ? "Ocultar ajustes" : "Simular economia"}</button>}</section>
          {simulate && <section className="panel feature-panel"><h2>Ajustes possíveis</h2>{suggestions.length ? suggestions.map((item)=><div className="saving" key={item.title}><strong>{item.title}</strong><span className="quiet">Economia de {money(item.amount,variant.plan.currency)} no subtotal. Revise as datas vizinhas após aplicar.</span><button className="text-link" onClick={()=>setAdjustments({...adjustments,[choice]:item.result})}>Aplicar ajuste <ArrowRight size={14}/></button></div>) : <p className="quiet">As ofertas demonstradas já usam as opções de menor custo para esta proposta.</p>}</section>}
        </aside>
      </div>
    </div>
    {showSave && <SaveDialog variant={variant} onClose={()=>setShowSave(false)}/>}
  </>;
}

export function Compare() {
  const {plan} = useLocal();
  const variants = plan ? generate(plan) : [];
  if (!variants.length) return <Empty title="Comece pelo seu roteiro" description="Preencha o planejador para ter propostas de viagem para comparar." href="/planejar" label="Montar roteiro"/>;
  return <Comparison variants={variants} key={JSON.stringify(plan)}/>;
}
