"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/queue", label: "Outreach queue" },
  { href: "/population", label: "Geographic summary" },
  { href: "/methodology", label: "Methodology" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="bg-[color:var(--surface)] border-b border-border sticky top-0 z-30">
      <div className="mx-auto max-w-[1240px] px-6 h-14 flex items-center gap-8">
        <Link href="/" className="flex items-baseline gap-2 shrink-0">
          <span className="font-semibold tracking-tight text-[color:var(--accent-ink)] text-[15px]">CATCH</span>
          <span className="text-xs text-[color:var(--faint)] hidden md:inline">Care-gap alerts for treating community hypertension</span>
        </Link>
        <nav className="flex items-center gap-1 text-[13px]">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`px-3 py-1.5 rounded-[var(--r-sm)] transition-colors ${
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
          className="ml-auto hidden sm:flex items-center gap-1.5 text-[11px] text-[color:var(--muted)] hover:text-[color:var(--ink)]"
          title="These are synthetic records. See Methodology for scope and limits."
        >
          <span className="dot" style={{ background: "var(--faint)" }} aria-hidden />
          Synthetic data
        </Link>
      </div>
    </header>
  );
}
