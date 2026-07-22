"use client";

import { useEffect, useRef } from "react";

// Scroll-reveal wrapper: its direct children fade + rise in sequence when the group
// scrolls into view. Robust by construction:
//  - the hidden initial state is gated on `.js` (added before paint in the layout), so
//    no-JS visitors always see full content;
//  - if IntersectionObserver is missing, it reveals immediately;
//  - prefers-reduced-motion forces everything visible (see globals.css).
export default function Reveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let done = false;
    const reveal = () => {
      if (!done) {
        done = true;
        el.classList.add("in");
      }
    };

    if (!("IntersectionObserver" in window)) {
      reveal();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            reveal();
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 },
    );
    io.observe(el);

    // Safety net: content must never stay hidden if the observer never fires
    // (frozen viewport, exotic browser, extension interference). Reveals anyway.
    const fallback = setTimeout(reveal, 2500);

    return () => {
      io.disconnect();
      clearTimeout(fallback);
    };
  }, []);

  return (
    <div ref={ref} className={`reveal-group ${className}`}>
      {children}
    </div>
  );
}
