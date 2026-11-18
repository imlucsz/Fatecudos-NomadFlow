import { redirect } from "next/navigation";
import { TripPage } from "@/components/trip";
import { ProfileGate } from "@/components/profile-gate";

export const metadata = { title: "Minha viagem" };

export default async function Page({ params,searchParams }: {
  params: Promise<{ id: string; section?: string[] }>;searchParams:Promise<{reserva?:string|string[]}>;
}) {
  const { id, section } = await params;
  if (section?.[0]==="reservas") redirect("/viagens/"+encodeURIComponent(id));
  const {reserva}=section?.[0]==="agenda" ? await searchParams : {reserva:undefined};
  return <ProfileGate><TripPage id={id} section={section?.[0]} reservation={typeof reserva==="string" ? reserva : undefined}/></ProfileGate>;
}
