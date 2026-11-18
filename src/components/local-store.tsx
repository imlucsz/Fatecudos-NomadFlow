"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import type { Template } from "@/lib/destinations";
import { localWorkspace } from "@/lib/local-workspace";

export {
  changeProfileEmail, changeProfilePassword, changeTrip, editProfile, endTutorial,
  finishManualMapGuide, login, logout, publish, putTrip, saveTrip, setPlan, setRoutePrivacy,
  setRouteVisibility, startTutorial, toggleRouteStar, toggleSavedRoute,
  updateTutorial, waitForWorkspaceSave, withdraw,
} from "@/lib/local-workspace";

const emptyActivityByRoute: NonNullable<ReturnType<typeof localWorkspace.getSnapshot>["routeActivity"]> = {};
const emptyModels: Template[] = [];
const emptySaved: string[] = [];
const notReady = () => false;

function useLocalState() {
  const current = useSyncExternalStore(localWorkspace.subscribe, localWorkspace.getSnapshot, localWorkspace.getServerSnapshot);
  const ready = useSyncExternalStore(localWorkspace.subscribe, localWorkspace.isReady, notReady);
  useEffect(() => { void localWorkspace.restore(); }, []);

  const { active, profiles, workspaces } = current;
  const workspace = localWorkspace.getWorkspace(current);
  const published = useMemo(() => current.published.filter((item) => localWorkspace.isPublished(item, workspaces)), [current.published, workspaces]);
  const ownedModels = useMemo(() => active ? current.published.filter((item) => item.owner === active.id) : emptyModels, [current.published, active]);
  return {
    active,
    profiles,
    ...workspace,
    published,
    ownedModels,
    savedRoutes: workspace.savedRoutes ?? emptySaved,
    hasPassword: !!(active && current.passwords?.[active.id]),
    routeActivity: current.routeActivity ?? emptyActivityByRoute,
    owner: active?.id ?? "guest",
    ready,
  };
}

const Context = createContext<ReturnType<typeof useLocalState> | null>(null);

export function LocalProvider({ children }: { children: React.ReactNode }) {
  return <Context.Provider value={useLocalState()}>{children}</Context.Provider>;
}

export const useLocal = () => useContext(Context)!;
