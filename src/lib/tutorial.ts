import type { Plan } from "./planning";

export const tutorialExample = "Quero ir para a Tailândia em um ano de viagem.";
export const tutorialSteps = ["plan","chat","map","tickets","save","trips","explore"] as const;
export type TutorialStep = typeof tutorialSteps[number];
export type TutorialProgress = {
  step: TutorialStep | "complete" | "skipped";
  draft?: Plan;
  draftFor?: string;
  mapOpened?: boolean;
  cafesOpened?: boolean;
  ticketsOpened?: boolean;
  ticketsReviewed?: boolean;
  lodgingOpened?: boolean;
  tripId?: string;
  openingSavedTrip?: boolean;
};

export function planningTutorial(step?:TutorialProgress["step"]):step is "map"|"tickets"|"save" {
  return step==="map" || step==="tickets" || step==="save";
}
