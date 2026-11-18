"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";
import { accountPath } from "@/lib/account-path";
import type { Template } from "@/lib/destinations";
import { toggleSavedRoute, useLocal } from "./local-store";

export function RouteBookmark({item}: {item:Template}) {
  const {active,savedRoutes}=useLocal();
  const saved=savedRoutes.includes(item.slug);
  const label=(saved ? "Remover dos salvos: " : "Salvar roteiro: ")+item.title;
  const icon=<Bookmark size={16} fill={saved ? "currentColor" : "none"} aria-hidden="true"/>;
  if (!active) return <Link href={accountPath("/explorar/"+item.slug)} className="catalog-star route-bookmark" aria-label={"Entre para salvar: "+item.title} title="Entrar para salvar">{icon}</Link>;
  return <button type="button" className="catalog-star route-bookmark" aria-pressed={saved} aria-label={label}
    title={saved ? "Remover dos salvos" : "Salvar roteiro"} onClick={()=>toggleSavedRoute(item.slug)}>{icon}</button>;
}
