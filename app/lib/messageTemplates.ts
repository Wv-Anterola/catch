// Config-driven outreach templates for the Language & Community Variety studio.
//
// DESIGN PRINCIPLE: the clinical meaning is LOCKED across every variant; only the
// greeting, register, and administrative vocabulary change, and only after review.
// A clinic adds a new community-reviewed variety by appending a row here, not by
// touching UI code. Nothing is claimed as validated: every non-English row ships as
// a prototype awaiting review by speakers from that community.
//
// No real patient, clinic, or phone number appears here. All values are synthetic
// examples; the {{tokens}} are the fields a clinic maps to its own registry.

export type ReviewStatus = "draft" | "community-reviewed" | "clinically-approved";

export interface MessageTemplate {
  id: string;
  group: "English" | "Spanish" | "Portuguese";
  label: string;      // human-facing variety name (a named community variety)
  bcp47: string;      // language tag, e.g. es-PR
  status: ReviewStatus;
  note?: string;      // honesty note about what this variety is / is not
  body: string;       // filled sample preview (tokens rendered with sample values)
  backTranslation: string; // literal English back-translation for staff review
}

// The structured variables every template is built from. A clinic's registry maps
// each to its own field; the previews below render them with synthetic sample values.
export const STRUCTURED_VARS = [
  "{{patient_first_name}}",
  "{{clinic_name}}",
  "{{care_gap_name}}",
  "{{scheduling_phone}}",
  "{{scheduling_link}}",
  "{{preferred_language}}",
  "{{opt_out_text}}",
];

// The clinical content that MUST be identical across every variant. Rendered as a
// locked checklist so a reviewer can confirm meaning was preserved, not drifted.
export const CLINICAL_INVARIANTS = [
  "Identifies the sender as the patient's own clinic",
  "States records were reviewed and blood-pressure readings are worth checking",
  "Explicitly says this is NOT a diagnosis",
  "Invites the patient to schedule a short visit (no urgency to an ER)",
  "Gives the same call-to-action: phone or scheduling link",
  "Includes emergency guidance (call 911) and an opt-out",
];

// Governance shown to judges: who signs off, in what order, before production use.
export const GOVERNANCE = {
  patientPreference: "Language and variety are chosen by the patient or entered by staff, never inferred from name or ethnicity.",
  clinicalLock: "Clinical content is locked across variants; the language layer may only adapt tone, vocabulary, and reading level.",
  reviewChain: "Draft → community reviewer (native speaker) → clinical reviewer → clinically approved for production.",
  fallback: "If no reviewed variety exists, the clinic's approved neutral template is used automatically.",
  aiBoundary: "No PHI is sent to an unapproved model provider; generative help is constrained to wording, never eligibility.",
  readability: "Every variant targets a plain-language reading level and is checked before approval.",
};

// One synthetic clinical scenario, rendered in every variety so judges can see the
// wording change while the meaning does not. Sample values (fictional 555 number,
// example.org link, placeholder clinic) are clearly not real.
export const TEMPLATES: MessageTemplate[] = [
  {
    id: "en",
    group: "English",
    label: "English",
    bcp47: "en-US",
    status: "clinically-approved",
    note: "Reference template. All other variants are checked back against this one.",
    body:
      "Hi Maria, this is a message from Sample Community Health Center. Our care team reviewed your records and noticed some blood pressure readings worth checking. This is not a diagnosis. We'd like to set up a short blood-pressure follow-up visit. Please call (401) 555-0100 or book at clinic.example.org/schedule. If you need help sooner, contact your clinic; for an emergency call 911. Reply STOP to opt out.",
    backTranslation:
      "Reference (English original).",
  },
  {
    id: "es-neutral",
    group: "Spanish",
    label: "Neutral U.S. Spanish",
    bcp47: "es-US",
    status: "draft",
    note: "Neutral U.S. Spanish. Prototype awaiting review by a bilingual community reviewer.",
    body:
      "Hola Maria, le escribe Sample Community Health Center. Nuestro equipo de salud revisó su historial y notó algunas lecturas de presión arterial que conviene revisar. Esto no es un diagnóstico. Nos gustaría coordinar una consulta breve de control de presión arterial. Llame al (401) 555-0100 o reserve en clinic.example.org/schedule. Si necesita ayuda antes, comuníquese con su clínica; en una emergencia llame al 911. Responda ALTO para no recibir más mensajes.",
    backTranslation:
      "Hello Maria, this is Sample Community Health Center writing to you. Our health team reviewed your history and noticed some blood pressure readings worth checking. This is not a diagnosis. We would like to arrange a short blood-pressure check-up visit. Call (401) 555-0100 or book at clinic.example.org/schedule. If you need help sooner, contact your clinic; in an emergency call 911. Reply ALTO to stop messages.",
  },
  {
    id: "es-pr",
    group: "Spanish",
    label: "Puerto Rican Spanish",
    bcp47: "es-PR",
    status: "draft",
    note: "Prototype placeholder. Register and greeting differ modestly; awaiting review by Puerto Rican community speakers before any production use.",
    body:
      "¡Saludos, Maria! Le escribe Sample Community Health Center. Nuestro equipo de salud revisó su expediente y vio algunas lecturas de presión que conviene chequear. Esto no es un diagnóstico. Nos gustaría coordinarle una cita corta para dar seguimiento a su presión. Llame al (401) 555-0100 o saque su cita en clinic.example.org/schedule. Si necesita ayuda antes, llame a su clínica; en una emergencia, llame al 911. Responda ALTO para no recibir más mensajes.",
    backTranslation:
      "Greetings, Maria! This is Sample Community Health Center writing. Our health team reviewed your file and saw some blood pressure readings worth checking. This is not a diagnosis. We would like to arrange a short appointment to follow up on your blood pressure. Call (401) 555-0100 or make your appointment at clinic.example.org/schedule. If you need help sooner, call your clinic; in an emergency, call 911. Reply ALTO to stop messages.",
  },
  {
    id: "es-do",
    group: "Spanish",
    label: "Dominican Spanish",
    bcp47: "es-DO",
    status: "draft",
    note: "Prototype placeholder. Awaiting review by Dominican community speakers; differences shown are examples for a reviewer to confirm or replace.",
    body:
      "¡Hola, Maria! Le saluda Sample Community Health Center. Nuestro equipo de salud revisó su récord y notó algunas lecturas de presión que sería bueno revisar. Esto no es un diagnóstico. Nos gustaría coordinarle una cita cortita para darle seguimiento a su presión. Llame al (401) 555-0100 o coja su cita en clinic.example.org/schedule. Si necesita ayuda antes, llame a su clínica; en una emergencia, llame al 911. Responda ALTO para no recibir más mensajes.",
    backTranslation:
      "Hi, Maria! Sample Community Health Center greets you. Our health team reviewed your record and noticed some blood pressure readings that would be good to check. This is not a diagnosis. We would like to arrange a short appointment to follow up on your blood pressure. Call (401) 555-0100 or grab your appointment at clinic.example.org/schedule. If you need help sooner, call your clinic; in an emergency, call 911. Reply ALTO to stop messages.",
  },
  {
    id: "es-gt",
    group: "Spanish",
    label: "Guatemalan Spanish",
    bcp47: "es-GT",
    status: "draft",
    note: "Prototype placeholder. Awaiting review by Guatemalan community speakers; a more formal register is used as a starting point for review.",
    body:
      "Buenos días, Maria. Le escribe Sample Community Health Center. Nuestro equipo de salud revisó su historial y observó algunas lecturas de presión arterial que conviene revisar. Esto no es un diagnóstico. Nos gustaría programarle una consulta breve para dar seguimiento a su presión. Puede llamar al (401) 555-0100 o programar su cita en clinic.example.org/schedule. Si necesita ayuda antes, comuníquese con su clínica; en una emergencia, llame al 911. Responda ALTO para no recibir más mensajes.",
    backTranslation:
      "Good morning, Maria. This is Sample Community Health Center writing. Our health team reviewed your history and observed some blood pressure readings worth checking. This is not a diagnosis. We would like to schedule a short visit to follow up on your blood pressure. You may call (401) 555-0100 or schedule your appointment at clinic.example.org/schedule. If you need help sooner, contact your clinic; in an emergency, call 911. Reply ALTO to stop messages.",
  },
  {
    id: "pt-br",
    group: "Portuguese",
    label: "Brazilian Portuguese",
    bcp47: "pt-BR",
    status: "draft",
    note: "Prototype awaiting review by a Brazilian Portuguese community reviewer.",
    body:
      "Olá Maria, aqui é do Sample Community Health Center. Nossa equipe de saúde revisou seu histórico e notou algumas medições de pressão que vale a pena verificar. Isto não é um diagnóstico. Gostaríamos de marcar uma consulta rápida para acompanhar sua pressão. Ligue para (401) 555-0100 ou agende em clinic.example.org/schedule. Se precisar de ajuda antes, procure sua clínica; em uma emergência, ligue para 911. Responda PARAR para não receber mais mensagens.",
    backTranslation:
      "Hello Maria, this is from Sample Community Health Center. Our health team reviewed your history and noticed some blood pressure readings worth checking. This is not a diagnosis. We would like to book a quick visit to follow up on your blood pressure. Call (401) 555-0100 or schedule at clinic.example.org/schedule. If you need help sooner, contact your clinic; in an emergency, call 911. Reply PARAR to stop messages.",
  },
  {
    id: "pt-eu",
    group: "Portuguese",
    label: "Azorean Portuguese",
    bcp47: "pt-PT",
    status: "draft",
    note: "Prototype awaiting review by European/Azorean Portuguese community speakers; register and some vocabulary differ from Brazilian.",
    body:
      "Olá Maria, fala o Sample Community Health Center. A nossa equipa de saúde reviu o seu historial e reparou em algumas medições de tensão arterial que convém verificar. Isto não é um diagnóstico. Gostaríamos de marcar uma consulta breve para acompanhar a sua tensão. Telefone para (401) 555-0100 ou marque em clinic.example.org/schedule. Se precisar de ajuda mais cedo, contacte a sua clínica; numa emergência, ligue 911. Responda PARAR para deixar de receber mensagens.",
    backTranslation:
      "Hello Maria, this is Sample Community Health Center speaking. Our health team reviewed your history and noticed some blood pressure readings worth checking. This is not a diagnosis. We would like to book a short visit to follow up on your blood pressure. Telephone (401) 555-0100 or book at clinic.example.org/schedule. If you need help sooner, contact your clinic; in an emergency, call 911. Reply PARAR to stop receiving messages.",
  },
];

export const STATUS_META: Record<ReviewStatus, { label: string; tone: "urgent" | "high" | "routine" }> = {
  draft: { label: "Draft · prototype", tone: "high" },
  "community-reviewed": { label: "Community reviewed", tone: "routine" },
  "clinically-approved": { label: "Clinically approved", tone: "routine" },
};
