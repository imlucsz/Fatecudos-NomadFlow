export const accountSettingsPath="/conta?aba=configuracoes";

export function returnAfterLogin(value: string | null) {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/viagens";
  try {
    const url = new URL(value,"https://nomadflow.local");
    const allowed = /^\/(?:planejar|comparar|explorar(?:\/[a-z0-9-]+)?|viagens(?:\/[a-z0-9-]+(?:\/(?:reservas|agenda))?)?)$/;
    if (url.origin === "https://nomadflow.local" && allowed.test(url.pathname)) return url.pathname+url.search;
  } catch {}
  return "/viagens";
}

export function accountPath(next: string | null, create = false) {
  const query = new URLSearchParams();
  if (create) query.set("modo","cadastro");
  if (next) query.set("voltar",returnAfterLogin(next));
  return "/conta"+(query.size ? "?"+query.toString() : "");
}
