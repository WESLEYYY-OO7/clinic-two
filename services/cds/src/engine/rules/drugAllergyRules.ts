/**
 * Drug-allergy rules.
 *
 * Each rule maps an allergy (what the patient's record says) to a set of
 * drug names / classes that must be flagged when prescribed.
 *
 * The `drugPatterns` are matched case-insensitively against a drug's
 * name AND its generic name. Patterns are substring matches to catch
 * variations like "amoxicillin-clavulanate".
 */

export interface DrugAllergyRule {
  allergen: string;              // matches patient's allergy field
  drugPatterns: string[];        // triggers when prescribed drug contains any
  severity: "warning" | "critical";
  message: string;
}

export const DRUG_ALLERGY_RULES: DrugAllergyRule[] = [
  // ── Penicillins ──
  {
    allergen: "penicillin",
    drugPatterns: [
      "penicillin",
      "amoxicillin",
      "ampicillin",
      "augmentin",
      "amoxicillin-clavulanate",
      "piperacillin",
      "ticarcillin",
      "methicillin",
      "oxacillin",
      "cloxacillin",
      "flucloxacillin"
    ],
    severity: "critical",
    message:
      "Patient has a documented penicillin allergy. Cross-reactivity with cephalosporins is possible but lower."
  },

  // ── Cephalosporins ──
  {
    allergen: "cephalosporin",
    drugPatterns: [
      "cephalosporin",
      "ceftriaxone",
      "cefuroxime",
      "cefixime",
      "cefepime",
      "ceftazidime",
      "cephalexin",
      "cefazolin",
      "cefotaxime"
    ],
    severity: "critical",
    message:
      "Patient has a documented cephalosporin allergy."
  },

  // ── Sulfonamides ──
  {
    allergen: "sulfa",
    drugPatterns: [
      "sulfa",
      "sulfamethoxazole",
      "trimethoprim-sulfamethoxazole",
      "cotrimoxazole",
      "sulfadiazine",
      "sulfasalazine"
    ],
    severity: "critical",
    message:
      "Patient has a documented sulfonamide (sulfa) allergy."
  },

  // ── NSAIDs ──
  {
    allergen: "nsaid",
    drugPatterns: [
      "ibuprofen",
      "diclofenac",
      "naproxen",
      "aspirin",
      "ketorolac",
      "indomethacin",
      "piroxicam",
      "celecoxib",
      "meloxicam"
    ],
    severity: "warning",
    message:
      "Patient has a documented NSAID allergy or intolerance. Consider acetaminophen or an alternative class."
  },

  {
    allergen: "aspirin",
    drugPatterns: ["aspirin", "acetylsalicylic"],
    severity: "critical",
    message: "Patient has a documented aspirin allergy."
  },

  // ── Macrolides ──
  {
    allergen: "macrolide",
    drugPatterns: [
      "macrolide",
      "azithromycin",
      "erythromycin",
      "clarithromycin"
    ],
    severity: "critical",
    message: "Patient has a documented macrolide allergy."
  },

  // ── Fluoroquinolones ──
  {
    allergen: "fluoroquinolone",
    drugPatterns: [
      "fluoroquinolone",
      "ciprofloxacin",
      "levofloxacin",
      "moxifloxacin",
      "ofloxacin",
      "norfloxacin"
    ],
    severity: "critical",
    message: "Patient has a documented fluoroquinolone allergy."
  },

  // ── Antimalarials ──
  {
    allergen: "artemether",
    drugPatterns: ["artemether", "coartem", "lumefantrine"],
    severity: "critical",
    message: "Patient has a documented artemether/lumefantrine allergy."
  },

  {
    allergen: "chloroquine",
    drugPatterns: ["chloroquine"],
    severity: "critical",
    message: "Patient has a documented chloroquine allergy."
  },

  // ── Statins ──
  {
    allergen: "statin",
    drugPatterns: [
      "statin",
      "atorvastatin",
      "simvastatin",
      "rosuvastatin",
      "pravastatin",
      "lovastatin"
    ],
    severity: "warning",
    message: "Patient has a documented statin intolerance or allergy."
  },

  // ── Opioids ──
  {
    allergen: "opioid",
    drugPatterns: ["morphine", "tramadol", "codeine", "fentanyl", "oxycodone", "hydrocodone"],
    severity: "warning",
    message: "Patient has a documented opioid sensitivity."
  },

  // ── Anticonvulsants ──
  {
    allergen: "carbamazepine",
    drugPatterns: ["carbamazepine", "tegretol"],
    severity: "critical",
    message: "Patient has a documented carbamazepine allergy."
  },

  // ── Iodine / Contrast ──
  {
    allergen: "iodine",
    drugPatterns: ["iodine", "iodinated", "contrast"],
    severity: "critical",
    message: "Patient has a documented iodine or contrast media allergy."
  }
];