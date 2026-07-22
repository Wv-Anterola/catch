import type { PatientDetail, Comorbidity } from "./types";

// Deterministic, cautious, NON-diagnostic outreach drafts. CATCH never sends these;
// a human reviews and sends. The draft is personalized per patient (age + the
// cardiometabolic conditions stacked alongside high blood pressure); it never states a
// diagnosis and never invents circumstances the data does not contain.
//
// The same personalized clinical content is rendered in several language/community
// styles. The clinical meaning is identical across every style; only the greeting and
// register change. Non-English community styles are prototypes awaiting review by
// speakers from that community.

export type OutreachStyle =
  | "en"
  | "es-neutral" | "es-pr" | "es-do" | "es-gt"
  | "pt-br" | "pt-eu";

export interface OutreachStyleMeta {
  id: OutreachStyle;
  label: string;
  group: "English" | "Spanish" | "Portuguese";
  prototype?: boolean;
}

export const STYLES: OutreachStyleMeta[] = [
  { id: "en", label: "English", group: "English" },
  { id: "es-neutral", label: "Spanish (Neutral / U.S.)", group: "Spanish" },
  { id: "es-pr", label: "Spanish (Puerto Rican style)", group: "Spanish", prototype: true },
  { id: "es-do", label: "Spanish (Dominican style)", group: "Spanish", prototype: true },
  { id: "es-gt", label: "Spanish (Guatemalan style)", group: "Spanish", prototype: true },
  { id: "pt-br", label: "Portuguese (Brazilian)", group: "Portuguese", prototype: true },
  { id: "pt-eu", label: "Portuguese (European / Azorean)", group: "Portuguese", prototype: true },
];

type BaseLang = "en" | "es" | "pt";
function baseOf(style: OutreachStyle): BaseLang {
  if (style === "en") return "en";
  if (style.startsWith("es")) return "es";
  return "pt";
}

// Greeting is the one line that changes between community styles; everything below it
// is the same clinical message.
const GREETING: Record<OutreachStyle, string> = {
  en: "Hello,",
  "es-neutral": "Estimado/a paciente,",
  "es-pr": "¡Saludos!",
  "es-do": "¡Hola!",
  "es-gt": "Buenos días,",
  "pt-br": "Olá,",
  "pt-eu": "Olá,",
};

// Gentle, non-clinical labels for the risk factors that compound with hypertension.
const RISK_LABEL: Record<string, Record<BaseLang, string>> = {
  prediabetes: { en: "prediabetes", es: "prediabetes", pt: "pré-diabetes" },
  obesity: {
    en: "a weight that adds to heart risk",
    es: "un peso que aumenta el riesgo cardíaco",
    pt: "um peso que aumenta o risco cardíaco",
  },
  metabolic_syndrome: {
    en: "several metabolic risk factors",
    es: "varios factores de riesgo metabólico",
    pt: "vários fatores de risco metabólico",
  },
  high_ldl: { en: "high cholesterol", es: "colesterol alto", pt: "colesterol alto" },
  hyperlipidemia: { en: "high cholesterol", es: "colesterol alto", pt: "colesterol alto" },
};

// Distinct risk-factor phrases, in the patient's stacked order, capped so the message
// stays readable. De-duped because high_ldl and hyperlipidemia share a label.
function riskPhrases(comorbidities: Comorbidity[] | undefined, base: BaseLang, cap = 2): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of comorbidities ?? []) {
    const label = RISK_LABEL[c.tag];
    if (!label) continue;
    const text = label[base];
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

interface DraftParts {
  opening: string;
  ageLine: string;
  riskLine: string;
  closing: string;
  signoff: string;
  subject: string;
}

function buildEn(d: PatientDetail): DraftParts {
  const older = Math.round(d.age) >= 65;
  const undiagnosed = d.category === "undiagnosed";
  const risks = riskPhrases(d.comorbidities, "en");
  return {
    opening: undiagnosed
      ? "Our community health team reviewed your records and noticed some blood pressure readings that are worth checking with a clinician. This is not a diagnosis, just an invitation to schedule a short visit."
      : "Our community health team reviewed your records and noticed your recent blood pressure readings have stayed higher than we'd like, even with your current care. A brief visit can help your clinician see whether your treatment is still the right fit. This is not a diagnosis.",
    ageLine: older
      ? "Blood pressure tends to need closer attention as we get older, so now is a good time for a check-up. If coming in is difficult, we can set up a phone visit instead."
      : "Taking care of this now, earlier in life, is the best way to keep it from becoming a bigger concern later on.",
    riskLine: risks.length
      ? `Your records also note ${joinList(risks, "and")}, which work together with blood pressure to affect your heart health, so it helps to look at them in the same visit.`
      : "",
    closing: "We'd be glad to help you set up an appointment at a time that works for you. Reply to this message or give us a call.",
    signoff: "Warmly,\nCommunity Health Team",
    subject: "A quick blood pressure check-up",
  };
}

function buildEs(d: PatientDetail): DraftParts {
  const older = Math.round(d.age) >= 65;
  const undiagnosed = d.category === "undiagnosed";
  const risks = riskPhrases(d.comorbidities, "es");
  return {
    opening: undiagnosed
      ? "Nuestro equipo de salud comunitaria revisó su historial y notó algunas lecturas de presión arterial que conviene revisar con un profesional. Esto no es un diagnóstico; es una invitación para agendar una consulta breve."
      : "Nuestro equipo de salud comunitaria revisó su historial y notó que sus lecturas recientes de presión arterial siguen más altas de lo deseable, aún con su tratamiento actual. Una consulta breve ayuda a su médico a ver si conviene ajustar su tratamiento. Esto no es un diagnóstico.",
    ageLine: older
      ? "Con el paso de los años la presión arterial suele necesitar más atención, así que este es un buen momento para un chequeo. Si venir a la clínica es difícil, podemos coordinar una consulta por teléfono."
      : "Atender esto ahora, a su edad, es la mejor forma de evitar que se convierta en un problema mayor más adelante.",
    riskLine: risks.length
      ? `Su historial también indica ${joinList(risks, "y")}, que junto con la presión arterial afectan la salud de su corazón, por lo que conviene revisarlos en la misma visita.`
      : "",
    closing: "Con gusto le ayudamos a coordinar una cita cuando le convenga. Puede responder a este mensaje o llamarnos.",
    signoff: "Con aprecio,\nEquipo de salud comunitaria",
    subject: "Recordatorio: control de presión arterial",
  };
}

function buildPtBr(d: PatientDetail): DraftParts {
  const older = Math.round(d.age) >= 65;
  const undiagnosed = d.category === "undiagnosed";
  const risks = riskPhrases(d.comorbidities, "pt");
  return {
    opening: undiagnosed
      ? "Nossa equipe de saúde comunitária revisou seu histórico e notou algumas medições de pressão arterial que vale a pena verificar com um profissional. Isto não é um diagnóstico; é apenas um convite para agendar uma consulta rápida."
      : "Nossa equipe de saúde comunitária revisou seu histórico e notou que suas medições recentes de pressão arterial continuam mais altas do que o desejável, mesmo com seu tratamento atual. Uma consulta rápida ajuda seu médico a ver se é preciso ajustar o tratamento. Isto não é um diagnóstico.",
    ageLine: older
      ? "A pressão costuma exigir mais atenção com o passar dos anos, então este é um bom momento para uma consulta. Se for difícil vir à clínica, podemos combinar uma consulta por telefone."
      : "Cuidar disso agora, mais cedo na vida, é a melhor forma de evitar que se torne um problema maior no futuro.",
    riskLine: risks.length
      ? `Seu histórico também indica ${joinList(risks, "e")}, que junto com a pressão afetam a saúde do seu coração, então vale a pena revê-los na mesma consulta.`
      : "",
    closing: "Teremos prazer em ajudar a marcar uma consulta no horário que for melhor para você. Responda a esta mensagem ou ligue para nós.",
    signoff: "Atenciosamente,\nEquipe de Saúde Comunitária",
    subject: "Lembrete: controle da pressão arterial",
  };
}

function buildPtEu(d: PatientDetail): DraftParts {
  const older = Math.round(d.age) >= 65;
  const undiagnosed = d.category === "undiagnosed";
  const risks = riskPhrases(d.comorbidities, "pt");
  return {
    opening: undiagnosed
      ? "A nossa equipa de saúde comunitária reviu o seu historial e reparou em algumas leituras de tensão arterial que vale a pena verificar com um profissional. Isto não é um diagnóstico; é apenas um convite para marcar uma consulta breve."
      : "A nossa equipa de saúde comunitária reviu o seu historial e reparou que as suas leituras recentes de tensão arterial continuam mais altas do que o desejável, mesmo com o tratamento atual. Uma consulta breve ajuda o seu médico a ver se é preciso ajustar o tratamento. Isto não é um diagnóstico.",
    ageLine: older
      ? "A tensão costuma exigir mais atenção com o passar dos anos, pelo que este é um bom momento para uma consulta. Se for difícil deslocar-se à clínica, podemos combinar uma consulta por telefone."
      : "Cuidar disto agora, mais cedo na vida, é a melhor forma de evitar que se torne um problema maior mais tarde.",
    riskLine: risks.length
      ? `O seu historial também indica ${joinList(risks, "e")}, que em conjunto com a tensão afetam a saúde do seu coração, pelo que vale a pena revê-los na mesma consulta.`
      : "",
    closing: "Teremos todo o gosto em ajudar a marcar uma consulta na altura que lhe for mais conveniente. Responda a esta mensagem ou telefone-nos.",
    signoff: "Com os melhores cumprimentos,\nEquipa de Saúde Comunitária",
    subject: "Lembrete: controlo da tensão arterial",
  };
}

export function outreachDraft(
  d: PatientDetail,
  style: OutreachStyle,
): { subject: string; body: string; prototype: boolean } {
  const base = baseOf(style);
  const parts =
    base === "en" ? buildEn(d)
      : base === "es" ? buildEs(d)
        : style === "pt-eu" ? buildPtEu(d) : buildPtBr(d);

  const body = [GREETING[style], parts.opening, parts.ageLine, parts.riskLine, parts.closing, parts.signoff]
    .filter(Boolean)
    .join("\n\n");

  const meta = STYLES.find((s) => s.id === style);
  return { subject: parts.subject, body, prototype: !!meta?.prototype };
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
