import { TemplatePage } from "@/components/catalog";

export const metadata = { title: "Modelo de rota" };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <TemplatePage slug={slug} />;
}