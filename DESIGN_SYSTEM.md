# CATCH — Design System

One calm, operational, public-health look. Neutrals + a single clinical-blue accent + restrained
semantic priority. Whitespace, alignment, and type hierarchy do the work; cards and badges are the
exception. Tokens live in `app/app/globals.css`.

## Color

| Token | Value | Use |
|---|---|---|
| `--bg` | `#f6f7f9` | page background |
| `--surface` | `#ffffff` | grouped-content panels (`.surface`) |
| `--panel` | `#fafbfc` | subtle inset (table header, action panel) |
| `--border` / `--border-strong` | `#e6e9ee` / `#d5dae1` | hairlines / control borders |
| `--ink` / `--muted` / `--faint` | `#182430` / `#5d6773` / `#949ca8` | text hierarchy |
| `--accent` / `--accent-ink` / `--accent-weak` | `#15588a` / `#0e436b` / `#eaf1f7` | the one accent: links, primary button, active nav, bars |

Semantic priority (used **sparingly** — dots, thin left bars, text; never full-row fills):
`--urgent #b3261e`, `--high #9a6206`, `--routine #3f7a52` (+ `-weak` tints). Success reuses routine,
warning reuses high, error reuses urgent. The population scatter uses a single accent→urgent
sequential ramp for rate (a data encoding, not decoration).

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
