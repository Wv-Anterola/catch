"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { assetUrl } from "@/lib/paths";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/queue", label: "Worklist" },
  { href: "/population", label: "Map" },
  { href: "/equity", label: "Equity" },
  { href: "/methodology", label: "Methodology" },
  { href: "/roadmap", label: "Roadmap" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-[color:var(--surface)]/80 backdrop-blur-md supports-[backdrop-filter]:bg-[color:var(--surface)]/70">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 h-14 flex items-center gap-4 sm:gap-8">
        <Link href="/" className="group flex items-center gap-2.5 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={assetUrl("catch-mark.png")} alt="" width={26} height={26} className="h-[26px] w-[26px] transition-transform duration-200 group-hover:scale-105" aria-hidden />
          <span className="font-semibold tracking-tight text-[color:var(--accent-ink)] text-[15px]">CATCH</span>
          <span className="hidden md:inline h-3.5 w-px bg-[color:var(--border-strong)]" aria-hidden />
          <span className="text-[11.5px] text-[color:var(--faint)] hidden md:inline leading-tight max-w-[14rem]">Care-gap alerts for treating community hypertension</span>
        </Link>

        {/* desktop / tablet nav */}
        <nav className="hidden sm:flex items-center gap-0.5 text-[13px]">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`relative px-3 py-1.5 rounded-[var(--r-sm)] transition-colors ${
                isActive(l.href)
                  ? "text-[color:var(--accent-ink)] font-semibold bg-[color:var(--accent-weak)]"
                  : "text-[color:var(--muted)] hover:text-[color:var(--ink)] hover:bg-[color:var(--panel)]"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/methodology"
          className="live-readout ml-auto hidden sm:flex hover:text-[color:var(--ink)] transition-colors"
          title="These are synthetic records, updating live in the demo. See Methodology for scope and limits."
        >
          <span className="pulse-dot inline-block w-[7px] h-[7px] text-[color:var(--brand-teal)]" aria-hidden>
            <span className="pulse-core beat" />
          </span>
          Synthetic · live demo
        </Link>

        {/* mobile menu button */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="ml-auto sm:hidden grid place-items-center w-11 h-11 -mr-1 rounded-[var(--r-sm)] text-[color:var(--ink)] hover:bg-[color:var(--panel)]"
        >
          <span className="relative block w-5 h-4" aria-hidden>
            <span
              className={`absolute left-0 h-[2px] w-5 bg-current rounded transition-all ${open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0"}`}
            />
            <span
              className={`absolute left-0 top-1/2 -translate-y-1/2 h-[2px] w-5 bg-current rounded transition-opacity ${open ? "opacity-0" : "opacity-100"}`}
            />
            <span
              className={`absolute left-0 h-[2px] w-5 bg-current rounded transition-all ${open ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-0"}`}
            />
          </span>
        </button>
      </div>

      {/* mobile dropdown panel */}
      {open && (
        <nav
          id="mobile-nav"
          className="sm:hidden border-t border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2"
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`flex items-center min-h-[44px] px-3 rounded-[var(--r-sm)] text-[14px] ${
                isActive(l.href)
                  ? "text-[color:var(--accent-ink)] font-semibold bg-[color:var(--accent-weak)]"
                  : "text-[color:var(--muted)] hover:text-[color:var(--ink)] hover:bg-[color:var(--panel)]"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <div className="flex items-center gap-1.5 min-h-[40px] px-3 text-[12px] text-[color:var(--faint)]">
            <span className="dot" style={{ background: "var(--faint)" }} aria-hidden />
            Synthetic data. See Methodology for scope and limits.
          </div>
        </nav>
      )}
    </header>
  );
}
