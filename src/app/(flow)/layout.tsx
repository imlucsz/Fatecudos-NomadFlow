import { AppShell } from "@/components/shell";

export default function FlowLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}