import type { PatientDetail } from "./types";

// Deterministic, cautious, NON-diagnostic outreach drafts. CATCH never sends these;
// a human reviews and sends. No language is inferred from the patient; both EN and
// ES are always offered (Synthea has no language field).

export type Lang = "en" | "es";

export function outreachDraft(d: PatientDetail, lang: Lang): { subject: string; body: string } {
  if (lang === "es") {
    return {
      subject: "Recordatorio: control de presión arterial",
      body:
        `Estimado/a paciente,\n\n` +
        `Nuestro equipo de salud comunitaria revisó su historial y notó lecturas de ` +
        `presión arterial que conviene revisar con un profesional. Esto no es un ` +
        `diagnóstico; es una invitación para agendar una consulta breve.\n\n` +
        `Nos gustaría ayudarle a coordinar una cita a su conveniencia. ` +
        `Puede responder a este mensaje o llamarnos.\n\n` +
        `Con aprecio,\nEquipo de salud comunitaria`,
    };
  }
  return {
    subject: "A quick blood pressure check-up",
    body:
      `Hello,\n\n` +
      `Our community health team reviewed your records and noticed some blood ` +
      `pressure readings that are worth reviewing with a clinician. This is not a ` +
      `diagnosis, just an invitation to schedule a short visit.\n\n` +
      `We'd be glad to help you set up an appointment at a time that works for you. ` +
      `Reply to this message or give us a call.\n\n` +
      `Warmly,\nCommunity Health Team`,
  };
}

// A short internal "why this person" note for the case worker (not sent to the patient).
export function reviewNote(d: PatientDetail): string {
  const bits = [
    `${d.n_highs} elevated systolic readings`,
    d.has_htn_dx ? "diagnosis on file" : "no diagnosis on file",
    d.on_meds ? "on antihypertensive" : "no antihypertensive on file",
  ];
  const risks = d.comorbidities.map((c) => c.tag.replace("_", " ")).join(", ");
  if (risks) bits.push(`stacked risks: ${risks}`);
  return bits.join(" · ");
}
