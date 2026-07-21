# CATCH — Design System

One calm, operational, public-health look drawn straight from the CATCH logo: a deep navy-teal ink,
a teal accent (the ECG pulse), and a coral alert (the pulse dot), used sparingly. Neutrals carry the
page; whitespace, alignment, and type hierarchy do the work; cards and badges are the exception.
Tokens live in `app/app/globals.css`; brand assets are `public/catch-logo.png` (wordmark lockup),
`public/catch-mark.png` (icon), and `app/icon.png` (favicon).

## Color

Sampled from the logo: navy-teal `#0f3f52`, teal pulse `#0a8593`, soft teal ring `#74c4cc`, coral
dot `#f0503e`. Tokens derive interactive/text values from these (darkened where contrast needs it).

| Token | Value | Use |
|---|---|---|
| `--bg` | `#f4f7f8` | page background |
| `--surface` | `#ffffff` | grouped-content panels (`.surface`) |
| `--panel` | `#f7fafa` | subtle inset (table header, action panel) |
| `--border` / `--border-strong` | `#e2e9ec` / `#cfd9dd` | hairlines / control borders |
| `--ink` / `--muted` / `--faint` | `#12313d` / `#556169` / `#8a949c` | text hierarchy (navy-teal ink) |
| `--accent` / `--accent-ink` / `--accent-weak` | `#0a6c78` / `#0e3b4b` / `#e3f1f2` | the one accent (teal): links, primary button, active nav, bars |
| `--brand-teal` / `--brand-teal-soft` / `--coral` | `#0a8593` / `#74c4cc` / `#f0503e` | logo mark colors, for brand touches |

Semantic priority (used **sparingly** — dots, thin left bars, text; never full-row fills):
`--urgent #d1402e` (a contrast-safe coral), `--high #9a6206`, `--routine #3f7a52` (+ `-weak` tints).
Success reuses routine, warning reuses high, error reuses urgent. The population scatter uses a
single accent→urgent sequential ramp for rate (a data encoding, not decoration).

## Typography
System sans; base 14px / 1.5. Scale: page title 20px/600 · overview headline 26px/600 · section
heading 13–15px/600 · body 14px · table/meta 12–13px · caption 11px (`--faint`). Sentence case for
headings; uppercase reserved for the tiny `.eyebrow` label only. One weight step per component.

## Spacing, radius, elevation
4-based spacing. Radius tokens: `--r-sm 6` · `--r 8` · `--r-lg 10` (no pill/999 shapes except the
priority dot). Elevation is mostly hairline borders; `--shadow` is a single subtle token, used rarely.

## Layout widths
Overview `max-w-960` · Queue `max-w-1240` (two-column list + sticky detail) · Population `max-w-1100`
· Methodology `max-w-720` (document). Header `max-w-1240`. Each page owns its width and padding.

## Component principles
- **Surfaces** (`.surface`) only wrap genuinely grouped content (the queue list, the detail panel,
  a chart). No nested cards, no card-per-paragraph.
- **Priority** = a 3px left bar + a 7px dot + a small text label. No filled pills.
- **Buttons**: `.btn-primary` (accent) for the one main action per view; `.btn-ghost` otherwise.
- **Fields** (`.field`) share one border/radius/focus style. Filters are compact and resettable.
- **Progressive disclosure**: technical detail (the rule trace) lives in a native `<details>`.
- **Chips** (`.chip`) are quiet and rare; most metadata is plain muted text.

## Semantic priority treatment
| Priority | Dot / bar | Label color | Where |
|---|---|---|---|
| Urgent | `--urgent` | `--urgent` | queue bar+dot, detail header |
| High | `--high` | `--high` | same |
| Routine | `--routine` | `--routine` | same |
Status "Contacted" uses `--routine` text. Data-quality notes use `--high` text.

## Accessibility
Global `:focus-visible` outline in accent; `aria-current` on the active nav link; `aria-pressed`
on selected queue rows and toggles; labelled selects/inputs; semantic headings and `<dl>`/`<ol>`;
status conveyed by text + color (not color alone); `prefers-reduced-motion` disables transitions.
Committed to a light theme (`color-scheme: light`).
