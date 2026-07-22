"use client";

import { useMemo, useState } from "react";
import {
  TEMPLATES,
  STATUS_META,
  STRUCTURED_VARS,
  CLINICAL_INVARIANTS,
  GOVERNANCE,
  type MessageTemplate,
} from "@/lib/messageTemplates";

type Channel = "sms" | "email";
type Stage = "draft" | "reviewed" | "approved";

const STAGES: { id: Stage; label: string }[] = [
  { id: "draft", label: "Draft" },
  { id: "reviewed", label: "Reviewed" },
  { id: "approved", label: "Approved" },
];

// The Language & Community Style studio: a self-contained, safe SIMULATION of the
// governed language layer. It sends nothing. It shows that the wording changes per
// community style while the clinical meaning stays locked, and that a human moves the
// draft through review → approval before any (simulated) send.
export default function LanguageStudio() {
  const [id, setId] = useState<string>(TEMPLATES[1].id); // open on Spanish neutral
  const [channel, setChannel] = useState<Channel>("sms");
  const [stage, setStage] = useState<Stage>("draft");
  const [showBack, setShowBack] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const tpl = useMemo<MessageTemplate>(
    () => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0],
    [id],
  );
  const status = STATUS_META[tpl.status];

  function pick(next: string) {
    setId(next);
    setStage("draft");
    setShowBack(false);
    const t = TEMPLATES.find((x) => x.id === next);
    setLog((l) => [`Style set to “${t?.label}” by staff (patient preference).`, ...l].slice(0, 6));
  }

  function advance(next: Stage, note: string) {
    setStage(next);
    setLog((l) => [note, ...l].slice(0, 6));
  }

  return (
    <div className="surface overflow-hidden">
      {/* controls */}
      <div className="px-5 pt-4 pb-3 border-b border-[color:var(--border)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <label htmlFor="ls-style" className="eyebrow block mb-1">Language &amp; community style</label>
            <select
              id="ls-style"
              className="field w-full sm:w-[300px]"
              value={id}
              onChange={(e) => pick(e.target.value)}
            >
              {["English", "Spanish", "Portuguese"].map((g) => (
                <optgroup key={g} label={g}>
                  {TEMPLATES.filter((t) => t.group === g).map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <span className="eyebrow block mb-1">Channel</span>
            <div className="inline-flex rounded-[var(--r)] border border-[color:var(--border-strong)] overflow-hidden">
              {(["sms", "email"] as Channel[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setChannel(c)}
                  aria-pressed={channel === c}
                  className={`px-3.5 py-2 text-[13px] font-medium min-h-[40px] ${
                    channel === c
                      ? "bg-[color:var(--accent)] text-white"
                      : "bg-[color:var(--surface)] text-[color:var(--muted)] hover:bg-[color:var(--panel)]"
                  }`}
                >
                  {c.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-2.5 text-[12px] text-[color:var(--muted)]">
          Style is <strong>chosen by the patient or entered by staff</strong>, never guessed from a
          name or ethnicity. Patients can change it or opt out at any time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px]">
        {/* message preview */}
        <div className="px-5 py-4 border-b lg:border-b-0 lg:border-r border-[color:var(--border)]">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className={`prio-label prio-${status.tone}`}>{status.label}</span>
              <span className="text-[11px] text-[color:var(--faint)] tabular-nums">{tpl.bcp47} · v0.1</span>
            </div>
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[color:var(--accent-ink)] bg-[color:var(--accent-weak)] px-2 py-0.5 rounded-full"
              title="The clinical content is identical across every variant; only wording changes."
            >
              ✓ Same clinical meaning
            </span>
          </div>

          {/* channel-framed preview */}
          <div className="rounded-[var(--r)] border border-[color:var(--border)] bg-[color:var(--panel)] overflow-hidden">
            <div className="px-3 py-1.5 text-[11px] text-[color:var(--muted)] border-b border-[color:var(--border)] bg-[color:var(--surface)] flex items-center gap-2">
              <span className="font-semibold uppercase tracking-wide text-[10px] text-[color:var(--accent)]">{channel === "sms" ? "SMS" : "Email"}</span>
              preview
              <span className="ml-auto text-[color:var(--faint)]">to patient’s preferred number/email</span>
            </div>
            <div className="px-3.5 py-3">
              {channel === "email" && (
                <div className="text-[12px] font-semibold text-[color:var(--ink)] mb-1.5 pb-1.5 border-b border-[color:var(--border)]">
                  Subject: A quick blood-pressure check-up
                </div>
              )}
              <p className="text-[13px] leading-[1.6] text-[color:var(--ink)] whitespace-pre-wrap">{tpl.body}</p>
            </div>
          </div>

          {tpl.note && (
            <p className="mt-2 text-[11.5px] text-[color:var(--high)]">{tpl.note}</p>
          )}

          {/* back-translation */}
          <button
            type="button"
            onClick={() => setShowBack((v) => !v)}
            className="mt-2.5 text-[12px] font-medium text-[color:var(--accent)] hover:underline flex items-center gap-1.5"
            aria-expanded={showBack}
          >
            <span className={`transition-transform ${showBack ? "rotate-90" : ""}`} aria-hidden>›</span>
            {showBack ? "Hide" : "Show"} English back-translation (staff review)
          </button>
          {showBack && (
            <div className="mt-2 rounded-[var(--r)] border border-dashed border-[color:var(--border-strong)] bg-[color:var(--surface)] px-3 py-2 text-[12.5px] text-[color:var(--muted)] leading-[1.55]">
              {tpl.backTranslation}
            </div>
          )}

          {/* structured variables */}
          <div className="mt-3">
            <span className="eyebrow">Structured variables (mapped to clinic registry)</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {STRUCTURED_VARS.map((v) => (
                <code key={v} className="chip font-mono text-[11px]">{v}</code>
              ))}
            </div>
          </div>
        </div>

        {/* review + governance rail */}
        <div className="px-5 py-4 bg-[color:var(--panel)]">
          {/* human-in-the-loop stepper */}
          <span className="eyebrow">Human review before any send</span>
          <div className="mt-2 flex items-center gap-1.5">
            {STAGES.map((s, i) => {
              const idx = STAGES.findIndex((x) => x.id === stage);
              const done = i <= idx;
              return (
                <div key={s.id} className="flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 text-[11.5px] font-semibold px-2 py-1 rounded-full ${
                      done
                        ? "bg-[color:var(--accent)] text-white"
                        : "bg-[color:var(--surface)] text-[color:var(--faint)] border border-[color:var(--border)]"
                    }`}
                  >
                    {done ? "✓" : i + 1} {s.label}
                  </span>
                  {i < STAGES.length - 1 && <span className="text-[color:var(--faint)]" aria-hidden>→</span>}
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {stage === "draft" && (
              <button className="btn btn-ghost w-full justify-center" onClick={() => advance("reviewed", "Community reviewer marked wording as reviewed.")}>
                Mark community-reviewed
              </button>
            )}
            {stage === "reviewed" && (
              <button className="btn btn-primary w-full justify-center" onClick={() => advance("approved", `Clinician approved ${channel.toUpperCase()} outreach for send.`)}>
                Approve for outreach
              </button>
            )}
            {stage === "approved" && (
              <div className="rounded-[var(--r)] border border-[color:var(--routine)] bg-[color:var(--routine-weak)] px-3 py-2 text-[12px] text-[color:var(--routine)] font-medium text-center">
                ✓ Approved. In a real deployment this would queue for send. <span className="font-normal">This demo sends nothing.</span>
              </div>
            )}
            {stage !== "draft" && (
              <button className="text-[12px] text-[color:var(--muted)] hover:text-[color:var(--ink)] hover:underline" onClick={() => advance("draft", "Reset to draft.")}>
                Reset
              </button>
            )}
          </div>

          {/* locked clinical invariants */}
          <div className="mt-4">
            <span className="eyebrow">Locked clinical content</span>
            <ul className="mt-1.5 space-y-1">
              {CLINICAL_INVARIANTS.map((c) => (
                <li key={c} className="flex gap-2 text-[11.5px] text-[color:var(--muted)] leading-snug">
                  <span className="mt-[5px] inline-block w-1.5 h-1.5 rounded-[1px] bg-[color:var(--accent)] shrink-0" aria-hidden />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* audit trail */}
          <div className="mt-4">
            <span className="eyebrow">Audit trail</span>
            {log.length === 0 ? (
              <p className="mt-1.5 text-[11.5px] text-[color:var(--faint)]">Actions you take here are logged, with role, style, channel, and version.</p>
            ) : (
              <ol className="mt-1.5 space-y-1">
                {log.map((e, i) => (
                  <li key={i} className="text-[11.5px] text-[color:var(--muted)] leading-snug flex gap-1.5">
                    <span className="text-[color:var(--faint)] tabular-nums shrink-0" aria-hidden>•</span>
                    <span>{e}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>

      {/* governance footer */}
      <div className="px-5 py-3.5 border-t border-[color:var(--border)] grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
        {Object.values(GOVERNANCE).map((g) => (
          <p key={g} className="text-[11.5px] text-[color:var(--muted)] leading-snug flex gap-1.5">
            <span className="text-[color:var(--accent)] shrink-0" aria-hidden>✓</span>
            <span>{g}</span>
          </p>
        ))}
      </div>
    </div>
  );
}
