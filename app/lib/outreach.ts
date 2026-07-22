import type { PatientDetail, Comorbidity } from "./types";

// Deterministic, cautious, NON-diagnostic outreach drafts. CATCH never sends these;
// a human reviews and sends. The patient drawer selects a draft only when the
// documented preferred language is English or Spanish; it never infers a language.
//
// The draft is tailored to the two things that actually shape a person's hypertension
// risk: their age and the cardiometabolic conditions stacked alongside high blood
// pressure. It never states a diagnosis and never invents circumstances the data does
// not contain.

export type Lang = "en" | "es";

// Gentle, non-clinical labels for the risk factors that compound with hypertension.
const RISK_LABEL: Record<string, { en: string; es: string }> = {
  prediabetes: { en: "prediabetes", es: "prediabetes" },
  obesity: { en: "a weight that adds to heart risk", es: "un peso que aumenta el riesgo cardíaco" },
  metabolic_syndrome: { en: "several metabolic risk factors", es: "varios factores de riesgo metabólico" },
  high_ldl: { en: "high cholesterol", es: "colesterol alto" },
  hyperlipidemia: { en: "high cholesterol", es: "colesterol alto" },
};

// Distinct risk-factor phrases, in the patient's stacked order, capped so the message
// stays readable. De-duped because high_ldl and hyperlipidemia share a label.
function riskPhrases(comorbidities: Comorbidity[], lang: Lang, cap = 2): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of comorbidities) {
    const label = RISK_LABEL[c.tag];
    if (!label) continue;
    const text = label[lang];
    if (seen.has(text)) continue;
    seen.add(text);
    out.push(text);
    if (out.length >= cap) break;
  }
  return out;
}

function joinList(items: string[], conj: string): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} ${conj} ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, ${conj} ${items[items.length - 1]}`;
}

export function outreachDraft(d: PatientDetail, lang: Lang): { subject: string; body: string } {
  const age = Math.round(d.age);
  const older = age >= 65;
  const undiagnosed = d.category === "undiagnosed";
  const risks = riskPhrases(d.comorbidities, lang);

  if (lang === "es") {
    const opening = undiagnosed
      ? `Nuestro equipo de salud comunitaria revisó su historial y notó algunas ` +
        `lecturas de presión arterial que conviene revisar con un profesional. Esto no ` +
        `es un diagnóstico; es una invitación para agendar una consulta breve.`
      : `Nuestro equipo de salud comunitaria revisó su historial y notó que sus ` +
        `lecturas recientes de presión arterial siguen más altas de lo deseable, aún ` +
        `con su tratamiento actual. Una consulta breve ayuda a su médico a ver si ` +
        `conviene ajustar su tratamiento. Esto no es un diagnóstico.`;

    const ageLine = older
      ? `Con el paso de los años la presión arterial suele necesitar más atención, ` +
        `así que este es un buen momento para un chequeo. Si venir a la clínica es ` +
        `difícil, podemos coordinar una consulta por teléfono.`
      : `Atender esto ahora, a su edad, es la mejor forma de evitar que se convierta ` +
        `en un problema mayor más adelante.`;

    const riskLine = risks.length
      ? `Su historial también indica ${joinList(risks, "y")}, que junto con la presión ` +
        `arterial afectan la salud de su corazón, por lo que conviene revisarlos en la ` +
        `misma visita.`
      : "";

    const body = [
      "Estimado/a paciente,",
      opening,
      ageLine,
      riskLine,
      `Con gusto le ayudamos a coordinar una cita cuando le convenga. Puede responder a ` +
        `este mensaje o llamarnos.`,
      "Con aprecio,\nEquipo de salud comunitaria",
    ].filter(Boolean).join("\n\n");

    return { subject: "Recordatorio: control de presión arterial", body };
  }

  const opening = undiagnosed
    ? `Our community health team reviewed your records and noticed some blood pressure ` +
      `readings that are worth checking with a clinician. This is not a diagnosis, just ` +
      `an invitation to schedule a short visit.`
    : `Our community health team reviewed your records and noticed your recent blood ` +
      `pressure readings have stayed higher than we'd like, even with your current care. ` +
      `A brief visit can help your clinician see whether your treatment is still the ` +
      `right fit. This is not a diagnosis.`;

  const ageLine = older
    ? `Blood pressure tends to need closer attention as we get older, so now is a good ` +
      `time for a check-up. If coming in is difficult, we can set up a phone visit instead.`
    : `Taking care of this now, earlier in life, is the best way to keep it from ` +
      `becoming a bigger concern later on.`;

  const riskLine = risks.length
    ? `Your records also note ${joinList(risks, "and")}, which work together with blood ` +
      `pressure to affect your heart health, so it helps to look at them in the same visit.`
    : "";

  const body = [
    "Hello,",
    opening,
    ageLine,
    riskLine,
    `We'd be glad to help you set up an appointment at a time that works for you. Reply ` +
      `to this message or give us a call.`,
    "Warmly,\nCommunity Health Team",
  ].filter(Boolean).join("\n\n");

  return { subject: "A quick blood pressure check-up", body };
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
