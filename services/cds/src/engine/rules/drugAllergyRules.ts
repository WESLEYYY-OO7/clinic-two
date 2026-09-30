export interface DrugAllergyRule {
  allergen: string;
  drugClassPatterns: string[];
  severity: "warning" | "critical";
}

export const DRUG_ALLERGY_RULES: DrugAllergyRule[] = [
  {
    allergen: "penicillin",
    drugClassPatterns: ["amoxicillin", "ampicillin", "penicillin"],
    severity: "critical"
  },
  {
    allergen: "sulfa",
    drugClassPatterns: ["sulfamethoxazole", "trimethoprim"],
    severity: "critical"
  },
  {
    allergen: "nsaid",
    drugClassPatterns: ["ibuprofen", "diclofenac", "naproxen"],
    severity: "warning"
  }
];