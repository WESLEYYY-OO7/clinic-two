import { runAllergyCheck } from "./allergyCheck";
import { runInteractionCheck } from "./interactionCheck";

export interface CdsContext {
  patient: { allergies: string[]; age: number; gender: string };
  medications: string[];
  currentMeds: string[];
  diagnoses: string[];
}

export interface CdsAlert {
  severity: "info" | "warning" | "critical";
  code: string;
  message: string;
  source: string;
}

export const evaluate = (ctx: CdsContext): CdsAlert[] => [
  ...runAllergyCheck(ctx),
  ...runInteractionCheck(ctx)
];