"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, ChevronDown, LogOut, Menu, Settings, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { accountSettingsPath } from "@/lib/account-path";
import { logout, updateTutorial, useLocal } from "./local-store";
import { ProfileAvatar } from "./profile-avatar";
import { Brand, Cta } from "./ui";

const homeLinks = [
  ["Início", "/#inicio"], ["Sobre", "/#sobre"],
  ["Como funciona", "/#perguntas"], ["Contato", "/#contato"],
] as const;
const travelLinks = [
  ["Planejar", "/planejar"], ["Minhas viagens", "/viagens"], ["Explorar", "/explorar"],
] as const;

export function SiteHeader({variant="light"}: {variant?:"light"|"home"|"banner"}) {
  const pathname=usePathname();
  const router=useRouter();
  const {active,tutorial}=useLocal();
  const [open,setOpen]=useState(false);
  const [profileOpen,setProfileOpen]=useState(false);
  const menuId=useId();
  const profileId=useId();
  const menuButton=useRef<HTMLButtonElement>(null);
  const firstLink=useRef<HTMLAnchorElement>(null);
  const profileMenu=useRef<HTMLDivElement>(null);
  const profileButton=useRef<HTMLButtonElement>(null);
  const links=variant==="home" && !active ? homeLinks : travelLinks;
  const surface=variant==="light" ? "site-width" : "site-header-glass site-header-"+variant;

  useEffect(()=>{
    if (open) firstLink.current?.focus({preventScroll:true});
  },[open]);
  useEffect(()=>{
    if (!profileOpen) return;
    function closeOutside(event:PointerEvent) {
      if (event.target instanceof Node && !profileMenu.current?.contains(event.target)) setProfileOpen(false);
    }
    document.addEventListener("pointerdown",closeOutside);
    return ()=>document.removeEventListener("pointerdown",closeOutside);
  },[profileOpen]);

  return <header className={"site-header "+surface} role="banner"
    onKeyDown={(event)=>{
      if (event.key==="Escape" && open) {setOpen(false);menuButton.current?.focus();}
    }}>
    <Brand/>
    <nav id={menuId} className="site-nav-links" aria-label="Menu principal" data-open={open}>
      {links.map(([label,href],index)=>{
        const current=pathname===href || pathname.startsWith(href+"/") || href==="/planejar" && pathname==="/comparar";
        const target=href==="/planejar" ? "plan" : href==="/viagens" ? "trips" : href==="/explorar" ? "explore" : undefined;
        return <Link href={href} key={href} ref={index===0 ? firstLink : undefined} aria-current={current ? "page" : undefined}
          data-tutorial-target={target && (target==="plan" || pathname!==href) ? target : undefined} onClick={(event)=>{
            setOpen(false);
            if (href==="/planejar" && tutorial?.step==="plan") {
              if (pathname===href) event.preventDefault();
              updateTutorial("plan",{step:"chat"});
            }
          }}>{label}</Link>;
      })}
      {!active && <Link className="site-menu-signup" href="/conta?modo=cadastro" onClick={()=>setOpen(false)}>Criar conta</Link>}
    </nav>
    <div className="site-header-account">
      {active ? <div className="site-profile" ref={profileMenu} onBlur={(event)=>{
        if (!event.currentTarget.contains(event.relatedTarget)) setProfileOpen(false);
      }} onKeyDown={(event)=>{
        if (event.key==="Escape" && profileOpen) {
          event.stopPropagation();
          setProfileOpen(false);
          profileButton.current?.focus();
        }
      }}>
        <Link href="/conta" className="site-profile-link" aria-label="Meu perfil" title="Meu perfil" aria-current={pathname==="/conta" ? "page" : undefined}
          onClick={()=>{setProfileOpen(false);setOpen(false);}}>
          <ProfileAvatar name={active.name} photo={active.avatar}/><span className="site-profile-name">{active.name.split(" ")[0]}</span>
        </Link>
        <button ref={profileButton} type="button" className="site-profile-trigger" aria-label="Menu da conta" aria-controls={profileId} aria-expanded={profileOpen}
          onClick={()=>{setOpen(false);setProfileOpen((value)=>!value);}}>
          <ChevronDown size={15} aria-hidden="true"/>
        </button>
        <div className="site-profile-dropdown" id={profileId} hidden={!profileOpen}>
          <div className="site-profile-identity"><strong>{active.name}</strong><span>{active.email}</span></div>
          <Link href={accountSettingsPath} onClick={()=>setProfileOpen(false)}><Settings size={16}/> Configurações</Link>
          <button type="button" onClick={()=>{setProfileOpen(false);logout();router.push("/");}}><LogOut size={16}/> Sair</button>
        </div>
      </div> : <>
        <Link className="site-header-outline" href="/conta" onClick={()=>setOpen(false)}>Entrar</Link>
        <Link className="button site-signup" href="/conta?modo=cadastro" onClick={()=>setOpen(false)}>Criar conta <ArrowUpRight size={17} aria-hidden="true"/></Link>
      </>}
    </div>
    <button ref={menuButton} className="site-menu-toggle" type="button" data-tutorial-target="menu" aria-label={open ? "Fechar menu" : "Abrir menu"}
      aria-controls={menuId} aria-expanded={open} onClick={()=>{setProfileOpen(false);setOpen((value)=>!value);}}>
      {open ? <X aria-hidden="true"/> : <Menu aria-hidden="true"/>}
    </button>
  </header>;
}

export function SiteFooter({compact=false}: {compact?:boolean}) {
  return <footer className={"site-footer site-width mountain-banner"+(compact ? " site-footer-compact" : "")} id="contato">
    {!compact && <div className="footer-heading">
      <h2>Pronto para cair na estrada?<br/> Transforme suas próximas<br/> ideias em uma viagem<br/> com o NomadFlow.</h2>
      <Cta href="/planejar" className="button-white">Começar agora</Cta>
    </div>}
    <div className="footer-contact">
      <div><Link href="/#perguntas">Central de ajuda</Link><Link href="/conta">Acessar perfil</Link></div>
      <nav aria-label="Atalhos">{travelLinks.map(([label,href])=><Link key={href} href={href}>{label}</Link>)}</nav>
    </div>
    <Brand footer/>
    <div className="footer-baseline">
      <span>© 2026 NomadFlow{compact && " · Demonstração"}</span><Link href="/#sobre">Sobre</Link><Link href="/#perguntas">Produto</Link>
      <Link href="/planejar">Planejar</Link><Link href="/explorar">Destinos</Link>
    </div>
  </footer>;
}

export function PageBanner({title,description,leading,action}: {title:string;description:string;leading?:React.ReactNode;action?:string|React.ReactElement}) {
  const heading=<div><h1>{title}</h1><p>{description}</p></div>;
  return <section className="flow-cover mountain-banner">
    <SiteHeader variant="banner"/>
    <div className="flow-cover-content">
      {leading ? <div className="flow-cover-intro">{leading}{heading}</div> : heading}
      {typeof action==="string" ? <Cta href="/planejar" className="button-white" onClick={()=>updateTutorial("plan",{step:"chat"})}>{action}</Cta> : action}
    </div>
  </section>;
}
