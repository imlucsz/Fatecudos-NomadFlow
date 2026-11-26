import { readWorkspace, writeWorkspace } from "./browser-database";
import { makeLocalPassword, matchesLocalPassword, passwordLength, type LocalPassword } from "./local-credentials";
import type { Plan, Trip } from "./planning";
import { templates, type Template } from "./destinations";
import { publishTrip } from "./publishing";
import { planningTutorial, type TutorialProgress, type TutorialStep } from "./tutorial";

type Profile = { id: string; name: string; email: string; avatar?: string };
type Workspace = { trips: Trip[]; plan?: Plan; tutorial?: TutorialProgress; hidePublishedRoutes?:boolean; savedRoutes?:string[]; manualMapSeen?:boolean };
type RouteActivity = {stars:string[];uses:string[]};
type State = { active: Profile | null; profiles: Profile[]; workspaces: Record<string, Workspace>; published: Template[]; routeActivity?:Record<string,RouteActivity>; passwords?:Record<string,LocalPassword>; passwordless?:string[]; schemaVersion:number; revision:number; updatedAt:string };
const key = "nomadflow-local-v1";
const schemaVersion=2;
const empty: State = { active:null,profiles:[],workspaces:{},published:[],passwordless:[],schemaVersion,revision:0,updatedAt:"" };
const emptyWorkspace: Workspace = { trips:[] };
const emptyActivity:RouteActivity = {stars:[],uses:[]};
const emptySaved:string[] = [];
let state = empty;
let loaded = false;
let restoring = false;
let restored = false;
let persistence = Promise.resolve(true);
let persistenceIssue:string|undefined;
const listeners = new Set<() => void>();

function setPersistenceIssue(issue:string|undefined) {
  if (persistenceIssue===issue) return;
  persistenceIssue=issue;
  for (const notify of listeners) notify();
}

function migrateState(value: unknown): State {
  if (value==null) return empty;
  const input=(value && typeof value==="object" ? value : {}) as Partial<State>;
  const profiles=Array.isArray(input.profiles) ? input.profiles : [];
  const passwords=input.passwords && typeof input.passwords==="object" ? input.passwords : {};
  const passwordless=input.passwordless ?? profiles.filter((profile)=>!passwords[profile.id]).map((profile)=>profile.id);
  return {...empty,...input,profiles,workspaces:input.workspaces ?? {},published:Array.isArray(input.published) ? input.published : [],passwords,passwordless,schemaVersion,revision:Number.isSafeInteger(input.revision) ? input.revision! : 0,updatedAt:typeof input.updatedAt==="string" ? input.updatedAt : ""};
}

async function verifyProfileAccess(state:State,id:string,password:string) {
  const credential=state.passwords?.[id];
  if (credential) return matchesLocalPassword(password,credential);
  return state.passwordless?.includes(id) ?? false;
}

function snapshot() {
  if (!loaded && typeof window !== "undefined") {
    try { state = migrateState(JSON.parse(localStorage.getItem(key) ?? "null")); } catch {}
    loaded = true;
  }
  return state;
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  function onStorage(event: StorageEvent) {
    if (event.key !== key && event.key !== null) return;
    try {
      const incoming=migrateState(JSON.parse(event.newValue ?? "null"));
      if (incoming!==empty && incoming.revision>state.revision) {
        state=incoming;
        loaded=true;
      } else if (incoming!==empty && incoming.revision===state.revision && incoming.updatedAt!==state.updatedAt) {
        setPersistenceIssue("Outra aba alterou este perfil ao mesmo tempo. Recarregue antes de continuar para evitar sobrescrever dados.");
      } else if (event.newValue==null) {
        loaded=false;
      }
    } catch {
      loaded=false;
    }
    listener();
  }
  window.addEventListener("storage",onStorage);
  return () => { listeners.delete(listener); window.removeEventListener("storage",onStorage); };
}
function update(transform: (current: State) => State) {
  const current=snapshot();
  const transformed=transform(current);
  if (transformed===current) return;
  const next={...transformed,schemaVersion,revision:current.revision+1,updatedAt:new Date().toISOString()};
  state=next;
  persist(next);
  for (const notify of listeners) notify();
}

function persist(next:State) {
  let cached=false;
  try { localStorage.setItem(key,JSON.stringify(next));cached=true; } catch {}
  persistence=persistence.then(async()=>{
    let databaseSaved=false;
    try { await writeWorkspace(next);databaseSaved=true; } catch {}
    if (databaseSaved) {
      setPersistenceIssue(undefined);
      return true;
    }
    if (cached) {
      setPersistenceIssue("As alterações foram salvas apenas no cache local deste navegador. O backup interno está indisponível.");
      return true;
    }
    setPersistenceIssue("O navegador não conseguiu salvar as últimas alterações. Evite fechar esta aba antes de resolver o armazenamento.");
    return false;
  });
}

async function restore() {
  if (restoring) return;
  restoring=true;
  try {
    const initial=snapshot();
    const saved=await readWorkspace<State>().catch(()=>undefined);
    if (saved && snapshot()===initial) {
      const databaseState=migrateState(saved);
      if (initial===empty || databaseState.revision>initial.revision) {
        state=databaseState;
        try { localStorage.setItem(key,JSON.stringify(state)); } catch {}
      } else if (initial!==empty) persist(initial);
    } else if (initial!==empty) persist(initial);
  } finally {
    restored=true;
    for (const notify of listeners) notify();
  }
}

export const waitForWorkspaceSave=()=>persistence;
function workspaceUpdate(transform: (workspace: Workspace) => Workspace) {
  const id = snapshot().active?.id;
  if (!id) return false;
  update((current) => {
    const existing=current.workspaces[id] ?? emptyWorkspace;
    const next=transform(existing);
    return next===existing ? current : {...current,workspaces:{...current.workspaces,[id]:next}};
  });
  return true;
}
export const setPlan = (plan: Plan) => workspaceUpdate((workspace) => ({...workspace,plan}));

export const startTutorial = () => workspaceUpdate((workspace)=>({...workspace,tutorial:{step:"plan"}}));
export const endTutorial = (step:"complete"|"skipped") => workspaceUpdate((workspace)=>({...workspace,tutorial:{step}}));
export const finishManualMapGuide = () => workspaceUpdate((workspace)=>({...workspace,manualMapSeen:true}));
export function updateTutorial(step:TutorialStep,change:Partial<TutorialProgress>) {
  return workspaceUpdate((workspace)=>workspace.tutorial?.step===step
    ? {...workspace,tutorial:{...workspace.tutorial,...change}}
    : workspace);
}

function isPublished(item:Template,workspaces:State["workspaces"]) {
  return item.visibility!=="private" && !(item.owner && workspaces[item.owner]?.hidePublishedRoutes);
}

function findTemplate(current:State,slug:string) {
  return current.published.find((item)=>item.slug===slug && isPublished(item,current.workspaces)) ?? templates.find((item)=>item.slug===slug);
}

export function saveTrip(trip:Trip,publication?:{title:string;description:string}) {
  let saved=false;
  update((current)=>{
    if (!current.active) return current;
    const id=current.active.id;
    const workspace=current.workspaces[id] ?? emptyWorkspace;
    const prior=current.published.find((item)=>item.tripId===trip.tripId && item.owner===id);
    const model=publication && !workspace.hidePublishedRoutes && publishTrip(trip,id,publication.title,publication.description,prior);
    const source=trip.plan.copiedFrom && findTemplate(current,trip.plan.copiedFrom);
    let routeActivity=current.routeActivity;
    if (source && source.owner!==id) {
      const activity=routeActivity?.[source.slug] ?? emptyActivity;
      if (!activity.uses.includes(id)) routeActivity={...routeActivity,[source.slug]:{...activity,uses:[...activity.uses,id]}};
    }
    const tutorial=planningTutorial(workspace.tutorial?.step) ? {step:"trips",tripId:trip.tripId} as const : workspace.tutorial;
    saved=true;
    return {...current,routeActivity,published:model ? [model,...current.published.filter((item)=>item!==prior)] : current.published,
      workspaces:{...current.workspaces,[id]:{...workspace,tutorial,trips:[trip,...workspace.trips.filter((item)=>item.tripId!==trip.tripId)]}}};
  });
  return saved;
}

export function toggleRouteStar(slug:string) {
  update((current)=>{
    const id=current.active?.id;
    const item=findTemplate(current,slug);
    if (!id || !item || item.owner===id) return current;
    const activity=current.routeActivity?.[slug] ?? emptyActivity;
    const stars=activity.stars.includes(id) ? activity.stars.filter((voter)=>voter!==id) : [...activity.stars,id];
    return {...current,routeActivity:{...current.routeActivity,[slug]:{...activity,stars}}};
  });
}

export function toggleSavedRoute(slug:string) {
  workspaceUpdate((workspace)=>{
    const saved=workspace.savedRoutes ?? emptySaved;
    if (saved.includes(slug)) return {...workspace,savedRoutes:saved.filter((entry)=>entry!==slug)};
    if (!findTemplate(snapshot(),slug)) return workspace;
    return {...workspace,savedRoutes:[slug,...saved]};
  });
}

export function setRoutePrivacy(hidePublishedRoutes:boolean) {
  workspaceUpdate((workspace)=>({...workspace,hidePublishedRoutes}));
}

export function setRouteVisibility(slug:string,visibility:"public"|"private") {
  update((current)=>{
    const item=current.published.find((row)=>row.slug===slug && row.owner===current.active?.id);
    if (!current.active || !item) return current;
    return {...current,published:current.published.map((row)=>row===item ? {...row,visibility} : row)};
  });
}

export function putTrip(trip: Trip, expected?: number) {
  let saved = false;
  workspaceUpdate((workspace) => {
    const existing = workspace.trips.find((item) => item.tripId === trip.tripId);
    if (expected !== undefined && existing?.revision !== expected) return workspace;
    saved = true;
    return {...workspace,trips:[trip,...workspace.trips.filter((item) => item.tripId !== trip.tripId)]};
  });
  return saved;
}
export function changeTrip(id: string, change: (trip: Trip) => Trip) {
  workspaceUpdate((workspace) => ({...workspace,trips:workspace.trips.map((trip) => trip.tripId === id ? change(trip) : trip)}));
}
export async function login(name: string, email: string, create: boolean, password = "") {
  const current = snapshot();
  const normalizedEmail = normalizeEmail(email);
  if (!validEmail(normalizedEmail)) return "Informe um e-mail válido.";
  const existing = current.profiles.find((profile) => normalizeEmail(profile.email) === normalizedEmail);
  if (!create) {
    if (!existing) return "Este perfil ainda não existe neste navegador. Crie uma conta de demonstração.";
    const credential=current.passwords?.[existing.id];
    if (!await verifyProfileAccess(current,existing.id,password)) return credential ? "Confira a senha e tente novamente." : "A proteção local deste perfil não pôde ser verificada. Restaure um backup ou crie outro perfil de demonstração.";
    let signedIn=false;
    update((latest)=>{
      const profile=latest.profiles.find((row)=>row.id===existing.id && normalizeEmail(row.email)===normalizedEmail);
      if (!profile || latest.active?.id!==current.active?.id || latest.passwords?.[profile.id]?.hash!==credential?.hash) return latest;
      signedIn=true;
      return {...latest,active:profile};
    });
    return signedIn ? "" : "O perfil mudou. Tente entrar novamente.";
  }
  if (existing) return "Já existe um perfil com este e-mail. Entre na sua conta.";
  if (!name.trim()) return "Informe um nome para o perfil.";
  if (password && !validPassword(password)) return "Use de 8 a 128 caracteres na senha.";
  const credential=password ? await makeLocalPassword(password) : undefined;
  const active={id:crypto.randomUUID(),name:name.trim().slice(0,66),email:normalizedEmail};
  let created=false;
  update((latest) => {
    if (latest.profiles.some((profile)=>normalizeEmail(profile.email)===normalizedEmail) || latest.active?.id!==current.active?.id) return latest;
    const {guest,...workspaces}=latest.workspaces;
    created=true;
    return {...latest,active,profiles:[...latest.profiles,active],
      passwords:credential ? {...latest.passwords,[active.id]:credential} : latest.passwords,
      passwordless:credential ? (latest.passwordless ?? []).filter((id)=>id!==active.id) : [...new Set([...(latest.passwordless ?? []),active.id])],
      workspaces:{...workspaces,[active.id]:{...(guest ?? emptyWorkspace),tutorial:{step:"plan"}}},
      published:guest ? latest.published.map((row)=>row.owner==="guest" ? {...row,owner:active.id} : row) : latest.published};
  });
  return created ? "" : "O cadastro mudou. Confira o e-mail e tente novamente.";
}

const normalizeEmail=(value:string)=>value.trim().toLowerCase();
const validEmail=(value:string)=>value.length<=254 && /^[^\s@]+@[^\s@]+$/.test(value);
const validPassword=(value:string)=>value.length>=passwordLength.min && value.length<=passwordLength.max;

function withProfile(current:State,profile:Profile):State {
  return {...current,active:profile,profiles:current.profiles.map((row)=>row.id===profile.id ? profile : row)};
}

export function editProfile(owner:string,name:string,avatar?:string) {
  const trimmed=name.trim();
  if (!trimmed || trimmed.length>66) return "Informe um nome com até 66 caracteres.";
  let saved=false;
  update((current)=>{
    if (current.active?.id!==owner) return current;
    saved=true;
    return withProfile(current,{...current.active,name:trimmed,avatar});
  });
  return saved ? "" : "Abra o perfil novamente para salvar.";
}

export async function changeProfileEmail(owner:string,value:string,password:string) {
  const email=normalizeEmail(value);
  const credential=snapshot().passwords?.[owner];
  if (!validEmail(email)) return "Informe um e-mail válido.";
  if (!await verifyProfileAccess(snapshot(),owner,password)) return credential ? "Confira sua senha atual." : "A proteção local deste perfil não pôde ser verificada.";
  let error="O perfil mudou. Abra as configurações novamente.";
  update((current)=>{
    if (current.active?.id!==owner || current.passwords?.[owner]?.hash!==credential?.hash) return current;
    if (current.profiles.some((row)=>row.id!==owner && normalizeEmail(row.email)===email)) {
      error="Já existe um perfil com este e-mail.";
      return current;
    }
    error="";
    return withProfile(current,{...current.active,email});
  });
  return error;
}

export async function changeProfilePassword(owner:string,currentPassword:string,newPassword:string) {
  const credential=snapshot().passwords?.[owner];
  if (!validPassword(newPassword)) return "Use de 8 a 128 caracteres na nova senha.";
  if (!await verifyProfileAccess(snapshot(),owner,currentPassword)) return credential ? "Confira sua senha atual." : "A proteção local deste perfil não pôde ser verificada.";
  const password=await makeLocalPassword(newPassword);
  let saved=false;
  update((current)=>{
    if (current.active?.id!==owner || current.passwords?.[owner]?.hash!==credential?.hash) return current;
    saved=true;
    return {...current,passwords:{...current.passwords,[owner]:password},passwordless:(current.passwordless ?? []).filter((id)=>id!==owner)};
  });
  return saved ? "" : "O perfil mudou. Abra as configurações novamente.";
}

export const logout = () => update((current) => ({...current,active:null}));
export function publish(template: Template) {
  update((current)=>{
    if (!current.active || template.owner!==current.active.id) return current;
    const prior=current.published.find((item)=>item.slug===template.slug && item.owner===template.owner);
    if (!prior && current.workspaces[current.active.id]?.hidePublishedRoutes) return current;
    return {...current,published:[{...template,visibility:prior?.visibility ?? template.visibility},...current.published.filter((item)=>item!==prior)]};
  });
}
export function withdraw(slug: string) {
  update((current) => current.active
    ? {...current,published:current.published.filter((item) => item.slug !== slug || item.owner !== current.active?.id)}
    : current);
}

export const localWorkspace = {
  getSnapshot: snapshot,
  getServerSnapshot: () => empty,
  isReady: () => restored || snapshot() !== empty,
  persistenceIssue: () => persistenceIssue,
  getWorkspace: (current: State) => (current.active && current.workspaces[current.active.id]) || emptyWorkspace,
  isPublished,
  subscribe,
  restore,
};
