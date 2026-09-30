import type { CdsContext, CdsAlert } from "./index";
import { DRUG_ALLERGY_RULES } from "./rules/drugAllergyRules";

export const runAllergyCheck = (ctx: CdsContext): CdsAlert[] => {
  const alerts: CdsAlert[] = [];

  for (const med of ctx.medications) {
    const lowerMed = med.toLowerCase();

    for (const rule of DRUG_ALLERGY_RULES) {
      const patientHasAllergy = ctx.patient.allergies.some((a) =>
        a.toLowerCase().includes(rule.allergen)
      );
      if (!patientHasAllergy) continue;

      const medMatches = rule.drugClassPatterns.some((p) =>
        lowerMed.includes(p)
      );
      if (medMatches) {
        alerts.push({
          severity: rule.severity,
          code: "DRUG-ALLERGY",
          message: `Patient is allergic to ${rule.allergen}. Proposed: ${med}`,
          source: "allergy-check"
        });
      }
    }
  }

  return alerts;
};