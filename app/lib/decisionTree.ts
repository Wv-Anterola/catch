import type { PatientDetail, Priority } from "./types";

// The engine's thresholds (etl/config.py). The methodology page passes live values
// from the build manifest; these defaults match the committed config so the patient
// drawer, which does not load the manifest, renders identical copy.
export interface Thresholds {
  adultMinAge: number;
  systolicHigh: number;
  systolicSevere: number;
  minHighs: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  adultMinAge: 18,
  systolicHigh: 140,
  systolicSevere: 180,
  minHighs: 2,
};

// One patient's route through the decision tree. A field is true/false where the
// engine reached that question, and null where an earlier branch ended the walk.
export interface TreePath {
  eligible: boolean;
  repeatedHighs: boolean | null;
  hasDx: boolean | null;
  onMeds: boolean | null;
  highsAfterTreatment: boolean | null;
  priority: Priority | null;
}

// Reconstruct the path from a patient's classified facts. The queue only ships
// flagged patients (undiagnosed or treated-uncontrolled); the mapping stays honest
// for the other categories too.
export function pathForPatient(d: PatientDetail): TreePath {
  const repeated = d.n_highs >= DEFAULT_THRESHOLDS.minHighs;
  if (d.category === "undiagnosed") {
    return {
      eligible: true, repeatedHighs: true, hasDx: false, onMeds: null,
      highsAfterTreatment: null, priority: d.priority,
    };
  }
  if (d.category === "treated_uncontrolled") {
    return {
      eligible: true, repeatedHighs: true, hasDx: true, onMeds: true,
      highsAfterTreatment: true, priority: d.priority,
    };
  }
  return {
    eligible: true,
    repeatedHighs: repeated,
    hasDx: d.has_htn_dx,
    onMeds: repeated && d.has_htn_dx ? d.on_meds : null,
    highsAfterTreatment: null,
    priority: d.priority ?? null,
  };
}
