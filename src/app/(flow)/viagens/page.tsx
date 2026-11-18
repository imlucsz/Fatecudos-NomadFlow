import { MyTrips } from "@/components/catalog";
import { ProfileGate } from "@/components/profile-gate";

export const metadata = { title: "Minhas viagens" };

export default function Page() {
  return <ProfileGate><MyTrips /></ProfileGate>;
}
