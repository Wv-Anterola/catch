export type Priority = "urgent" | "high" | "routine";

export interface CohortRow {
  patient_id: string;
  category: string;
  priority: Priority;
  reason: string;
  city: string;
  county: string;
  lat: number | null;
  lon: number | null;
  age: number;
  gender: string;
  n_highs: number;
  max_systolic: number | null;
  first_high: string | null;
  last_high: string | null;
  on_meds: number;
  has_htn_dx: number;
  stacked: number;
  comorbid_tags: string;
  n_visits: number;
  data_quality: string;
  rank: number;
  contacted?: number;
}

export interface BpPoint { date: string; systolic: number | null; diastolic: number | null; }
export interface Comorbidity { tag: string; evidence: string; }

export interface PatientDetail {
  patient_id: string;
  category: string;
  priority: Priority;
  reason: string;
  age: number;
  gender: string;
  city: string;
  county: string;
  n_highs: number;
  max_systolic: number | null;
  first_high: string | null;
  last_high: string | null;
  on_meds: boolean;
  has_htn_dx: boolean;
  n_visits: number;
  comorbidities: Comorbidity[];
  med_classes: string[];
  rule_trace: string[];
  priority_factors: string[];
  data_quality: string[];
  bp_timeline: BpPoint[];
  outreach: OutreachProfile;
}

export interface OutreachSignal {
  status: string;
  label: string;
  as_of: string | null;
}

export interface OutreachRoute {
  role: string;
  reasons: string[];
}

export interface OutreachProfile {
  preferred_language: OutreachSignal;
  food_access: OutreachSignal;
  transportation: OutreachSignal;
  insurance: OutreachSignal;
  pcp_continuity: OutreachSignal;
  support_flags: string[];
  recommended_routes: OutreachRoute[];
}

// Slim queue row shipped in queue.json (everything heavier lives in the on-demand
// patient detail file). Keep in sync with QUEUE_FIELDS in etl/export_web.py.
export interface QueueRow {
  patient_id: string;
  category: string;
  priority: Priority;
  reason: string;
  city: string;
  age: number;
  stacked: number;
  comorbid_tags: string;
  support_flags: string;
  recommended_roles: string;
}

export interface ManifestCounts {
  adults: number;
  total_patients: number;
  flagged: number;
  undiagnosed: number;
  treated_uncontrolled: number;
  urgent: number;
  high: number;
  routine: number;
  cities: number;
  hospitals: number;
  queue_shown: number;
}

export interface Manifest {
  version: string;
  generated: string;
  source: string;
  meta: Record<string, string | number>;
  counts: ManifestCounts;
  funnel: FunnelStage[];
}

export interface FunnelStage { stage: string; n: number; ord: number; }
export interface CityStat {
  city: string; county: string; adults: number; flagged: number;
  undiagnosed: number; treated_uncontrolled: number; rate: number;
  lat: number | null; lon: number | null;
}
export interface Hospital { name: string; city: string; lat: number; lon: number; }

export interface EquityRow {
  dimension: "overall" | "ethnicity" | "race";
  group_name: string;
  adults: number;
  flagged: number;
  support_need: number;
  language_support: number;
  food_need: number;
  transport_need: number;
  insurance_need: number;
  pcp_need: number;
}

export interface EquityData { suppression_min_n: number; rows: EquityRow[]; }
