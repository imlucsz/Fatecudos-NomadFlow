"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Minus, Plus, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { accountPath } from "@/lib/account-path";
import { templates, type Template } from "@/lib/destinations";
import { money } from "@/lib/planning";
import { plannerDraftPath } from "@/lib/planning-draft";
import { HeroVideo } from "./hero-video";
import { TravelComposer } from "./travel-composer";
import { useLocal } from "./local-store";
import { SiteFooter, SiteHeader } from "./site-chrome";
import { Cta, Media, Modal } from "./ui";

const shortcuts = [
  ["Criar uma viagem",""], ["Inspire meu próximo destino","/explorar"], ["Planejar uma road trip","Quero fazer uma road trip pela Jordânia, de Amã até Petra."], ["Planejar uma escapada","Planeje 5 dias em Lisboa, saindo de São Paulo."],
];
const themes = ["Amã","Provença","Wadi Rum","Toscana","Roma"];
const questions = [
  ["O que é o NomadFlow?","O NomadFlow é seu planejador de viagens de longa duração. Monte um itinerário com deslocamentos, hospedagem, lugares para trabalhar e passeios, ajuste tudo ao seu ritmo e acompanhe cada parada."],
  ["Como o NomadFlow funciona?","Informe a origem, os destinos, as datas e o orçamento. Compare as propostas, explore as paradas no mapa e salve sua favorita para editar e acompanhar."],
  ["O NomadFlow pode me ajudar a economizar?","Compare custos de transporte, hospedagem e despesas do dia a dia. Você pode simular uma troca de passagem ou hospedagem e ver a diferença no orçamento antes de salvar."],
  ["Quantos dias posso incluir na minha viagem?","Planeje escapadas ou viagens de até 24 meses. Você pode definir as datas manualmente e ajustar a duração de cada parada depois."],
  ["Posso planejar uma viagem em família?","Sim. Indique o número de viajantes e filtre os tipos de hospedagem. As estimativas levam em conta o grupo e a unidade de cada diária."],
];
const stories = [
  {name:"Marina R.",type:"Viagem em família · Exemplo",portrait:"portrait-a",image:"hikers",cards:["mountains","hikers","travel-bus"],text:"Reuni trilhas, hospedagem e paradas em um roteiro só. Quando o tempo virou, ajustei as datas da viagem."},
  {name:"Yasmin L.",type:"Nômade · Exemplo",portrait:"portrait-b",image:"bridge",cards:["petra","rome","bridge"],text:"Viajando sozinha, encontrei cafés para trabalhar, lugares para conhecer e experiências que eu não tinha previsto no meu roteiro."},
  {name:"André M.",type:"Viagem longa · Exemplo",portrait:"portrait-c",image:"pagoda",cards:["hikers","lagoon","pagoda"],text:"Organizei os check-ins de uma viagem de meses e coloquei um lembrete para consultar a próxima passagem."},
];
const titleLines = ["Quem tem boca vai a Roma.", "Quem tem Nomadflow vai muito além."] as const;
const sentenceBreak = titleLines[0].length;
const titleLength = sentenceBreak + titleLines[1].length;

function HeroTitle() {
  const [step,setStep] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? titleLength : 0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let nextStep = 0;
    let timer = window.setTimeout(advance,110);
    function advance() {
      nextStep += 1;
      setStep(nextStep);
      if (nextStep === titleLength) return;
      timer = window.setTimeout(advance,nextStep===sentenceBreak ? 420 : 45);
    }
    return () => window.clearTimeout(timer);
  },[]);
  return <div className="hero-message" data-complete={step===titleLength}>
    <h1 aria-label={titleLines.join(" ")}>
      {titleLines.map((line,index)=>{
        const visible=Math.max(0,step-(index===0 ? 0 : sentenceBreak));
        return <span className="hero-title-line" aria-hidden="true" key={line}>
          {line.slice(0,visible)}<span className="hero-title-pending">{line.slice(visible)}</span>
        </span>;
      })}
    </h1>
    <p className="hero-tagline">seu guia de viagens</p>
  </div>;
}

function Story({index}: {index:number}) {
  const story = stories[index];
  return <article className={"story story-"+index}>
    <div className="story-person"><Media name={story.portrait}/><div><h3>{story.name}</h3><span>{story.type}</span></div></div>
    <Media className="story-image" name={story.image}/>
    <div className="story-postcards" aria-hidden="true">
      {story.cards.map((photo) => <Media key={photo} name={photo}/>)}
    </div>
    <p>{story.text}</p>
  </article>;
}

function FeatureCard({item,index}: {item:Template;index:number}) {
  return <article className={"feature-card feature-card-"+index}>
    <Link href={"/explorar/"+item.slug} className="feature-photo" aria-label={"Abrir "+item.title}><Media name={item.image}/></Link>
    <div className="feature-content">
      <div className="feature-top"><h3><Link href={"/explorar/"+item.slug}>{item.title}</Link></h3><span className="price-pill">{item.price === null ? "Sob consulta" : money(item.price,item.currency,true)}</span></div>
      <div className="feature-meta"><span>{item.days} dias</span><span>{new Set([item.origin,...item.sequence,item.end].map((place) => place.id)).size} cidades</span><span>Rota modelo</span></div>
      <p>{item.description}</p>
      {index === 1 && <Cta href={"/explorar/"+item.slug} className="feature-explore">Explorar</Cta>}
    </div>
  </article>;
}

export function Landing() {
  const router = useRouter();
  const {active}=useLocal();
  const [openFaq,setOpenFaq] = useState<number|null>(0);
  const [showStories,setShowStories] = useState(false);
  const [signInRequest,setSignInRequest]=useState<{message:string;next:string}|null>(null);
  function requestAccess(message:string) {
    setSignInRequest({message,next:plannerDraftPath(message)});
  }
  function submit(value:string):void|false {
    if (!active) {
      requestAccess(value);
      return false;
    }
    router.push(plannerDraftPath(value));
  }
  return <div className="landing">
    <main>
    <section className="hero" id="inicio" aria-label="Planejador de viagens">
      <HeroVideo/>
      <div className="hero-inner site-width">
        <SiteHeader variant="home"/>
        <div className="hero-copy">
          <span className="hero-kicker"><span aria-hidden="true">✦</span> Um roteiro feito para você.</span>
          <HeroTitle/>
          <Cta href="/planejar" className="button-white hero-cta">Planejar viagem</Cta>
        </div>
        <aside className="hero-feature">
          <div className="hero-feature-photo"><Media name="travel-bus" alt="Ônibus azul numa estrada de montanha" eager/><span>Roteiros personalizados</span></div>
          <p>Sua viagem em minutos,<br/> no seu ritmo.</p><small>Da primeira parada à próxima.</small>
          <Link href="/planejar"><Send size={12}/> Planejar roteiro</Link>
          <Link href="/explorar" aria-label="Explorar roteiros"><ArrowUpRight size={13}/></Link>
        </aside>
        <div className="hero-composer">
          <TravelComposer onSend={submit} onTextAccess={active ? undefined : requestAccess} hideAttachment
            placeholder="Planeje uma viagem romântica de 5 dias para Roma" sendLabel="Abrir planejador">
            <div className="composer-shortcuts">{shortcuts.map(([label,value]) => <button key={label} onClick={() => value.startsWith("/") ? router.push(value) : submit(value)}><span aria-hidden="true">✦</span> {label}</button>)}</div>
          </TravelComposer>
        </div>
      </div>
    </section>
    <section className="site-width feature-section" id="roteiros">
      <div className="landing-heading">
        <h2>Encontre a direção certa<br/> para a sua próxima viagem</h2>
        <p>Explore roteiros prontos, compare as possibilidades e descubra por onde começar. Leve seu trabalho junto e faça o caminho no seu ritmo.</p>
      </div>
      <div className="feature-themes" aria-label="Buscar destinos">{themes.map((theme) => <Link href={"/explorar?destino="+encodeURIComponent(theme)} key={theme}>{theme}</Link>)}</div>
      <div className="feature-grid">{templates.slice(0,3).map((item,index) => <FeatureCard item={item} index={index} key={item.slug}/>)}</div>
    </section>
    <section className="site-width story-section" id="sobre">
      <div className="landing-heading">
        <h2>Para quem explora<br/> o mundo inteiro</h2>
        <p>Veja como o NomadFlow ajuda a organizar diferentes estilos de viagem, de férias em família a meses trabalhando na estrada.</p>
      </div>
      <div className="story-grid"><Story index={0}/><div className="story-middle"><Story index={1}/><button className="story-all" onClick={() => setShowStories(true)}>Ver todos <ArrowUpRight size={17}/></button></div><Story index={2}/></div>
    </section>
    <section className="landing-faq" id="perguntas">
      <h2>Perguntas frequentes</h2>
      <div>{questions.map(([question,answer],index) => <div className={"faq-row"+(openFaq === index ? " faq-open" : "")} key={question}>
        <button className="faq-toggle" type="button" aria-expanded={openFaq === index} aria-controls={"faq-"+index} onClick={() => setOpenFaq(openFaq === index ? null : index)}>{question}<span>{openFaq === index ? <Minus size={14}/> : <Plus size={14}/>}</span></button>
        <p id={"faq-"+index} hidden={openFaq !== index}>{answer}</p>
      </div>)}</div>
    </section>
    </main>
    <SiteFooter/>
    {!active && signInRequest && <Modal title={signInRequest.message ? "Seu pedido está pronto" : "Entre para planejar sua viagem"}
      className="hero-request-dialog" onClose={()=>setSignInRequest(null)}>
      <div className="stack">
        {signInRequest.message && <blockquote className="notice">{signInRequest.message}</blockquote>}
        <p className="quiet">{signInRequest.message ? "Entre para montar a rota com esse pedido." : "Você também pode ditar seu pedido pelo microfone antes de entrar."}</p>
        <div className="gate-actions">
          <Cta href={accountPath(signInRequest.next)}>{signInRequest.message ? "Entrar para ver minha rota" : "Entrar"}</Cta>
          <Link className="button button-outline" href={accountPath(signInRequest.next,true)}>Criar conta</Link>
        </div>
      </div>
    </Modal>}
    {showStories && <Modal title="Histórias de viagem" onClose={() => setShowStories(false)} wide><div className="stories-modal">{stories.map((story,index) => <Story index={index} key={story.name}/>)}</div></Modal>}
  </div>;
}
