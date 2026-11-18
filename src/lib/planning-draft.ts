const keyPrefix = "nomadflow-planning-draft:";
const draftIdPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;
let memoryDraft: { id: string; request: string } | undefined;

export function plannerDraftPath(value: string) {
  const request = value.trim().slice(0, 1200);
  if (!request) return "/planejar";

  const id = window.crypto.randomUUID();
  try {
    window.sessionStorage.setItem(keyPrefix + id, request);
  } catch {
    memoryDraft = { id, request };
  }
  return "/planejar?rascunho=" + id;
}

export function readPlanningDraft(id: string | null) {
  if (typeof window === "undefined" || !id || !draftIdPattern.test(id)) return null;
  if (memoryDraft?.id === id) return memoryDraft.request;
  try {
    return window.sessionStorage.getItem(keyPrefix + id)?.slice(0, 1200) ?? null;
  } catch {
    return null;
  }
}
