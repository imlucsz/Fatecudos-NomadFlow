"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Compass, X } from "lucide-react";
import { useEffect, useId } from "react";
import { planningTutorial, tutorialSteps, type TutorialStep } from "@/lib/tutorial";
import { endTutorial, updateTutorial, useLocal } from "./local-store";
import { TutorialSpotlight } from "./tutorial-spotlight";

type Callout = string | {id:string;title:string;description:React.ReactNode};

const menuCallout={id:"menu",title:"Abra o menu",description:<p>Toque no menu destacado para encontrar a próxima opção do tutorial.</p>};

export function TutorialCard({step,title,children,action,targets=[],insideDialog=false}: {
  step:TutorialStep;title:string;children:React.ReactNode;action?:React.ReactNode;targets?:Callout[];insideDialog?:boolean;
}) {
  const {tutorial}=useLocal();
  if (tutorial?.step!==step) return null;
  const number=tutorialSteps.indexOf(step)+1;
  return <GuideCard title={title} action={action} targets={targets} insideDialog={insideDialog}
    count={"Tutorial · "+number+" de "+tutorialSteps.length} onClose={()=>endTutorial("skipped")}>{children}</GuideCard>;
}

function GuideCard({title,children,action,targets,insideDialog,count,onClose}: {
  title:string;children:React.ReactNode;action?:React.ReactNode;targets:Callout[];insideDialog?:boolean;count:string;onClose:()=>void;
}) {
  const titleId=useId();
  function content(target:string) {
    const detail=targets.find((item)=>typeof item!=="string" && item.id===target);
    const callout=detail && typeof detail!=="string" ? detail : undefined;
    return <>
      <div className="tutorial-heading">
        <span className="tutorial-icon"><Compass size={20} aria-hidden="true"/></span>
        <p className="tutorial-count" aria-live="polite">{count}</p>
        <button type="button" className="tutorial-close" aria-label="Fechar tutorial" title="Fechar tutorial" onClick={onClose}><X size={21} aria-hidden="true"/></button>
      </div>
      <div className="tutorial-body">
        <h2 id={titleId}>{callout?.title ?? title}</h2>
        {callout?.description ?? children}
      </div>
      {action && target!=="menu" && <div className="tutorial-actions">{action}</div>}
    </>;
  }
  if (insideDialog) return <section className="tutorial-card tutorial-dialog-hint" aria-labelledby={titleId}>{content("")}</section>;
  const ids=targets.map((target)=>typeof target==="string" ? target : target.id).join(" ");
  return <TutorialSpotlight targets={ids} onClose={onClose} labelledBy={titleId}>{content}</TutorialSpotlight>;
}

const manualSteps=[
  {id:"manual-origin",title:"Escolha a origem",text:"Selecione Origem. Você pode clicar num país ou usar a busca e depois escolher a cidade de saída."},
  {id:"manual-end",title:"Defina o destino",text:"Selecione Destino e escolha a cidade onde quer terminar a viagem."},
  {id:"manual-via",title:"Adicione paradas",text:"Use Adicionar parada e escolha os lugares por onde quer passar entre a origem e o destino."},
  {id:"manual-sequence",title:"Confira a sequência",text:"Veja as cidades nesta faixa. Você pode remover paradas ou fixar a ordem."},
  {id:"manual-compare",title:"Compare as propostas",text:"Quando terminar, abra Comparar propostas para ver os pacotes da rota que você montou."},
] as const;

export function ManualRouteTutorial({index,onNext,onClose}: {index:number;onNext:()=>void;onClose:()=>void}) {
  const step=manualSteps[index];
  const last=index===manualSteps.length-1;
  return <GuideCard title={step.title} targets={[step.id]} count={"Montar no mapa · "+(index+1)+" de "+manualSteps.length}
    onClose={onClose} action={<button type="button" className="button button-small" onClick={last ? onClose : onNext}>{last ? "Concluir" : "Próximo"} <ArrowRight size={15}/></button>}>
    <p>{step.text}</p>
  </GuideCard>;
}

export function TutorialNavigation() {
  const pathname=usePathname();
  const {tutorial}=useLocal();
  const step=tutorial?.step;
  const openedSavedTrip=tutorial?.step==="trips" && tutorial.openingSavedTrip && pathname==="/viagens/"+tutorial.tripId;

  useEffect(()=>{
    if (openedSavedTrip) updateTutorial("trips",{step:"explore",openingSavedTrip:undefined});
  },[openedSavedTrip]);

  if (step==="plan") return <TutorialCard step="plan" title="Sua primeira viagem começa em Planejar" targets={["plan",menuCallout]}
    action={<Link href="/planejar" className="button button-small" onClick={(event)=>{
      if (pathname==="/planejar") event.preventDefault();
      updateTutorial("plan",{step:"chat"});
    }}>Abrir Planejar <ArrowRight size={15}/></Link>}>
    <p>Clique em <strong>Planejar</strong> para montar um roteiro pela conversa e acompanhar a viagem no mapa.</p>
  </TutorialCard>;

  if (pathname!=="/planejar" && (step==="chat" || planningTutorial(step))) {
    return <TutorialCard step={step} title="Continue no planejador" targets={["plan",menuCallout]}
      action={<Link className="button button-small" href="/planejar">Voltar para Planejar <ArrowRight size={15}/></Link>}>
      <p>Abra <strong>Planejar</strong> para retomar seu roteiro de teste.</p>
    </TutorialCard>;
  }

  if (step==="trips" && pathname!=="/viagens" && !openedSavedTrip) return <TutorialCard step="trips" title="Sua viagem foi salva" targets={["trips",menuCallout]}
    action={<Link className="button button-small" href="/viagens">Abrir Minhas viagens <ArrowRight size={15}/></Link>}>
    <p>Entre em <strong>Minhas viagens</strong> pelo menu e encontre o roteiro que acabou de salvar.</p>
  </TutorialCard>;

  if (step==="explore" && pathname!=="/explorar") return <TutorialCard step="explore" title="Conheça outros roteiros" targets={["explore",menuCallout]}
    action={<Link className="button button-small" href="/explorar">Abrir Explorar <ArrowRight size={15}/></Link>}>
    <p>Vá até <strong>Explorar</strong> para encontrar roteiros prontos e rotas compartilhadas pela comunidade.</p>
  </TutorialCard>;

  return null;
}
