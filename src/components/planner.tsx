"use client";

import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Compass, Globe2, MapPin, Maximize2, MessageCircle, Minimize2, Plus, Route } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { templates, timeZones, type City } from "@/lib/destinations";
import { addMonths, arrivesAtEnd, copyPlan, costs, daysBetween, generate, money, presetPlan, sequence, shortDate, strategies, validatePlan, type Plan, type Preset, type Strategy } from "@/lib/planning";
import { parseTripRequest } from "@/lib/trip-request";
import { readPlanningDraft } from "@/lib/planning-draft";
import { planningTutorial, tutorialExample } from "@/lib/tutorial";
import { citiesOfCountry } from "@/lib/world-catalog";
import { finishManualMapGuide, setPlan, updateTutorial, useLocal } from "./local-store";
import { PlannerRoute, putRouteCity, type ManualPlace } from "./planner-route";
import { PlannerDetails, PlannerSettingDialog, tripDuration, type PlannerSetting } from "./planner-details";
import { SaveDialog, VariantOptions } from "./compare";
import { Itinerary } from "./itinerary";
import { TravelComposer } from "./travel-composer";
import { WorldPlannerMap } from "./world-planner-map";
import { Empty, Modal } from "./ui";
import { ManualRouteTutorial, TutorialCard } from "./tutorial";

const availableZones=[...new Set([...timeZones,...Intl.supportedValuesOf("timeZone")])].sort();
const presets = [
  ["custom","Rota livre","Escolha países e cidades",Globe2],
  ["south","América do Sul","Circuito com retorno",Route],
  ["thailand","São Paulo → Bangkok","Europa e Ásia",Compass],
] as const;
type Exchange = {message:string;reply:string};

function routeReply(plan:Plan) {
  const count=sequence(plan).length;
  const last=plan.loop ? plan.origin : plan.end;
  const arrival=arrivesAtEnd(plan) ? " em "+shortDate(plan.endDate,true) : "";
  const budget=plan.budget ? "Orçamento de "+money(plan.budget,plan.currency)+"." : "Orçamento em aberto.";
  return "Montei "+count+" paradas, de "+plan.origin.name+" a "+last.name+arrival+". "+budget;
}

function CityDialog({intent,onClose,onSave}: {intent:ManualPlace;onClose:()=>void;onSave:(place:City)=>void}) {
  const [coords,setCoords] = useState(false);
  const zone=intent.country ? citiesOfCountry(intent.country.code)[0]?.tz : undefined;
  return <Modal title="Informar cidade" onClose={onClose}>
    <form className="stack" onSubmit={(event)=>{
      event.preventDefault();
      const data=new FormData(event.currentTarget);
      const name=String(data.get("name") ?? "").trim(), country=String(data.get("country") ?? "").trim();
      if (!name || !country) return;
      onSave({id:"custom-"+crypto.randomUUID(),name,country,countryCode:country===intent.country?.name ? intent.country.code : undefined,
        night:0,tz:String(data.get("tz")),lat:coords ? Number(data.get("lat")) : undefined,lon:coords ? Number(data.get("lon")) : undefined});
    }}>
      <div className="form-grid"><label>Cidade<input name="name" required maxLength={60}/></label><label>País ou território<input name="country" required maxLength={60} defaultValue={intent.country?.name}/></label></div>
      <label>Fuso horário<select name="tz" defaultValue={zone && availableZones.includes(zone) ? zone : "UTC"}>{availableZones.map((item)=><option key={item}>{item}</option>)}</select></label>
      <label className="check"><input type="checkbox" checked={coords} onChange={(event)=>setCoords(event.target.checked)}/> Informar coordenadas do mapa</label>
      {coords && <div className="form-grid"><label>Latitude<input name="lat" type="number" required min={-90} max={90} step="any"/></label><label>Longitude<input name="lon" type="number" required min={-180} max={180} step="any"/></label></div>}
      <p className="quiet">A cidade entra no mapa quando você informa as coordenadas. Hospedagem e conexões ficam pendentes de consulta.</p>
      <button className="button" type="submit">Adicionar cidade <Plus size={17}/></button>
    </form>
  </Modal>;
}

function PlanForm({initial,fromMessage,initialDestination,requestPrompt}: {initial:Plan;fromMessage:boolean;initialDestination:boolean;requestPrompt:string|null}) {
  const router=useRouter();
  const {tutorial,manualMapSeen}=useLocal();
  const step=tutorial?.step;
  const routeStep=planningTutorial(step) ? step : undefined;
  const [plan,setPlanDraft] = useState(initial);
  const [manual,setManual] = useState<ManualPlace|null>(null);
  const [manualGuide,setManualGuide] = useState<number>();
  const [setting,setSetting] = useState<PlannerSetting|null>(null);
  const [error,setError] = useState("");
  const [editMode,setEditMode] = useState(!fromMessage && initialDestination);
  const [expanded,setExpanded] = useState(false);
  const [voiceActive,setVoiceActive] = useState(false);
  const [preview,setPreview] = useState(fromMessage && initialDestination);
  const [hasRoute,setHasRoute] = useState(initialDestination);
  const [conversation,setConversation] = useState<Exchange[]>(()=>{
    if (!fromMessage || !initial.prompt) return [];
    const reply=!initialDestination ? "Qual é o destino da viagem?"
      : generate(initial).length ? routeReply(initial) : validatePlan(initial) || "Reserve mais dias para os deslocamentos.";
    return [{message:initial.prompt,reply}];
  });
  const [choice,setChoice] = useState<Strategy>("balanced");
  const [showSave,setShowSave] = useState(false);
  const messages=useRef<HTMLOListElement>(null);
  const chatTitle=useRef<HTMLHeadingElement>(null);
  const editorTitle=useRef<HTMLHeadingElement>(null);
  const focusMode=useRef(false);
  const points=useMemo(()=>sequence(plan),[plan]);
  const variants=useMemo(()=>preview ? generate(plan) : [],[plan,preview]);
  const variant=variants.find((item)=>item.id===choice) ?? variants[0];
  const totals=variant ? costs(variant) : null;

  useEffect(()=>{
    if (step!=="plan" || !requestPrompt) return;
    updateTutorial("plan",variant ? {step:"map",draft:plan,draftFor:requestPrompt} : {step:"chat"});
  },[step,requestPrompt,variant,plan]);

  useEffect(()=>{
    const history=messages.current;
    if (history) history.scrollTop=history.scrollHeight;
  },[conversation,expanded,editMode]);
  useEffect(()=>{
    if (!focusMode.current) return;
    focusMode.current=false;
    const title=editMode ? editorTitle.current : chatTitle.current;
    title?.focus({preventScroll:true});
    title?.scrollIntoView({block:"nearest"});
  },[editMode]);

  function update(next:Plan) {
    setPlanDraft(next);
    setError("");
    if (routeStep && !validatePlan(next)) updateTutorial(routeStep,{draft:next,draftFor:requestPrompt ?? undefined});
  }
  function switchMode(edit:boolean) {
    focusMode.current=true;
    setEditMode(edit);
    if (edit) setExpanded(false);
  }
  function openManualMap() {
    switchMode(true);
    if (!manualMapSeen && (!step || step==="complete" || step==="skipped")) setManualGuide(0);
  }
  function closeManualGuide() {
    finishManualMapGuide();
    setManualGuide(undefined);
  }

  function narrate(message:string) {
    if (!message) return;
    function reply(text:string) {
      setConversation((history)=>[...history,{message,reply:text}]);
    }
    const result=parseTripRequest(message,plan);
    if (!result.fields.length) {reply("Diga um destino, quanto tempo quer viajar ou algo que quer mudar na rota.");return;}
    const next=result.plan;
    update(next);
    if (!hasRoute && !result.hasDestination) {reply("Para onde você quer ir? Já guardei os outros detalhes aqui.");return;}
    setHasRoute(true);
    const issue=validatePlan(next) || (!generate(next).length ? "Reserve mais dias para acomodar as paradas e os deslocamentos." : "");
    setPreview(!issue);
    reply(issue || routeReply(next));
    if (!issue && step==="chat") updateTutorial("chat",{step:"map",draft:next,draftFor:requestPrompt ?? undefined});
  }

  function selectPreset(preset:Preset,showResult=false) {
    const next=presetPlan(preset,plan.start || undefined);
    update(next);
    setHasRoute(preset!=="custom");
    if (showResult) {setChoice("balanced");setPreview(true);}
  }

  function applySettings(change:Partial<Plan>) {
    const next={...plan,...change};
    if (setting==="dates" && (!next.start || !next.endDate || daysBetween(next.start,next.endDate)<1 || next.endDate>addMonths(next.start,24))) {
      return "Escolha um período entre 1 dia e 2 anos.";
    }
    if (setting==="budget" && (!Number.isSafeInteger(next.budget) || next.budget<0)) return "Informe um orçamento válido ou deixe o valor em branco.";
    if (setting==="preferences" && !next.stays.length) return "Escolha ao menos um tipo de hospedagem.";
    if (preview && !editMode) {
      const issue=validatePlan(next) || (!generate(next).length ? "Reserve mais dias para acomodar os deslocamentos e as paradas." : "");
      if (issue) return issue;
    }
    update(next);
    if (hasRoute) setPreview(true);
    setSetting(null);
    return "";
  }

  return <>
    {editMode && manualGuide!==undefined && <ManualRouteTutorial index={manualGuide} onNext={()=>setManualGuide(manualGuide+1)} onClose={closeManualGuide}/>}
    <TutorialCard step="chat" title="Monte um roteiro pela conversa" targets={editMode ? ["back-to-chat"] : ["chat","composer"]}
      action={!editMode && <button type="button" className="button button-small" onClick={()=>narrate(tutorialExample)} disabled={voiceActive}>Usar exemplo da Tailândia <ArrowRight size={15}/></button>}>
      {editMode ? <p>Abra <strong>Voltar à conversa</strong> para enviar seu primeiro pedido.</p>
        : <p>{conversation.length ? <>Envie um pedido na conversa ou use o exemplo da Tailândia.</> : <>Clique em <strong>Experimentar um exemplo</strong> para enviar “{tutorialExample}”</>}</p>}
    </TutorialCard>
    {routeStep && (editMode || !variant) && <TutorialCard step={routeStep} title="Retome seu roteiro de teste" targets={editMode ? ["back-to-chat"] : ["composer"]}
      action={!editMode && <button type="button" className="button button-small" onClick={()=>narrate(tutorialExample)} disabled={voiceActive}>Gerar exemplo da Tailândia <ArrowRight size={15}/></button>}>
      <p>{editMode ? "Abra Voltar à conversa para visualizar a proposta no planejador." : "Gere uma proposta na conversa para continuar."}</p>
    </TutorialCard>}
    <div className="planner-workspace" data-expanded={expanded} data-editing={editMode}>
      <section className="planner-conversation panel" aria-label="Planejar por mensagem" hidden={editMode}>
        <header className="planner-chat-head">
          <div><span className="planner-chat-mark"><MessageCircle size={20}/></span><h2 ref={chatTitle} tabIndex={-1}>Sua conversa</h2></div>
          <button className="planner-expand" type="button" aria-controls="planner-chat-body" aria-expanded={expanded}
            onClick={()=>setExpanded((value)=>!value)} aria-label={expanded ? "Reduzir conversa" : "Ampliar conversa"}>
            {expanded ? <Minimize2 size={16}/> : <Maximize2 size={16}/>} <span>{expanded ? "Reduzir" : "Ampliar"}</span>
          </button>
        </header>
        <div className="planner-chat-body" id="planner-chat-body">
          {conversation.length>0 ? <ol ref={messages} className="planner-messages" aria-label="Conversa do planejamento" role="log" aria-live="polite" aria-relevant="additions">
            {conversation.map((exchange,index)=><li key={index}><p className="planner-message">{exchange.message}</p><p className="planner-reply"><Compass size={17}/><span>{exchange.reply}</span></p></li>)}
          </ol> : <div className="planner-chat-start">
            <p>Qual destino você tem em mente?</p>
            <button className="planner-example" data-tutorial-target="chat" type="button" onClick={()=>narrate(tutorialExample)} disabled={voiceActive}><span>Experimentar um exemplo</span><strong>“{tutorialExample}”</strong><ArrowUpRight size={17}/></button>
          </div>}
          {variant && <a className="planner-chat-jump text-link" data-tutorial-target="map-open" href="#mapa-da-viagem"
            onClick={()=>{if (!tutorial?.mapOpened) updateTutorial("map",{mapOpened:true});}}>Ver rota no mapa <ArrowRight size={15}/></a>}
        </div>
        <div className="planner-write" data-tutorial-target="composer">
          <TravelComposer onSend={narrate} sendLabel="Enviar mensagem" onVoiceBusy={setVoiceActive} placeholder={conversation.length ? "Escreva sua mensagem…" : "Quero ir para…"} />
        </div>
      </section>
      {editMode ? <form className="planner-form" aria-label="Montar rota no mapa" onSubmit={(event)=>{
        event.preventDefault();
        const issue=validatePlan(plan);
        if (issue) {setError(issue);return;}
        if (!generate(plan).length) {setError("Reserve mais dias para acomodar as paradas e os deslocamentos.");return;}
        if (setPlan(plan)) {
          if (manualGuide!==undefined) closeManualGuide();
          router.push("/comparar");
        }
      }}>
        <div className="planner-section-head"><div><h2 ref={editorTitle} tabIndex={-1}>Monte sua rota no mapa</h2><p>Escolha uma origem, paradas e um destino.</p></div><button type="button" data-tutorial-target="back-to-chat" className="button button-outline button-small" onClick={()=>{if (hasRoute) setPreview(true);switchMode(false);}}><ArrowLeft size={15}/> Voltar à conversa</button></div>
        <div className="planner-modes" role="group" aria-label="Modelos de rota">{presets.map(([id,title,subtitle,Icon])=>
          <button type="button" key={id} aria-pressed={plan.preset===id} onClick={()=>{if (plan.preset!==id) selectPreset(id);}}>
            <span className="planner-mode-icon"><Icon size={19}/></span><span><strong>{title}</strong><small>{subtitle}</small></span>
          </button>)}</div>
        {plan.copiedFrom && <div className="notice"><Check size={18}/><div><strong>Modelo copiado para o planejador</strong><p>Ajuste as datas e confira as propostas.</p></div></div>}
        <PlannerRoute key={plan.preset} plan={plan} points={points} onUpdate={(next)=>{update(next);setHasRoute(true);}} onManual={setManual}/>
        <PlannerDetails plan={plan} onSetting={setSetting} withPreferences/>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="planner-actions">
          <div><strong>{plan.origin.name} → {plan.loop ? "Retorno à origem" : plan.end.name}</strong><span>{points.length} paradas · {tripDuration(plan)} · {plan.budget ? money(plan.budget,plan.currency) : "Orçamento em aberto"}</span></div>
          <button className="button" type="submit" data-tutorial-target="manual-compare">Comparar propostas <ArrowRight size={18}/></button>
        </div>
      </form> : variant ? <section aria-label="Planejamento gerado" className="planner-proposals">
        <div className="planner-section-head">
          <div><h2>{plan.origin.name} <span aria-hidden="true">→</span> {plan.loop ? "Circuito com retorno" : variant.stops.at(-1)?.city.name}</h2><p>{variant.stops.length} paradas · {tripDuration(plan)}{arrivesAtEnd(plan) ? " até a chegada" : ""}</p></div>
          <button type="button" className="button button-outline button-small" onClick={()=>switchMode(true)} disabled={voiceActive}><MapPin size={15}/> Editar rota</button>
        </div>
        <PlannerDetails plan={plan} onSetting={setSetting}/>
        <h3 className="planner-package-heading">Escolha sua proposta</h3>
        <VariantOptions variants={variants} choice={variant.id} onSelect={setChoice} compact/>
        <p className="planner-package-note">{strategies[variant.id].summary}{totals?.pending ? " "+totals.pending+(totals.pending===1 ? " item a consultar." : " itens a consultar.") : ""}{totals?.over ? " "+money(totals.over,plan.currency)+" acima do orçamento." : ""}</p>
        {!tutorial?.ticketsOpened && <TutorialCard step="tickets" title="Confira as passagens da rota" targets={["tickets"]}>
          <p>Clique em <strong>Ver todos os trechos</strong> para conferir as datas e os valores estimados de transporte.</p>
        </TutorialCard>}
        {tutorial?.ticketsReviewed && !tutorial.lodgingOpened && <TutorialCard step="tickets" title="Veja as hospedagens da rota" targets={["lodgings"]}>
          <p>Clique em <strong>Ver todas as hospedagens</strong> para encontrar onde ficar em cada parada.</p>
        </TutorialCard>}
        {!showSave && <TutorialCard step="save" title="Guarde sua viagem" targets={["save"]}>
          <p>Clique em <strong>Salvar viagem</strong>, dê um nome ao roteiro e confirme para encontrá-lo depois em Minhas viagens.</p>
        </TutorialCard>}
        <div className="planner-proposal-tools">
          <button type="button" className="button button-small" data-tutorial-target="save" onClick={()=>setShowSave(true)}>Salvar viagem <ArrowRight size={16}/></button>
        </div>
        <div className="planner-map-results">
          <TutorialCard step="map" title="Preparando o mapa da viagem" targets={tutorial?.mapOpened || tutorial?.cafesOpened ? [
            {id:"cafes-results",title:"Confira os cafés por perto",description:<p>Veja os locais ao redor da hospedagem. Depois, clique em <strong>Ir para as passagens</strong>.</p>},
            {id:"cafes",title:"Encontre cafés nesta parada",description:<p>Clique em <strong>Cafés</strong> para ver os locais no raio da hospedagem.</p>},
            {id:"nearby",title:"Veja o que tem perto de uma parada",description:<p>Clique em <strong>Arredores</strong> para aproximar o mapa e ver o que há perto da hospedagem.</p>},
          ] : [{id:"map-open",title:"Abra o mapa da viagem",description:<p>Clique em <strong>Ver rota no mapa</strong> para acompanhar as paradas desta viagem.</p>}] }>
            <p>O próximo controle será destacado assim que o mapa carregar.</p>
          </TutorialCard>
          <Itinerary key={[plan.start,plan.endDate,...points.map((place)=>place.id)].join("|")} variant={variant} mapId="mapa-da-viagem"
            bookingOptions={{
              initialSection:step==="tickets"
                ? tutorial?.lodgingOpened ? "stays" : tutorial?.ticketsOpened && !tutorial.ticketsReviewed ? "tickets" : undefined : undefined,
              onOpenSection:(section)=>{
                if (step!=="tickets") return;
                if (section==="tickets" && !tutorial?.ticketsOpened) updateTutorial("tickets",{ticketsOpened:true});
                if (section==="stays" && tutorial?.ticketsReviewed && !tutorial.lodgingOpened) updateTutorial("tickets",{lodgingOpened:true});
              },
              onChooseStay:()=>{if (step==="tickets" && tutorial?.lodgingOpened) updateTutorial("tickets",{step:"save"});},
              afterTicketHeading:tutorial?.ticketsOpened && !tutorial.ticketsReviewed && <TutorialCard step="tickets" title="Encontre cada trecho da viagem" targets={["ticket-first"]}
                action={<button type="button" className="button button-small" onClick={()=>updateTutorial("tickets",{ticketsReviewed:true})}>Ir para hospedagens <ArrowRight size={15}/></button>}>
                <p>Confira as opções abaixo. Você pode abrir o fornecedor para consultar a tarifa e a disponibilidade.</p>
              </TutorialCard>,
              afterStayHeading:tutorial?.lodgingOpened && <TutorialCard step="tickets" title="Localize sua hospedagem" targets={["stay-first"]}
                action={<button type="button" className="button button-small" onClick={()=>updateTutorial("tickets",{step:"save"})}>Ir para salvar <ArrowRight size={15}/></button>}>
                <p>Escolha uma hospedagem para aproximar a parada no mapa ou avance para salvar sua viagem.</p>
              </TutorialCard>,
            }}
            onCafes={()=>{if (!tutorial?.cafesOpened) updateTutorial("map",{cafesOpened:true});}}
            nearbyAction={step==="map" && tutorial?.cafesOpened && <button type="button" data-tutorial-focus className="button button-small" onClick={()=>updateTutorial("map",{step:"tickets"})}>Ir para as passagens <ArrowRight size={15}/></button>}/>
        </div>
      </section> : <section className="planner-map-card panel" aria-label="Prévia da rota">
        <div className="planner-section-head"><div><h2>Mapa da viagem</h2><p>{hasRoute ? "Ajuste os detalhes para visualizar a rota." : "Seu roteiro aparece aqui."}</p></div><button type="button" className="button button-small planner-map-entry" onClick={openManualMap} disabled={voiceActive}><MapPin size={16}/> Montar no mapa <ArrowRight size={14}/></button></div>
        <div className="planner-world-preview">
          <WorldPlannerMap points={hasRoute ? points : []} editable={false} />
          <a className="planner-attribution" href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth</a>
        </div>
        {hasRoute && <PlannerDetails plan={plan} onSetting={setSetting}/>}
        <div className="planner-starters" aria-label="Roteiros prontos">
          <p>Ou comece com um roteiro pronto</p>
          <div>{presets.slice(1).map(([id,title])=><button type="button" className="button button-outline button-small" key={id} onClick={()=>selectPreset(id,true)} disabled={voiceActive}>{title}<ArrowUpRight size={14}/></button>)}</div>
        </div>
      </section>}
    </div>
    {showSave && variant && <SaveDialog variant={variant} onClose={()=>setShowSave(false)}/>}
    {setting && <PlannerSettingDialog key={setting} setting={setting} plan={plan} onClose={()=>setSetting(null)} onSave={applySettings}/>}
    {manual && <CityDialog intent={manual} onClose={()=>setManual(null)} onSave={(place)=>{
      update(putRouteCity(plan,manual.field,place,manual.replaceId));
      setHasRoute(true);
      setManual(null);
    }}/>}
  </>;
}

export function Planner() {
  const params=useSearchParams();
  const {plan,owner,published,tutorial}=useLocal();
  const prompt=readPlanningDraft(params.get("rascunho")) ?? params.get("pedido");
  const requested=params.get("preset");
  const modelSlug=params.get("modelo");
  const template=[...published,...templates].find((item)=>item.slug===modelSlug);
  if (modelSlug && !template) return <Empty title="Modelo indisponível" description="Escolha um roteiro disponível no Explorar." href="/explorar" label="Explorar rotas"/>;
  const edit=params.get("editar")==="1";
  const request=prompt && !template && !edit ? parseTripRequest(prompt) : undefined;
  const guideDraft=planningTutorial(tutorial?.step) ? tutorial?.draft : undefined;
  const resume=guideDraft && !edit && !template && !requested && (!prompt || tutorial?.draftFor===prompt);
  const initial=edit && plan ? plan : template ? copyPlan(template) : resume ? guideDraft : request ? request.plan
    : presetPlan(requested==="south" || requested==="thailand" ? requested : "custom");
  const initialDestination=!!resume || (request ? request.hasDestination : !!(edit && plan || template || initial.preset!=="custom"));
  return <PlanForm initial={initial} fromMessage={!!request || !!resume} initialDestination={initialDestination} requestPrompt={prompt} key={[owner,prompt,requested,template?.slug,edit ? plan?.start : ""].join("|")}/>;
}

