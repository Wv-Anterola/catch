"use client";

import { useEffect, useRef, useState } from "react";

// Animated number that counts up when it scrolls into view. SSR (and no-JS, and
// reduced-motion) render the final value, so the correct number is always present;
// JavaScript only adds the count-up flourish on top.
export default function CountUp({
  to,
  suffix = "",
  duration = 1100,
}: {
  to: number;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(to);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window) || typeof requestAnimationFrame !== "function") {
      setVal(to);
      return;
    }

    let raf = 0;
    let started = false;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !started) {
            started = true;
            io.disconnect();
            const t0 = performance.now();
            const tick = (now: number) => {
              const p = Math.min((now - t0) / duration, 1);
              const eased = 1 - Math.pow(1 - p, 3);
              setVal(to * eased);
              if (p < 1) raf = requestAnimationFrame(tick);
              else setVal(to);
            };
            setVal(0);
            raf = requestAnimationFrame(tick);
          }
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [to, duration]);

  return <span ref={ref}>{Math.round(val).toLocaleString()}{suffix}</span>;
}
