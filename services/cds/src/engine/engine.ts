export interface CdsContext {
  patient: { allergies: string[]; age: number; gender: string };
  medications: string[];      // proposed
  currentMeds: string[];      // active
  diagnoses: string[];        // ICD-10
}

export interface CdsAlert {
  severity: "info" | "warning" | "critical";
  code: string;
  message: string;
  source: string;
}

// Simple drug-allergy rule — extend with a real drug DB
export const runAllergyCheck = (ctx: CdsContext): CdsAlert[] => {
  const alerts: CdsAlert[] = [];
  for (const med of ctx.medications) {
    for (const allergy of ctx.patient.allergies) {
      if (med.toLowerCase().includes(allergy.toLowerCase())) {
        alerts.push({
          severity: "critical",
          code: "DRUG-ALLERGY",
          message: `Patient is allergic to ${allergy}. Proposed: ${med}`,
          source: "allergy-check"
        });
      }
    }
  }
  return alerts;
};

// Drug-drug interaction stub — wire to RxNorm/DrugBank later
export const runInteractionCheck = (ctx: CdsContext): CdsAlert[] => {
  // TODO: integrate with external drug interaction API
  return [];
};

export const evaluate = (ctx: CdsContext): CdsAlert[] => [
  ...runAllergyCheck(ctx),
  ...runInteractionCheck(ctx)
];