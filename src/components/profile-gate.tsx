"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowUpRight, LockKeyhole } from "lucide-react";
import { Suspense } from "react";
import { accountPath } from "@/lib/account-path";
import { useLocal } from "./local-store";

function SignInRequired() {
  const path = usePathname();
  const query = useSearchParams().toString();
  const next = path+(query ? "?"+query : "");
  const trips = path.startsWith("/viagens");
  return <section className="profile-gate panel">
    <span className="eyebrow"><LockKeyhole size={15}/> Conta NomadFlow</span>
    <h1>{trips ? "Entre para ver suas viagens." : "Entre para planejar sua viagem."}</h1>
    <p>{trips ? "Acesse seu perfil para ver os roteiros salvos e acompanhar suas paradas." : "Entre na sua conta para gerar e salvar propostas personalizadas."}</p>
    <div className="gate-actions">
      <Link className="button" href={accountPath(next)}>Entrar para continuar <ArrowUpRight size={17}/></Link>
      <Link className="button button-outline" href={accountPath(next,true)}>Criar perfil</Link>
    </div>
    <Link className="text-link" href="/explorar">Explorar rotas de exemplo <ArrowUpRight size={15}/></Link>
  </section>;
}

const loading = <p className="quiet" role="status">Carregando perfil…</p>;

export function ProfileGate({children}: {children:React.ReactNode}) {
  const {active,ready} = useLocal();
  if (!ready) return loading;
  if (!active) return <Suspense fallback={loading}><SignInRequired/></Suspense>;
  return children;
}