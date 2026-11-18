import { Suspense } from "react";
import { Account } from "@/components/shell";

export const metadata = { title: "Conta e perfil" };

export default function Page() {
  return <Suspense fallback={<p className="quiet">Carregando perfil…</p>}><Account /></Suspense>;
}
