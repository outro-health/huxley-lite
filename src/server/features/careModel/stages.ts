import type { CareStage, TransitionTrigger } from "../../db/schema"

// The care model as a small state machine. A patient is in exactly one stage;
// these are the moves the system and clinicians are allowed to make.
// Corrections (staff fixing a mistake) can go anywhere and are not listed.

export const allowedTransitions: Record<CareStage, readonly CareStage[]> = {
  intake: ["evaluation", "archived"],
  evaluation: ["decision_pending", "archived"],
  decision_pending: ["eligible", "ineligible", "archived"],
  eligible: ["active_care", "ineligible", "archived"],
  active_care: ["archived"],
  ineligible: ["eligible", "archived"],
  archived: [],
}

export const stageLabels: Record<CareStage, string> = {
  intake: "Intake",
  evaluation: "Evaluation",
  decision_pending: "Decision pending",
  eligible: "Eligible",
  active_care: "Active care",
  ineligible: "Not eligible",
  archived: "Archived",
}

export type TransitionCheck =
  | { allowed: true }
  | { allowed: false; reason: string }

export const checkTransition = (
  from: CareStage,
  to: CareStage,
  trigger: TransitionTrigger,
): TransitionCheck => {
  if (trigger === "correction") {
    return from === to
      ? { allowed: false, reason: `Patient is already in ${stageLabels[to]}.` }
      : { allowed: true }
  }
  if (from === to) {
    return {
      allowed: false,
      reason: `Patient is already in ${stageLabels[to]}.`,
    }
  }
  if (!allowedTransitions[from].includes(to)) {
    return {
      allowed: false,
      reason: `Cannot move from ${stageLabels[from]} to ${stageLabels[to]}.`,
    }
  }
  return { allowed: true }
}
