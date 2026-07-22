"use client";

import { useEffect, useState } from "react";
import type { PatientDetail, Priority } from "@/lib/types";
import { outreachDraft, STYLES, type OutreachStyle } from "@/lib/outreach";
import { pathForPatient } from "@/lib/decisionTree";
import DecisionTree from "./DecisionTree";
import { dataUrl } from "@/lib/paths";
import BpTimeline from "./BpTimeline";

const PRIO_LABEL: Record<Priority, string> = { urgent: "Urgent", high: "High", routine: "Routine" };

export default function PatientDrawer({
  patientId,
  contacted,
  onToggleContacted,
  onClose,
}: {
  patientId: string | null;
  contacted: boolean;
  onToggleContacted: (id: string) => void;
  onClose?: () => void;
}) {
  const [detail, setDetail] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [style, setStyle] = useState<OutreachStyle>("en");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!patientId) { if (!ignore) setDetail(null); return; }
      if (!ignore) setLoading(true);
      const d = await fetch(dataUrl(`patients/${patientId}.json`))
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      if (!ignore) {
        setDetail(d);
        setStyle(d?.outreach?.preferred_language?.status === "spanish" ? "es-neutral" : "en");
        setLoading(false);
      }
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

  const needsLanguageConfirmation = detail.outreach.preferred_language.status === "interpreter_required";
  const draft = outreachDraft(detail, style);
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
          <div className="flex items-center gap-2 shrink-0">
            <span className={`inline-flex items-center gap-1.5 prio-label prio-${detail.priority}`}>
              <span className={`dot dot-${detail.priority}`} aria-hidden />
              {PRIO_LABEL[detail.priority]}
            </span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close patient detail"
                className="lg:hidden grid place-items-center w-9 h-9 -mr-1.5 rounded-[var(--r-sm)] text-[color:var(--muted)] hover:bg-[color:var(--panel)] hover:text-[color:var(--ink)]"
              >
                <span className="text-[18px] leading-none" aria-hidden>✕</span>
              </button>
            )}
          </div>
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

        <section>
          <h3 className="eyebrow mb-2">Outreach readiness</h3>
          <dl className="text-[13px] space-y-1.5">
            <Row k="Preferred language" v={detail.outreach.preferred_language.label} />
            <Row k="Food access" v={detail.outreach.food_access.label} />
            <Row k="Transportation" v={detail.outreach.transportation.label} />
            <Row k="Insurance" v={detail.outreach.insurance.label} />
            <Row k="PCP continuity" v={detail.outreach.pcp_continuity.label} />
          </dl>
          <div className="mt-3 space-y-2">
            {detail.outreach.recommended_routes.map((route) => (
              <div key={route.role} className="rounded-[var(--r-sm)] border border-[color:var(--border)] bg-[color:var(--panel)] px-3 py-2">
                <p className="text-[12px] font-medium">{route.role}</p>
                <p className="text-[11px] text-[color:var(--muted)] mt-0.5">{route.reasons.join(" · ")}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[color:var(--faint)] mt-2">Support recommendations do not change clinical priority.</p>
        </section>

        {/* timeline */}
        <section>
          <h3 className="eyebrow mb-1.5">Blood pressure over time</h3>
          <BpTimeline points={detail.bp_timeline} />
          <p className="text-[11px] text-[color:var(--faint)] mt-1">
            Each dot is one systolic reading; hover for the exact value and date. The shaded band is
            the high-BP zone (≥ 140 mmHg).
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
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h3 className="eyebrow">Suggested follow-up · generated draft</h3>
          <label className="sr-only" htmlFor="draft-style">Draft language and community style</label>
          <select
            id="draft-style"
            value={style}
            onChange={(e) => setStyle(e.target.value as OutreachStyle)}
            className="field text-[12px] py-1 pr-7"
          >
            {(["English", "Spanish", "Portuguese"] as const).map((g) => (
              <optgroup key={g} label={g}>
                {STYLES.filter((s) => s.group === g).map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        {needsLanguageConfirmation && (
          <p className="text-[11px] text-[color:var(--high)] mb-2">
            Preferred language is not documented for this patient. Confirm it (and arrange an
            interpreter if needed) before sending.
          </p>
        )}
        <div className="rounded-[var(--r)] border border-[color:var(--border)] bg-[color:var(--surface)] p-3 text-[12.5px] whitespace-pre-wrap max-h-[160px] overflow-y-auto">
          <div className="font-medium mb-1">{draft.subject}</div>
          {draft.body}
        </div>
        {draft.prototype && (
          <p className="text-[11px] text-[color:var(--high)] mt-1.5">
            Community style is a prototype awaiting review by speakers from that community. The
            clinical meaning is unchanged.
          </p>
        )}
        <p className="text-[11px] text-[color:var(--faint)] mt-1.5">
          Draft for staff review. It does not communicate a diagnosis, and CATCH does not send messages.
        </p>

        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => onToggleContacted(detail.patient_id)}
            className={contacted ? "btn btn-ghost" : "btn btn-primary"}
          >
            {contacted ? "Contacted (undo)" : "Mark contacted"}
          </button>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(`${draft.subject}\n\n${draft.body}`);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="btn btn-ghost"
          >
            {copied ? "Copied" : "Copy draft"}
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

