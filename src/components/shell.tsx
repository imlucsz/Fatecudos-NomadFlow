"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Compass } from "lucide-react";
import { Suspense, useState } from "react";
import { accountPath, accountSettingsPath, returnAfterLogin } from "@/lib/account-path";
import { passwordLength } from "@/lib/local-credentials";
import { login, useLocal } from "./local-store";
import { PageBanner, SiteFooter, SiteHeader } from "./site-chrome";
import { TutorialNavigation } from "./tutorial";
import { Media } from "./ui";
import { AccountSettings } from "./account-settings";
import { ProfileBanner, TravelerProfile } from "./traveler-profile";

const pageBanners:Partial<Record<string,React.ComponentProps<typeof PageBanner>>> = {
  "/planejar": {title:"Para onde vamos?",description:"Conte seu destino por texto ou voz. Você pode acertar os detalhes depois."},
  "/viagens": {title:"Minhas viagens.",description:"Abra uma viagem para ver o mapa, as passagens, as hospedagens e a agenda.",action:"Planejar viagem"},
  "/explorar": {title:"Encontre seu próximo roteiro.",description:"Escolha um roteiro pronto e adapte as paradas, as datas e o orçamento.",action:"Montar minha rota"},
};

export function AppShell({children}: {children:React.ReactNode}) {
  const pathname=usePathname();
  const {active}=useLocal();
  if (pathname==="/conta" && active) {
    return <Suspense fallback={<AppFrame wide>{children}</AppFrame>}><AccountFrame>{children}</AccountFrame></Suspense>;
  }
  const banner=active || pathname==="/explorar" ? pageBanners[pathname] : undefined;
  const wide=/^\/(planejar|comparar|viagens|explorar)(\/|$)/.test(pathname);
  return <AppFrame wide={wide} banner={banner && <PageBanner key={pathname} {...banner}/>}>{children}</AppFrame>;
}

function AccountFrame({children}: {children:React.ReactNode}) {
  const settings=useSearchParams().get("aba")==="configuracoes";
  return <AppFrame wide banner={!settings && <ProfileBanner/>}>{children}</AppFrame>;
}

function AppFrame({children,wide,banner}: {children:React.ReactNode;wide:boolean;banner?:React.ReactNode}) {
  const {tutorial}=useLocal();
  return <div className="app-shell" data-banner={!!banner} data-wide={wide} data-tutorial-step={tutorial?.step}>
    {!banner && <div className="app-header"><SiteHeader/></div>}
    <main className="app-main site-width">
      {banner}
      <TutorialNavigation/>
      {children}
    </main>
    <SiteFooter compact/>
  </div>;
}

export function Account() {
  const params = useSearchParams();
  const {active,ready}=useLocal();
  const create = params.get("modo") === "cadastro";
  const settings = params.get("aba")==="configuracoes";
  const next = params.get("voltar");
  if (!ready) return <p className="quiet" role="status">Carregando perfil…</p>;
  if (active) return settings ? <AccountSettings key={active.id}/> : <TravelerProfile key={active.id}/>;
  return <AccountAccess create={create} next={next} after={settings ? accountSettingsPath : returnAfterLogin(next)} key={String(create)}/>;
}

function AccountAccess({create,next,after}: {create:boolean;next:string|null;after:string}) {
  const router=useRouter();
  const [email,setEmail] = useState("");
  const [name,setName] = useState("");
  const [password,setPassword] = useState("");
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(false);
  return <div className="account-layout">
    <div className="account-card">
      <h1>{create ? "Crie seu perfil." : "Bem-vindo de volta."}</h1>
      <p className="account-description">{create ? "Crie um perfil para planejar e salvar seus roteiros." : "Entre para continuar de onde parou."}</p>
      <form className="account-fields" onSubmit={async (event)=>{
        event.preventDefault();
        if (loading) return;
        setLoading(true);
        setError("");
        try {
          const result=await login(name,email,create,password);
          setError(result);
          if (!result) router.replace(after);
        } catch {
          setError("Não foi possível acessar o perfil. Tente novamente.");
        } finally {setLoading(false);}
      }}>
        {create && <label>Nome<input type="text" required value={name} onChange={(event)=>setName(event.target.value)} autoComplete="name" maxLength={66} placeholder="Como podemos chamar você?"/></label>}
        <label>E-mail<input required type="email" value={email} onChange={(event)=>setEmail(event.target.value)} autoComplete="email" maxLength={254} placeholder="voce@exemplo.com"/></label>
        <label>Senha {create && <small>(opcional na demonstração)</small>}<input type="password" value={password} onChange={(event)=>setPassword(event.target.value)}
          autoComplete={create ? "new-password" : "current-password"} minLength={create ? passwordLength.min : undefined} maxLength={passwordLength.max} placeholder={create ? "Pelo menos 8 caracteres" : "Sua senha, se já definida"}/></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button account-submit" type="submit" disabled={loading}>{loading ? "Aguarde…" : create ? "Criar perfil" : "Entrar"} <ArrowRight size={18}/></button>
      </form>
      <p className="account-switch">{!create && "Primeira vez aqui?"} <Link className="text-link" href={accountPath(next,!create)}>{create ? "Já tenho um perfil" : "Criar perfil local"}</Link></p>
      <p className="quiet account-local">Seu perfil e suas viagens ficam neste navegador.</p>
    </div>
    <div className="account-photo">
      <Media name="hero" eager/>
      <p className="account-caption"><Compass size={19} aria-hidden="true"/> O mundo é seu próximo endereço.</p>
    </div>
  </div>;
}
