import { DRUG_ALLERGY_RULES } from "./rules/drugAllergyRules";
import {
  DRUG_INTERACTION_RULES,
  DUPLICATE_THERAPY_RULES
} from "./interactionRules";
import { PREGNANCY_RULES } from "./pregnancyRules";

export interface CdsContext {
  patient: {
    allergies: string[];
    age: number;
    gender: string;
    isPregnant?: boolean;
  };
  medications: string[];    // drugs being proposed
  currentMeds: string[];    // drugs patient is already on
  diagnoses: string[];
}

export interface CdsAlert {
  severity: "info" | "warning" | "critical";
  code: string;             // machine-readable: DRUG-ALLERGY, DRUG-INTERACTION, ...
  message: string;
  source: string;           // rule ID for audit
  drug?: string;            // the specific drug that triggered
}

const norm = (s: string) => s.toLowerCase().trim();

const matchesAny = (drug: string, patterns: string[]): string | null => {
  const d = norm(drug);
  for (const p of patterns) {
    if (d.includes(norm(p))) return p;
  }
  return null;
};

// ── Allergy check ──
export const runAllergyCheck = (ctx: CdsContext): CdsAlert[] => {
  const alerts: CdsAlert[] = [];

  for (const med of ctx.medications) {
    for (const rule of DRUG_ALLERGY_RULES) {
      const patientHasAllergy = ctx.patient.allergies.some((a) =>
        norm(a).includes(norm(rule.allergen))
      );
      if (!patientHasAllergy) continue;

      const matched = matchesAny(med, rule.drugPatterns);
      if (matched) {
        alerts.push({
          severity: rule.severity,
          code: "DRUG-ALLERGY",
          message: `${rule.message} (Proposed: ${med})`,
          source: `allergy:${rule.allergen}`,
          drug: med
        });
      }
    }
  }

  return alerts;
};

// ── Drug-drug interaction check ──
export const runInteractionCheck = (ctx: CdsContext): CdsAlert[] => {
  const alerts: CdsAlert[] = [];
  const existing = ctx.currentMeds.map(norm);
  const proposed = ctx.medications.map(norm);

  for (const rule of DRUG_INTERACTION_RULES) {
    const [a, b] = rule.pair.map(norm);

    const aProposed = proposed.some((d) => d.includes(a));
    const bProposed = proposed.some((d) => d.includes(b));
    const aExisting = existing.some((d) => d.includes(a));
    const bExisting = existing.some((d) => d.includes(b));

    // Match if: (a proposed AND b existing) OR (b proposed AND a existing) OR (both proposed)
    const fires =
      (aProposed && bExisting) ||
      (bProposed && aExisting) ||
      (aProposed && bProposed);

    if (fires) {
      alerts.push({
        severity: rule.severity,
        code: "DRUG-INTERACTION",
        message: rule.message,
        source: `interaction:${rule.pair[0]}+${rule.pair[1]}`
      });
    }
  }

  return alerts;
};

// ── Duplicate therapy check ──
export const runDuplicateCheck = (ctx: CdsContext): CdsAlert[] => {
  const alerts: CdsAlert[] = [];
  const existing = ctx.currentMeds.map(norm);
  const proposed = ctx.medications.map(norm);

  for (const rule of DUPLICATE_THERAPY_RULES) {
    for (const med of proposed) {
      const medMatches = rule.patterns.some((p) => med.includes(norm(p)));
      if (!medMatches) continue;

      const alreadyOnClass = existing.some((d) =>
        rule.patterns.some((p) => d.includes(norm(p)))
      );
      if (alreadyOnClass) {
        alerts.push({
          severity: rule.severity,
          code: "DUPLICATE-THERAPY",
          message: rule.message,
          source: `duplicate:${rule.patterns[0]}`,
          drug: med
        });
      }
    }
  }

  return alerts;
};

// ── Pregnancy check ──
export const runPregnancyCheck = (ctx: CdsContext): CdsAlert[] => {
  if (!ctx.patient.isPregnant) return [];
  const alerts: CdsAlert[] = [];

  for (const med of ctx.medications) {
    for (const rule of PREGNANCY_RULES) {
      const matched = matchesAny(med, rule.drugPatterns);
      if (matched) {
        alerts.push({
          severity: rule.category === "contraindicated" ? "critical" : "warning",
          code: "PREGNANCY-WARNING",
          message: `${rule.message} (Proposed: ${med})`,
          source: `pregnancy:${matched}`,
          drug: med
        });
      }
    }
  }

  return alerts;
};

// ── Main entry point ──
export const evaluate = (ctx: CdsContext): CdsAlert[] => [
  ...runAllergyCheck(ctx),
  ...runInteractionCheck(ctx),
  ...runDuplicateCheck(ctx),
  ...runPregnancyCheck(ctx)
];

/** True if any alert is critical — caller should block the action */
export const hasBlockingAlert = (alerts: CdsAlert[]): boolean =>
  alerts.some((a) => a.severity === "critical");