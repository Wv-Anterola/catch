import { DEFAULT_THRESHOLDS, type Thresholds, type TreePath } from "@/lib/decisionTree";
import type { Priority } from "@/lib/types";

// A visual of the engine's decision tree (etl/engine.py). With no `path` it renders
// the generic tree (methodology page). With a `path` it highlights the single route
// one patient took and dims the branches that were not reached (patient drawer).

type LeafKind = "flag-undiagnosed" | "flag-treated" | "clear";

interface Branch { on: "yes" | "no"; label: string | null; kind: LeafKind | null; }
type StepKey = "eligible" | "repeatedHighs" | "hasDx" | "onMeds" | "highsAfterTreatment";
interface StepDef { key: StepKey; q: string; no: Branch; yes: Branch; }

function buildSteps(t: Thresholds): StepDef[] {
  return [
    {
      key: "eligible",
      q: `Adult and alive? (age ≥ ${t.adultMinAge})`,
      no: { on: "no", label: "Not reviewed", kind: "clear" },
      yes: { on: "yes", label: null, kind: null },
    },
    {
      key: "repeatedHighs",
      q: `${t.minHighs}+ systolic ≥ ${t.systolicHigh} mmHg on distinct days?`,
      no: { on: "no", label: "Not flagged", kind: "clear" },
      yes: { on: "yes", label: null, kind: null },
    },
    {
      key: "hasDx",
      q: "Hypertension diagnosis on file?",
      no: { on: "no", label: "Undiagnosed care gap", kind: "flag-undiagnosed" },
      yes: { on: "yes", label: null, kind: null },
    },
    {
      key: "onMeds",
      q: "On a non-ambiguous antihypertensive?",
      no: { on: "no", label: "Diagnosed, no medication evidence", kind: "clear" },
      yes: { on: "yes", label: null, kind: null },
    },
    {
      key: "highsAfterTreatment",
      q: `${t.minHighs}+ elevated readings after treatment began?`,
      no: { on: "no", label: "Managed (controlled or titrating)", kind: "clear" },
      yes: { on: "yes", label: "Treated but uncontrolled", kind: "flag-treated" },
    },
  ];
}

function chosenFor(path: TreePath): Record<StepKey, "yes" | "no" | null> {
  const eligible = path.eligible ? "yes" : "no";
  const repeatedHighs = path.eligible ? (path.repeatedHighs ? "yes" : "no") : null;
  const hasDx = repeatedHighs === "yes" ? (path.hasDx ? "yes" : "no") : null;
  const onMeds = hasDx === "yes" ? (path.onMeds ? "yes" : "no") : null;
  const highsAfterTreatment = onMeds === "yes" ? (path.highsAfterTreatment ? "yes" : "no") : null;
  return { eligible, repeatedHighs, hasDx, onMeds, highsAfterTreatment };
}

const LEAF_CLASS: Record<LeafKind, string> = {
  "flag-undiagnosed":
    "bg-[color:var(--accent-weak)] text-[color:var(--accent-ink)] border-[color:var(--brand-teal-soft)]",
  "flag-treated":
    "bg-[color:var(--urgent-weak)] text-[color:var(--urgent)] border-[color:var(--coral)]",
  clear: "bg-[color:var(--panel)] text-[color:var(--muted)] border-[color:var(--border)]",
};

function Leaf({ label, kind }: { label: string; kind: LeafKind }) {
  const flagged = kind !== "clear";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[var(--r-sm)] border px-2 py-0.5 text-[12px] font-medium ${LEAF_CLASS[kind]}`}
    >
      {flagged && <span className="text-[10px] uppercase tracking-wide font-semibold">Flag</span>}
      {label}
    </span>
  );
}

export default function DecisionTree({ t = DEFAULT_THRESHOLDS, path }: { t?: Thresholds; path?: TreePath }) {
  const steps = buildSteps(t);
  const chosen = path ? chosenFor(path) : null;

  return (
    <div className="text-[13px]">
      <ol className="space-y-0">
        {steps.map((s, i) => {
          const pick = chosen ? chosen[s.key] : undefined;
          const reached = !chosen || pick !== null;
          return (
            <li key={s.key} className={`relative pl-6 ${reached ? "" : "opacity-40"}`}>
              {i < steps.length - 1 && (
                <span
                  className="absolute left-[10px] top-[22px] bottom-0 w-px bg-[color:var(--border)]"
                  aria-hidden
                />
              )}
              <span
                className="absolute left-0 top-[3px] grid place-items-center w-[21px] h-[21px] rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface)] text-[11px] tabular-nums text-[color:var(--muted)]"
                aria-hidden
              >
                {i + 1}
              </span>
              <div className="pb-3">
                <p className="font-medium text-[color:var(--ink)]">{s.q}</p>
                <div className="mt-1.5 flex flex-col gap-1">
                  {[s.no, s.yes].map((b) => {
                    const active = chosen ? pick === b.on : undefined;
                    const dim = chosen && reached && active === false;
                    return (
                      <div key={b.on} className={`flex items-center gap-2 ${dim ? "opacity-40" : ""}`}>
                        <span
                          className={`inline-grid place-items-center min-w-[30px] rounded-[var(--r-sm)] border px-1.5 py-0.5 text-[11px] font-semibold ${
                            active
                              ? "border-[color:var(--accent)] text-[color:var(--accent)] bg-[color:var(--accent-weak)]"
                              : "border-[color:var(--border)] text-[color:var(--faint)]"
                          }`}
                        >
                          {b.on === "yes" ? "Yes" : "No"}
                        </span>
                        <span className="text-[color:var(--faint)]" aria-hidden>
                          {"→"}
                        </span>
                        {b.label && b.kind ? (
                          <Leaf label={b.label} kind={b.kind} />
                        ) : (
                          <span className="text-[12px] text-[color:var(--muted)]">continue to next check</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-2 rounded-[var(--r)] border border-[color:var(--border)] bg-[color:var(--panel)] px-3 py-2.5">
        <p className="eyebrow mb-1.5">Priority (flagged records only)</p>
        <ul className="space-y-1 text-[12.5px]">
          <PriorityRow
            name="urgent"
            active={path ? path.priority === "urgent" : undefined}
            rule={`severe reading (≥ ${t.systolicSevere} mmHg), or repeated highs with 2+ stacked risks`}
          />
          <PriorityRow
            name="high"
            active={path ? path.priority === "high" : undefined}
            rule="3+ elevated readings, or 1+ stacked risk"
          />
          <PriorityRow
            name="routine"
            active={path ? path.priority === "routine" : undefined}
            rule="repeated highs without additional stacked risks"
          />
        </ul>
      </div>
    </div>
  );
}

function PriorityRow({ name, rule, active }: { name: Priority; rule: string; active?: boolean }) {
  return (
    <li className={`flex items-start gap-2 ${active === false ? "opacity-45" : ""}`}>
      <span className={`prio-label prio-${name} shrink-0 inline-flex items-center gap-1.5 capitalize`}>
        <span className={`dot dot-${name}`} aria-hidden />
        {name}
      </span>
      <span className="text-[color:var(--muted)]">{rule}</span>
    </li>
  );
}
