/**
 * Drug-drug interaction rules.
 *
 * Each rule fires when a patient's current medication list + the newly
 * proposed medication together match a `pair` of patterns.
 */

export interface DrugInteractionRule {
  pair: [string, string];        // both sides matched (either order)
  severity: "warning" | "critical";
  message: string;
}

export const DRUG_INTERACTION_RULES: DrugInteractionRule[] = [
  {
    pair: ["warfarin", "ibuprofen"],
    severity: "critical",
    message:
      "Warfarin + NSAID increases bleeding risk substantially. Use paracetamol or a PPI-protected alternative."
  },
  {
    pair: ["warfarin", "aspirin"],
    severity: "critical",
    message: "Warfarin + aspirin — major bleeding risk."
  },
  {
    pair: ["warfarin", "diclofenac"],
    severity: "critical",
    message: "Warfarin + diclofenac — major bleeding risk."
  },
  {
    pair: ["warfarin", "naproxen"],
    severity: "critical",
    message: "Warfarin + naproxen — major bleeding risk."
  },
  {
    pair: ["warfarin", "fluconazole"],
    severity: "warning",
    message:
      "Fluconazole inhibits warfarin metabolism — monitor INR closely."
  },
  {
    pair: ["warfarin", "metronidazole"],
    severity: "warning",
    message: "Metronidazole potentiates warfarin — monitor INR."
  },
  {
    pair: ["warfarin", "ciprofloxacin"],
    severity: "warning",
    message: "Ciprofloxacin may increase warfarin effect — monitor INR."
  },
  {
    pair: ["simvastatin", "clarithromycin"],
    severity: "critical",
    message:
      "Clarithromycin + simvastatin — risk of rhabdomyolysis. Hold statin during therapy."
  },
  {
    pair: ["simvastatin", "erythromycin"],
    severity: "critical",
    message: "Erythromycin + simvastatin — rhabdomyolysis risk."
  },
  {
    pair: ["atorvastatin", "clarithromycin"],
    severity: "warning",
    message:
      "Clarithromycin raises atorvastatin levels. Consider dose reduction."
  },
  {
    pair: ["metformin", "contrast"],
    severity: "warning",
    message:
      "Metformin + iodinated contrast — risk of lactic acidosis. Withhold metformin 48h around contrast."
  },
  {
    pair: ["metformin", "furosemide"],
    severity: "warning",
    message: "Furosemide may increase metformin levels."
  },
  {
    pair: ["lisinopril", "spironolactone"],
    severity: "warning",
    message:
      "ACE inhibitor + potassium-sparing diuretic — hyperkalemia risk. Monitor potassium."
  },
  {
    pair: ["losartan", "spironolactone"],
    severity: "warning",
    message:
      "ARB + potassium-sparing diuretic — hyperkalemia risk. Monitor potassium."
  },
  {
    pair: ["ciprofloxacin", "ondansetron"],
    severity: "warning",
    message: "Both prolong QT interval — monitor ECG."
  },
  {
    pair: ["azithromycin", "ondansetron"],
    severity: "warning",
    message: "QT prolongation — consider alternative."
  },
  {
    pair: ["tramadol", "ondansetron"],
    severity: "warning",
    message:
      "Ondansetron may reduce tramadol efficacy and increase serotonin risk."
  }
];

/**
 * Duplicate therapy rules — block prescribing the same drug or drug class twice.
 */
export interface DuplicateTherapyRule {
  patterns: string[];           // two drugs sharing any of these patterns is a duplicate
  severity: "warning" | "critical";
  message: string;
}

export const DUPLICATE_THERAPY_RULES: DuplicateTherapyRule[] = [
  {
    patterns: ["paracetamol", "acetaminophen"],
    severity: "warning",
    message:
      "Patient is already on paracetamol. Duplicate therapy risks hepatotoxicity — do not exceed 4g/24h total."
  },
  {
    patterns: ["ibuprofen", "diclofenac", "naproxen", "aspirin", "ketorolac", "indomethacin", "piroxicam", "meloxicam"],
    severity: "warning",
    message:
      "Patient is already on an NSAID. Combined NSAIDs increase GI and renal risk."
  },
  {
    patterns: ["amoxicillin", "ampicillin", "penicillin", "augmentin"],
    severity: "warning",
    message: "Duplicate penicillin-class therapy detected."
  },
  {
    patterns: ["omeprazole", "esomeprazole", "lansoprazole", "pantoprazole"],
    severity: "warning",
    message: "Duplicate proton pump inhibitor therapy detected."
  },
  {
    patterns: ["metformin", "glibenclamide", "glimepiride", "insulin"],
    severity: "warning",
    message:
      "Patient is already on an antidiabetic. Review for hypoglycemia risk."
  },
  {
    patterns: ["atorvastatin", "simvastatin", "rosuvastatin", "pravastatin"],
    severity: "warning",
    message: "Duplicate statin therapy detected."
  }
];