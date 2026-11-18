import { Suspense } from "react";
import { Catalog } from "@/components/catalog";

export const metadata = { title: "Explorar rotas" };

export default function Page() {
  return <Suspense fallback={<p className="quiet">Carregando catálogo…</p>}><Catalog /></Suspense>;
}