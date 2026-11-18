"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Camera, Eye, EyeOff, KeyRound, Mail, UserRound } from "lucide-react";
import { useRef, useState } from "react";
import { passwordLength } from "@/lib/local-credentials";
import { GoogleCalendarSettings } from "./google-calendar";
import { changeProfileEmail, changeProfilePassword, editProfile, logout, setRoutePrivacy, setRouteVisibility, startTutorial, useLocal } from "./local-store";
import { ProfileAvatar } from "./profile-avatar";

async function preparePhoto(file:File) {
  if (!["image/jpeg","image/png","image/webp"].includes(file.type) || file.size>8_000_000) {
    throw new Error("Escolha uma foto JPG, PNG ou WebP de até 8 MB.");
  }
  const url=URL.createObjectURL(file);
  try {
    const image=new Image();
    image.src=url;
    await image.decode();
    const side=Math.min(image.naturalWidth,image.naturalHeight);
    const canvas=document.createElement("canvas");
    canvas.width=canvas.height=256;
    const context=canvas.getContext("2d");
    if (!context || !side) throw new Error("Imagem inválida");
    context.drawImage(image,(image.naturalWidth-side)/2,(image.naturalHeight-side)/2,side,side,0,0,256,256);
    return canvas.toDataURL("image/webp",.86);
  } catch {
    throw new Error("Não foi possível abrir essa foto. Escolha outra imagem.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

type Feedback = {message:string;error?:boolean};

function FormFeedback({feedback}: {feedback?:Feedback}) {
  if (!feedback) return null;
  return <p className={feedback.error ? "form-error" : "settings-confirmation"} role={feedback.error ? "alert" : "status"}>{feedback.message}</p>;
}

function ProfileSettings({owner,initialName,initialAvatar}: {owner:string;initialName:string;initialAvatar?:string}) {
  const [name,setName]=useState(initialName);
  const [avatar,setAvatar]=useState(initialAvatar);
  const [preparing,setPreparing]=useState(false);
  const [feedback,setFeedback]=useState<Feedback>();
  const photoInput=useRef<HTMLInputElement>(null);
  return <section id="perfil" className="settings-section panel" aria-labelledby="settings-profile-title">
    <div className="settings-title"><UserRound size={20}/><div><h2 id="settings-profile-title">Perfil</h2><p>Escolha o nome e a foto que aparecem em Meu perfil.</p></div></div>
    <form className="settings-form" onSubmit={(event)=>{
      event.preventDefault();
      const error=editProfile(owner,name,avatar);
      setFeedback({message:error || "Perfil atualizado.",error:!!error});
    }}>
      <div className="settings-picture">
        <ProfileAvatar name={name} photo={avatar}/>
        <div>
          <input ref={photoInput} hidden type="file" accept="image/jpeg,image/png,image/webp" aria-label="Foto de perfil" onChange={async (event)=>{
            const file=event.currentTarget.files?.[0];
            event.currentTarget.value="";
            if (!file) return;
            setPreparing(true);
            setFeedback(undefined);
            try {
              setAvatar(await preparePhoto(file));
            } catch (error) {
              setFeedback({message:error instanceof Error ? error.message : "Escolha outra foto.",error:true});
            } finally {setPreparing(false);}
          }}/>
          <button type="button" className="button button-outline button-small" disabled={preparing} onClick={()=>photoInput.current?.click()}><Camera size={15}/> {avatar ? "Trocar foto" : "Adicionar foto"}</button>
          {avatar && <button type="button" className="text-link" disabled={preparing} onClick={()=>{setAvatar(undefined);setFeedback(undefined);}}>Remover foto</button>}
        </div>
      </div>
      <label>Nome do perfil<input autoComplete="name" value={name} required maxLength={66} onChange={(event)=>{setName(event.target.value);setFeedback(undefined);}}/></label>
      <FormFeedback feedback={feedback}/>
      <button type="submit" className="button button-small" disabled={preparing}>Salvar perfil</button>
    </form>
  </section>;
}

function SignInSettings({owner,email,hasPassword}: {owner:string;email:string;hasPassword:boolean}) {
  const [emailFeedback,setEmailFeedback]=useState<Feedback>();
  const [passwordFeedback,setPasswordFeedback]=useState<Feedback>();
  const [busy,setBusy]=useState<"email"|"password">();
  return <section id="conta" className="settings-section panel" aria-labelledby="settings-account-title">
    <div className="settings-title"><KeyRound size={20}/><div><h2 id="settings-account-title">Conta e segurança</h2><p>Gerencie os dados de acesso do seu perfil neste navegador.</p></div></div>
    <div className="settings-security">
      <form className="settings-form" aria-label="Alterar e-mail" onSubmit={async (event)=>{
        event.preventDefault();
        if (busy) return;
        const form=event.currentTarget;
        const data=new FormData(form);
        setBusy("email");
        setEmailFeedback(undefined);
        try {
          const error=await changeProfileEmail(owner,String(data.get("email")),String(data.get("password") ?? ""));
          setEmailFeedback({message:error || "E-mail atualizado.",error:!!error});
          if (!error) {
            const password=form.elements.namedItem("password") as HTMLInputElement | null;
            if (password) password.value="";
          }
        } catch {
          setEmailFeedback({message:"Não foi possível atualizar o e-mail. Tente novamente.",error:true});
        } finally {setBusy(undefined);}
      }}>
        <h3><Mail size={17}/> E-mail de acesso</h3>
        <label>Novo e-mail<input name="email" type="email" autoComplete="email" required defaultValue={email} maxLength={254}/></label>
        {hasPassword && <label>Senha atual<input name="password" type="password" autoComplete="current-password" required maxLength={passwordLength.max}/></label>}
        <FormFeedback feedback={emailFeedback}/>
        <button type="submit" className="button button-small" disabled={!!busy}>Salvar e-mail</button>
      </form>
      <form className="settings-form" aria-label="Alterar senha" onSubmit={async (event)=>{
        event.preventDefault();
        if (busy) return;
        const form=event.currentTarget;
        const data=new FormData(form);
        const password=String(data.get("new-password"));
        if (password!==data.get("confirm-password")) {setPasswordFeedback({message:"As senhas precisam ser iguais.",error:true});return;}
        setBusy("password");
        setPasswordFeedback(undefined);
        try {
          const error=await changeProfilePassword(owner,String(data.get("current-password") ?? ""),password);
          setPasswordFeedback({message:error || "Senha salva.",error:!!error});
          if (!error) form.reset();
        } catch {
          setPasswordFeedback({message:"Não foi possível salvar a senha. Tente novamente.",error:true});
        } finally {setBusy(undefined);}
      }}>
        <h3><KeyRound size={17}/> {hasPassword ? "Alterar senha" : "Definir senha"}</h3>
        {hasPassword && <label>Senha atual<input name="current-password" type="password" autoComplete="current-password" required maxLength={passwordLength.max}/></label>}
        <label>Nova senha<input name="new-password" type="password" autoComplete="new-password" required minLength={passwordLength.min} maxLength={passwordLength.max} placeholder="Pelo menos 8 caracteres"/></label>
        <label>Confirmar nova senha<input name="confirm-password" type="password" autoComplete="new-password" required minLength={passwordLength.min} maxLength={passwordLength.max}/></label>
        <FormFeedback feedback={passwordFeedback}/>
        <button type="submit" className="button button-small" disabled={!!busy}>Salvar senha</button>
      </form>
    </div>
  </section>;
}

function PrivacySwitch({label,visible,state,onToggle}: {label:string;visible:boolean;state:string;onToggle:()=>void}) {
  return <button type="button" role="switch" className="settings-switch" aria-label={label} aria-checked={visible} onClick={onToggle}>
    <span aria-hidden="true" className="settings-switch-state">{state}</span>
    <span aria-hidden="true" className="settings-switch-track"/>
  </button>;
}

function PrivacySettings() {
  const {hidePublishedRoutes,ownedModels}=useLocal();
  return <section id="privacidade" className="settings-section panel" aria-labelledby="settings-privacy-title">
    <div className="settings-title"><Eye size={20}/><div><h2 id="settings-privacy-title">Privacidade das rotas</h2><p>Escolha quais modelos aparecem no Explorar. As viagens e os salvos do seu perfil ficam no seu espaço.</p></div></div>
    <div className="settings-visibility">
      <strong>Permitir publicação no Explorar</strong>
      <PrivacySwitch label="Permitir publicação no Explorar" visible={!hidePublishedRoutes} state={hidePublishedRoutes ? "Tudo privado" : "Por roteiro"}
        onToggle={()=>setRoutePrivacy(!hidePublishedRoutes)}/>
    </div>
    {hidePublishedRoutes && <p className="settings-privacy-note" role="status"><EyeOff size={15}/> Todos os roteiros estão ocultos. As escolhas por roteiro valem quando a publicação for reativada.</p>}
    {ownedModels.length>0 && <ul className="settings-models">{ownedModels.map((model)=>{
      const visible=model.visibility!=="private";
      return <li key={model.slug}>
        <strong>{model.title}</strong>
        <PrivacySwitch label={"Publicar roteiro "+model.title} visible={visible} state={visible ? "Pública" : "Privada"}
          onToggle={()=>setRouteVisibility(model.slug,visible ? "private" : "public")}/>
      </li>;
    })}</ul>}
  </section>;
}

export function AccountSettings() {
  const {active,hasPassword,tutorial,profiles}=useLocal();
  const router=useRouter();
  if (!active) return null;
  return <div className="account-settings">
    <header className="settings-header">
      <Link href="/conta" className="text-link"><ArrowLeft size={16}/> Meu perfil</Link>
      <h1>Configurações</h1>
    </header>
    <div className="settings-layout">
      <nav className="settings-nav" aria-label="Seções das configurações">
        <a href="#perfil">Perfil</a><a href="#conta">Conta e segurança</a><a href="#privacidade">Privacidade</a><a href="#integracoes">Integrações</a>
      </nav>
      <div className="settings-content">
        <ProfileSettings owner={active.id} initialName={active.name} initialAvatar={active.avatar}/>
        <SignInSettings owner={active.id} email={active.email} hasPassword={hasPassword}/>
        <PrivacySettings/>
        <section id="integracoes" className="settings-section panel" aria-labelledby="settings-integrations-title">
          <h2 id="settings-integrations-title">Integrações</h2>
          <GoogleCalendarSettings/>
        </section>
        <div className="settings-shortcuts">
          {(!tutorial || tutorial.step==="complete" || tutorial.step==="skipped") &&
            <button type="button" className="text-link" onClick={()=>{startTutorial();router.push("/viagens");}}>Ver tutorial <ArrowUpRight size={14}/></button>}
          {profiles.length>1 && <button type="button" className="text-link" onClick={()=>{logout();router.push("/conta");}}>Trocar de perfil <ArrowUpRight size={14}/></button>}
        </div>
      </div>
    </div>
  </div>;
}
