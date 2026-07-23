"use client";

import { useRef, useState } from "react";
import type { BpPoint } from "@/lib/types";

// Systolic-over-time chart, built to be read at a glance:
//  - a shaded red zone above 140 so "elevated" reads by POSITION, not colour alone
//  - real date ticks on the x-axis, value ticks on the y-axis
//  - a recessive trend line with the readings as the hero marks
//  - the peak reading called out, and a hover crosshair with an exact-value tooltip
// Colour is a secondary cue (elevated points are also above the line and in the band),
// which keeps it colour-blind-safe.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDate(iso: string, withDay = false): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m) return iso;
  return withDay ? `${MONTHS[m - 1]} ${d}, ${y}` : `${MONTHS[m - 1]} ${y}`;
}

const THRESHOLD = 140;

export default function BpTimeline({ points, medStart }: { points: BpPoint[]; medStart?: string | null }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const pts = points
    .filter((p) => p.systolic != null)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  if (pts.length === 0) {
    return <div className="text-[12px] text-[color:var(--muted)]">No readings on file.</div>;
  }

  const W = 560, H = 190, padL = 34, padR = 14, padT = 16, padB = 30;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const xs = pts.map((p) => Date.parse(p.date));
  const sys = pts.map((p) => p.systolic as number);
  const readMinX = Math.min(...xs);
  const maxX = Math.max(...xs);

  // When a treatment-start date is known and it falls before the first reading, widen the
  // domain to the left so the marker sits truthfully in time. Cap the lead-in at half the
  // reading span so a decades-old start does not squash the readings; anything earlier is
  // clamped to the left edge and labeled with its real date.
  const medStartMs = medStart ? Date.parse(medStart) : NaN;
  const hasMed = !Number.isNaN(medStartMs);
  const readSpan = maxX - readMinX || 1;
  const minX =
    hasMed && medStartMs < readMinX ? Math.max(medStartMs, readMinX - readSpan * 0.5) : readMinX;
  const spanX = maxX - minX || 1;
  // marker x, clamped into the plot; flag when the true start is off the left edge.
  const medClampedMs = hasMed ? Math.min(Math.max(medStartMs, minX), maxX) : NaN;
  const medBeforeWindow = hasMed && medStartMs < minX;

  // y-domain snapped to tidy 10s, always covering the threshold and 180 severe line
  const rawMin = Math.min(120, ...sys);
  const rawMax = Math.max(185, ...sys);
  const minY = Math.floor((rawMin - 5) / 10) * 10;
  const maxY = Math.ceil((rawMax + 5) / 10) * 10;

  const x = (t: number) => padL + ((t - minX) / spanX) * plotW;
  const y = (v: number) => padT + (1 - (v - minY) / (maxY - minY)) * plotH;

  // y grid values every 20, plus the threshold
  const yTicks: number[] = [];
  for (let v = Math.ceil(minY / 20) * 20; v <= maxY; v += 20) yTicks.push(v);

  // x ticks: whole years across the span; fall back to first/last month when < 2 years
  const y0 = new Date(minX).getUTCFullYear();
  const y1 = new Date(maxX).getUTCFullYear();
  const years: number[] = [];
  for (let yr = y0; yr <= y1; yr++) years.push(yr);
  const step = years.length > 8 ? Math.ceil(years.length / 6) : 1;
  let xTicks = years
    .filter((_, i) => i % step === 0)
    .map((yr) => ({ t: Date.UTC(yr, 0, 1), label: String(yr) }))
    .filter((tk) => tk.t >= minX - 1000 * 60 * 60 * 24 * 200 && tk.t <= maxX);
  if (xTicks.length < 2) {
    xTicks = [
      { t: minX, label: fmtDate(pts[0].date) },
      { t: maxX, label: fmtDate(pts[pts.length - 1].date) },
    ];
  }

  const path = pts
    .map((p, i) => `${i ? "L" : "M"}${x(xs[i]).toFixed(1)},${y(p.systolic as number).toFixed(1)}`)
    .join(" ");

  const nHigh = sys.filter((v) => v >= THRESHOLD).length;
  const peakIdx = sys.indexOf(Math.max(...sys));
  const peakHigh = sys[peakIdx] >= THRESHOLD;

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const el = svgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vbX = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0, bestD = Infinity;
    for (let i = 0; i < xs.length; i++) {
      const d = Math.abs(x(xs[i]) - vbX);
      if (d < bestD) { bestD = d; best = i; }
    }
    setHover(best);
  }

  const hv = hover != null ? pts[hover] : null;
  const hvHigh = hv ? (hv.systolic as number) >= THRESHOLD : false;
  const tipLeft = hover != null ? Math.min(Math.max((x(xs[hover]) / W) * 100, 10), 90) : 0;
  const tipTop = hv ? (y(hv.systolic as number) / H) * 100 : 0;

  const ariaSummary =
    `Systolic blood pressure, ${fmtDate(pts[0].date)} to ${fmtDate(pts[pts.length - 1].date)}: ` +
    `${pts.length} readings, ${nHigh} at or above ${THRESHOLD} (elevated), peak ${Math.max(...sys)}.`;

  return (
    <figure className="m-0">
      {/* legend */}
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-1.5 text-[11px] text-[color:var(--muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "var(--urgent)" }} />
          Elevated (≥140)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "var(--accent)" }} />
          Normal
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-4 h-2.5 rounded-[2px]" style={{ background: "var(--urgent-weak)", border: "1px solid var(--urgent)", borderStyle: "dashed" }} />
          High-BP zone
        </span>
        {hasMed && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-4 h-0 border-t-[1.5px] border-dashed" style={{ borderColor: "var(--brand-teal)" }} />
            Meds started
          </span>
        )}
      </figcaption>

      <div className="relative w-full">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-none"
          role="img"
          aria-label={ariaSummary}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {/* elevated zone: everything at/above 140 */}
          <rect
            x={padL} y={y(maxY)} width={plotW} height={y(THRESHOLD) - y(maxY)}
            fill="var(--urgent)" opacity={0.06}
          />

          {/* y grid + value labels */}
          {yTicks.map((v) => {
            const isT = v === THRESHOLD;
            const isSevere = v === 180;
            return (
              <g key={v}>
                <line
                  x1={padL} x2={W - padR} y1={y(v)} y2={y(v)}
                  stroke={isT ? "var(--urgent)" : "var(--border)"}
                  strokeWidth={1}
                  strokeDasharray={isT ? "4 3" : undefined}
                  opacity={isT ? 0.7 : 0.9}
                />
                <text x={padL - 6} y={y(v) + 3} textAnchor="end" fontSize="9.5"
                  fill={isT ? "var(--urgent)" : "var(--faint)"}>
                  {v}
                </text>
                {isSevere && (
                  <text x={W - padR} y={y(v) - 3} textAnchor="end" fontSize="8.5" fill="var(--faint)">
                    severe 180
                  </text>
                )}
              </g>
            );
          })}
          {/* threshold label */}
          <text x={W - padR} y={y(THRESHOLD) - 3} textAnchor="end" fontSize="9" fontWeight={600} fill="var(--urgent)">
            high ≥ 140
          </text>

          {/* x axis baseline + date ticks */}
          <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} stroke="var(--border-strong)" strokeWidth={1} />
          {xTicks.map((tk) => (
            <g key={tk.t}>
              <line x1={x(tk.t)} x2={x(tk.t)} y1={H - padB} y2={H - padB + 4} stroke="var(--border-strong)" strokeWidth={1} />
              <text x={x(tk.t)} y={H - padB + 15} textAnchor="middle" fontSize="9.5" fill="var(--faint)">
                {tk.label}
              </text>
            </g>
          ))}

          {/* treatment-start marker: a teal line at the date antihypertensives began.
              Positioned truthfully in time; when the real start predates the chart it is
              pinned to the left edge and its label carries the actual date. */}
          {hasMed && (() => {
            const mx = x(medClampedMs);
            const labelX = Math.min(Math.max(mx + 4, padL + 4), W - padR - 4);
            const anchor = labelX > W - padR - 60 ? "end" : "start";
            return (
              <g>
                <line x1={mx} x2={mx} y1={padT} y2={H - padB}
                  stroke="var(--brand-teal)" strokeWidth={1.5} strokeDasharray="2 3" opacity={0.85} />
                <circle cx={mx} cy={padT} r={2.4} fill="var(--brand-teal)" />
                <text x={anchor === "end" ? mx - 4 : labelX} y={padT + 9} textAnchor={anchor}
                  fontSize="8.5" fontWeight={600} fill="var(--brand-teal)">
                  {medBeforeWindow ? `Rx since ${medStart!.slice(0, 4)}` : "Rx start"}
                </text>
              </g>
            );
          })()}

          {/* trend line (recessive) */}
          <path d={path} fill="none" stroke="var(--accent)" strokeWidth={1.25} opacity={0.35} />

          {/* hover crosshair */}
          {hover != null && (
            <line x1={x(xs[hover])} x2={x(xs[hover])} y1={padT} y2={H - padB}
              stroke="var(--muted)" strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
          )}

          {/* readings */}
          {pts.map((p, i) => {
            const high = (p.systolic as number) >= THRESHOLD;
            const isHover = hover === i;
            return (
              <circle
                key={i}
                cx={x(xs[i])}
                cy={y(p.systolic as number)}
                r={isHover ? 5 : high ? 3.4 : 2.8}
                fill={high ? "var(--urgent)" : "var(--accent)"}
                stroke="var(--surface)"
                strokeWidth={isHover ? 1.5 : 1}
                opacity={high ? 0.95 : 0.85}
              />
            );
          })}

          {/* peak callout (skip when hovering to avoid overlap) */}
          {hover == null && peakHigh && (
            <text
              x={Math.min(Math.max(x(xs[peakIdx]), padL + 24), W - padR - 24)}
              y={y(sys[peakIdx]) - 8}
              textAnchor="middle" fontSize="9.5" fontWeight={600} fill="var(--urgent)"
            >
              peak {sys[peakIdx]}
            </text>
          )}
        </svg>

        {/* tooltip */}
        {hv && (
          <div
            className="pointer-events-none absolute z-10 rounded-[6px] border border-[color:var(--border-strong)] bg-[color:var(--surface)] px-2 py-1 shadow-[0_2px_10px_rgba(16,24,40,0.14)]"
            style={{
              left: `${tipLeft}%`,
              top: `${tipTop}%`,
              transform: `translate(${tipLeft > 70 ? "-100%" : tipLeft < 30 ? "0" : "-50%"}, -125%)`,
              whiteSpace: "nowrap",
            }}
          >
            <div className="text-[11px] font-semibold text-[color:var(--ink)]">
              {(hv.systolic as number)}
              {hv.diastolic ? `/${hv.diastolic}` : ""} mmHg
              <span className="ml-1.5 font-medium" style={{ color: hvHigh ? "var(--urgent)" : "var(--routine)" }}>
                {hvHigh ? "elevated" : "normal"}
              </span>
            </div>
            <div className="text-[10.5px] text-[color:var(--muted)]">{fmtDate(hv.date, true)}</div>
          </div>
        )}
      </div>

      {hasMed && (
        <p className="mt-1 text-[11px] text-[color:var(--muted)]">
          <span className="font-medium text-[color:var(--brand-teal)]">Antihypertensive started {fmtDate(medStart!, true)}</span>
          {medBeforeWindow ? " (before the first reading shown)." : "."}
          {" "}Readings that stay high after this line are elevated despite treatment.
        </p>
      )}
    </figure>
  );
}
