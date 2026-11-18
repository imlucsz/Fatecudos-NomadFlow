import { Compare } from "@/components/compare";
import { ProfileGate } from "@/components/profile-gate";

export const metadata = { title: "Comparar propostas" };

export default function Page() {
  return <ProfileGate><Compare /></ProfileGate>;
}
