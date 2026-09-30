/**
 * Pregnancy-category warnings — drugs to avoid or use with caution during pregnancy.
 */

export interface PregnancyRule {
  drugPatterns: string[];
  category: "contraindicated" | "caution";
  message: string;
}

export const PREGNANCY_RULES: PregnancyRule[] = [
  {
    drugPatterns: ["warfarin"],
    category: "contraindicated",
    message:
      "Warfarin is teratogenic. Use LMWH (enoxaparin) in pregnancy."
  },
  {
    drugPatterns: ["lisinopril", "losartan", "enalapril", "ramipril", "candesartan", "valsartan"],
    category: "contraindicated",
    message:
      "ACE inhibitors and ARBs are contraindicated in pregnancy — fetal renal damage."
  },
  {
    drugPatterns: ["simvastatin", "atorvastatin", "rosuvastatin"],
    category: "contraindicated",
    message: "Statins are contraindicated in pregnancy."
  },
  {
    drugPatterns: ["ciprofloxacin", "levofloxacin", "moxifloxacin"],
    category: "contraindicated",
    message:
      "Fluoroquinolones — cartilage damage risk in fetus. Avoid in pregnancy."
  },
  {
    drugPatterns: ["doxycycline", "tetracycline"],
    category: "contraindicated",
    message:
      "Tetracyclines cause dental staining and bone growth issues. Avoid."
  },
  {
    drugPatterns: ["ibuprofen", "diclofenac", "naproxen", "aspirin"],
    category: "caution",
    message:
      "NSAIDs in third trimester risk premature closure of ductus arteriosus. Use paracetamol if possible."
  },
  {
    drugPatterns: ["metformin"],
    category: "caution",
    message:
      "Metformin is generally considered safe in pregnancy but monitor closely."
  },
  {
    drugPatterns: ["fluconazole"],
    category: "caution",
    message:
      "High-dose fluconazole is teratogenic. Single low dose is acceptable."
  }
];