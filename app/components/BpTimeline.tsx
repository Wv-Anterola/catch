"use client";

import type { BpPoint } from "@/lib/types";

// Compact inline SVG timeline of systolic readings with the 140 threshold line.
export default function BpTimeline({ points }: { points: BpPoint[] }) {
  const pts = points.filter((p) => p.systolic != null);
  if (pts.length === 0) return <div className="text-xs text-muted">No readings on file.</div>;

  const W = 420, H = 120, padL = 30, padR = 8, padT = 10, padB = 18;
  const xs = pts.map((p) => new Date(p.date).getTime());
  const minX = Math.min(...xs), maxX = Math.max(...xs) || minX + 1;
  const sys = pts.map((p) => p.systolic as number);
  const minY = Math.min(120, ...sys) - 5;
  const maxY = Math.max(180, ...sys) + 5;

  const x = (t: number) => padL + ((t - minX) / (maxX - minX || 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - minY) / (maxY - minY)) * (H - padT - padB);
  const y140 = y(140);

  const path = pts.map((p, i) => `${i ? "L" : "M"}${x(xs[i]).toFixed(1)},${y(p.systolic as number).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Systolic blood pressure over time">
      {/* threshold */}
      <line x1={padL} x2={W - padR} y1={y140} y2={y140} stroke="#e0463a" strokeDasharray="4 3" strokeWidth={1} opacity={0.65} />
      <text x={padL} y={y140 - 3} fill="#e0463a" fontSize="9">140 threshold</text>
      {/* axis labels */}
      <text x={2} y={y(maxY - 5) + 3} fontSize="9" fill="#5b6673">{Math.round(maxY - 5)}</text>
      <text x={2} y={y(minY + 5) + 3} fontSize="9" fill="#5b6673">{Math.round(minY + 5)}</text>
      {/* line */}
      <path d={path} fill="none" stroke="#0a6c78" strokeWidth={1.5} />
      {/* points */}
      {pts.map((p, i) => {
        const high = (p.systolic as number) >= 140;
        return (
          <circle
            key={i}
            cx={x(xs[i])}
            cy={y(p.systolic as number)}
            r={high ? 3.2 : 2.2}
            fill={high ? "#e0463a" : "#0a6c78"}
          >
            <title>{`${p.date}: ${p.systolic}${p.diastolic ? "/" + p.diastolic : ""} mmHg`}</title>
          </circle>
        );
      })}
    </svg>
  );
}
