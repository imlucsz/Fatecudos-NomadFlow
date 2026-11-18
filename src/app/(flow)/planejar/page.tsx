import { Suspense } from "react";
import { Planner } from "@/components/planner";
import { ProfileGate } from "@/components/profile-gate";

export const metadata = { title: "Planejar" };

export default function Page() {
  return <ProfileGate><Suspense fallback={<p className="quiet">Carregando planejador…</p>}><Planner /></Suspense></ProfileGate>;
}
