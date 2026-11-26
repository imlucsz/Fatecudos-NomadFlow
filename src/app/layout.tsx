import type { Metadata } from "next";
import "@fontsource-variable/dm-sans";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { LocalProvider } from "@/components/local-store";
import { GoogleCalendarProvider } from "@/components/google-calendar";

export const metadata: Metadata = {
  title: { default: "NomadFlow — Planeje sua próxima viagem", template: "%s | NomadFlow" },
  description: "Planeje, compare e acompanhe suas viagens de longa duração com o NomadFlow.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR" data-scroll-behavior="smooth"><body><LocalProvider><GoogleCalendarProvider>{children}</GoogleCalendarProvider></LocalProvider></body></html>;
}
