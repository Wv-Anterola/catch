"use client";

import { useEffect, useState } from "react";
import type { PatientDetail, Priority } from "@/lib/types";
import { outreachDraft, type Lang } from "@/lib/outreach";
import { pathForPatient } from "@/lib/decisionTree";
import DecisionTree from "./DecisionTree";
import { dataUrl } from "@/lib/paths";
import BpTimeline from "./BpTimeline";

const PRIO_LABEL: Record<Priority, string> = { urgent: "Urgent", high: "High", routine: "Routine" };

export default function PatientDrawer({
  patientId,
  contacted,
  onToggleContacted,
}: {
  patientId: string | null;
  contacted: boolean;
  onToggleContacted: (id: string) => void;
}) {
  const [detail, setDetail] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!patientId) { if (!ignore) setDetail(null); return; }
      if (!ignore) setLoading(true);
      const d = await fetch(dataUrl(`patients/${patientId}.json`))
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      if (!ignore) { setDetail(d); setLoading(false); }
    }
    load();
    return () => { ignore = true; };
  }, [patientId]);

  if (!patientId) {
    return (
      <div className="surface p-8 text-center">
        <p className="text-[13px] text-[color:var(--muted)] max-w-[32ch] mx-auto">
          Select a patient to see the evidence, the exact rule that flagged them, and a draft
          outreach message.
        </p>
      </div>
    );
  }
  if (loading) {
    return <div className="surface p-8 text-center text-[13px] text-[color:var(--muted)]">Loading record details…</div>;
  }
  if (!detail) {
    return (
      <div className="surface p-8 text-center text-[13px] text-[color:var(--muted)]">
        This patient record could not be loaded. Pick another from the queue.
      </div>
    );
  }

  const draft = outreachDraft(detail, lang);
  const sex = detail.gender === "M" ? "Male" : detail.gender === "F" ? "Female" : "";

  return (
    <div className="surface overflow-hidden">
      {/* header */}
      <div className="px-5 pt-4 pb-3 border-b border-[color:var(--border)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-semibold">Patient {detail.patient_id.slice(0, 8)}</h2>
            <p className="text-[12px] text-[color:var(--muted)] mt-0.5">
              {[sex, `age ${Math.round(detail.age)}`, `${detail.city}, ${detail.county?.replace(" County", "")}`]
                .filter(Boolean).join(" · ")}
            </p>
          </div>
          <span className={`inline-flex items-center gap-1.5 prio-label prio-${detail.priority} shrink-0`}>
            <span className={`dot dot-${detail.priority}`} aria-hidden />
            {PRIO_LABEL[detail.priority]}
          </span>
        </div>
      </div>

      <div className="px-5 py-4 space-y-5">
        {/* why flagged */}
        <section>
          <h3 className="eyebrow mb-1.5">Reason for review</h3>
          <p className="text-[14px]">{detail.reason}.</p>
          <p className="text-[12px] text-[color:var(--muted)] mt-1.5">
            {detail.n_highs} elevated readings · max systolic {detail.max_systolic ? Math.round(detail.max_systolic) : "n/a"}{" "}
            · {detail.n_visits} encounters
            {detail.first_high ? ` · first ${detail.first_high}, last ${detail.last_high}` : ""}
          </p>
          {detail.data_quality.length > 0 && (
            <p className="mt-2 text-[12px] text-[color:var(--high)]">
              Data-quality note: {detail.data_quality.join("; ")}.
            </p>
          )}
        </section>

        {/* timeline */}
        <section>
          <h3 className="eyebrow mb-1.5">Blood pressure over time</h3>
          <BpTimeline points={detail.bp_timeline} />
          <p className="text-[11px] text-[color:var(--faint)] mt-1">
            Red points are systolic ≥ 140 mmHg (the dashed threshold).
          </p>
        </section>

        {/* evidence on file */}
        <section>
          <h3 className="eyebrow mb-2">Supporting evidence</h3>
          <dl className="text-[13px] space-y-1.5">
            <Row k="Diagnosis evidence" v={detail.has_htn_dx ? "On file" : "None on file"} />
            <Row k="Medication evidence" v={detail.on_meds ? detail.med_classes.join(", ") || "On file" : "None on file"} />
            <Row
              k="Relevant conditions"
              v={detail.comorbidities.length
                ? detail.comorbidities.map((c) => `${c.tag.replace(/_/g, " ")} (${c.evidence})`).join("; ")
                : "None recorded"}
            />
          </dl>
        </section>

        {/* decision path: the engine tree with this patient's route highlighted */}
        <details className="group">
          <summary className="cursor-pointer text-[13px] font-medium text-[color:var(--accent)] hover:underline list-none flex items-center gap-1.5">
            <span className="transition-transform group-open:rotate-90" aria-hidden>›</span>
            Show the decision path
          </summary>
          <div className="mt-3">
            <DecisionTree path={pathForPatient(detail)} />
          </div>
          <div className="mt-4">
            <h4 className="eyebrow mb-1.5">Engine log</h4>
            <ol className="text-[12px] text-[color:var(--muted)] space-y-1 pl-1">
              {detail.rule_trace.map((t, i) => (
                <li key={i} className="flex gap-2">
                  <span className="tabular-nums text-[color:var(--faint)]">{i + 1}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
          </div>
        </details>
      </div>

      {/* recommended action: visually separated */}
      <div className="border-t border-[color:var(--border)] bg-[color:var(--panel)] px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="eyebrow">Suggested follow-up · generated draft</h3>
          <div className="flex items-center gap-1">
            <LangBtn active={lang === "en"} onClick={() => setLang("en")}>EN</LangBtn>
            <LangBtn active={lang === "es"} onClick={() => setLang("es")}>ES</LangBtn>
          </div>
        </div>
        <div className="rounded-[var(--r)] border border-[color:var(--border)] bg-[color:var(--surface)] p-3 text-[12.5px] whitespace-pre-wrap max-h-[160px] overflow-y-auto">
          <div className="font-medium mb-1">{draft.subject}</div>
          {draft.body}
        </div>
        <p className="text-[11px] text-[color:var(--faint)] mt-1.5">
          Draft for staff review. It does not communicate a diagnosis, and CATCH does not send messages.
        </p>

        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => onToggleContacted(detail.patient_id)}
            className={contacted ? "btn btn-ghost" : "btn btn-primary"}
          >
            {contacted ? "✓ Contacted (undo)" : "Mark contacted"}
          </button>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(`${draft.subject}\n\n${draft.body}`);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="btn btn-ghost"
          >
            {copied ? "Copied ✓" : "Copy draft"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3">
      <dt className="text-[color:var(--muted)] w-[130px] shrink-0">{k}</dt>
      <dd className="flex-1">{v}</dd>
    </div>
  );
}

function LangBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`text-[12px] font-medium px-2 py-0.5 rounded-[var(--r-sm)] border ${
        active
          ? "border-[color:var(--accent)] text-[color:var(--accent)] bg-[color:var(--surface)]"
          : "border-transparent text-[color:var(--muted)] hover:text-[color:var(--ink)]"
      }`}
    >
      {children}
    </button>
  );
}
