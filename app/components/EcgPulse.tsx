// The CATCH signature: a single-lead ECG trace. It draws itself once on mount
// (stroke-dashoffset), then holds. Pure SVG/CSS, no JS timers; the trace fades in
// at both ends so it reads as a strip pulled from a live monitor. Reduced motion
// freezes it fully drawn.
//
// The path is one PQRST complex that returns exactly to baseline, tiled across the
// full width, so it reads as a real rhythm strip rather than a decorative squiggle.
const BEAT_W = 56; // width of one PQRST complex, in viewBox units
const BASE_Y = 32; // baseline (viewBox is 64 tall)

// one heartbeat, relative segments, net vertical displacement = 0:
// flat · P bump · flat · Q dip · R spike · S dip · return · T bump · flat
const BEAT =
  "l16 0 q4 -6 8 0 l6 0 l2 4 l3 -26 l3 30 l2 -8 q5 -7 10 0 l6 0";

export default function EcgPulse({
  className = "",
  strokeWidth = 2,
  height = 64,
  width = 1232, // viewBox width; tiled with whole beats
}: {
  className?: string;
  strokeWidth?: number;
  height?: number;
  width?: number;
}) {
  const beats = Math.ceil(width / BEAT_W);
  const vbW = beats * BEAT_W;
  const d = `M0 ${BASE_Y} ${BEAT.repeat(beats)}`;
  // dash generously longer than the traced length so the whole line sweeps in
  const dash = beats * 125;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${vbW} 64`}
      height={height}
      width="100%"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden
      role="presentation"
    >
      <defs>
        <linearGradient id="ecgFade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--brand-teal)" stopOpacity="0" />
          <stop offset="0.1" stopColor="var(--brand-teal)" stopOpacity="0.9" />
          <stop offset="0.85" stopColor="var(--accent)" stopOpacity="0.9" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={d}
        stroke="url(#ecgFade)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="ecg-trace"
        style={{ ["--dash" as string]: `${dash}` }}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
