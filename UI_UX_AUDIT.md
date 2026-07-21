# CATCH — UI/UX Audit

Basis: current source + a reference capture of the queue. (Visual screenshots in the review
browser were blocked by a page-darkening extension; structure verified via DOM + builds. Final
visual sign-off should be done with that extension disabled — the demo hardening for it is in place.)

## Highest-impact problems

| # | Where | Problem | Correction |
|---|---|---|---|
| 1 | Landing / IA | The app opens directly on the queue. There is no calm "what did we find" screen; the product story competes with the worklist. | Add an **Overview** landing (`/`); move the queue to `/queue`. Overview = one headline, a few metrics, care-gap split, one primary CTA into the queue. |
| 2 | Queue header | Four bordered KPI cards ("Adults / Undiagnosed / Treated / Urgent") sit above the queue — a wall of cards competing with the actual product. | Remove the card wall on the queue. Keep a single slim summary line; the metrics live on Overview. |
| 3 | Queue rows | Every row carries rank + filled priority pill + patient id + category chip + city/age + reason + **up to 5 comorbidity tags**. The five tags repeat on most urgent rows, adding noise with no discriminating value. | Rebuild rows: thin priority indicator (bar + dot), patient id, category as plain text, one concise **evidence** line, location, status. Move comorbidities into the detail; show at most a compact risk count. |
| 4 | Color / badges | Filled colored priority pills, category chips, comorbidity chips, data-quality chip — too many badges and too much color. | One accent (clinical blue). Priority shown by a narrow colored bar + small dot + label, not a filled pill. Category and tags become quiet text. Status color only where it means something. |
| 5 | Containers | `.card` (border + radius + shadow) wraps stat tiles, filters, the list, the drawer, and every section on Population/Methodology → floating-card look. | Prefer whitespace, hairline dividers, and section headings. Reserve surfaces for genuinely grouped content. Remove nested cards. |
| 6 | Disclaimer | A heavy full-width dark-blue band is always on. | Slim, quiet persistent indicator ("Synthetic data") with the full explanation on Methodology. |
| 7 | Population | Funnel card + scatter card + bar card stacked as equal-weight boxes; the scatter reads decorative. | Lead with the funnel, then a calm two-up: geographic scatter + ranked community list. Always show denominators. No filler charts. |
| 8 | Methodology | A grid of definition cards + a meta card grid. | Readable **document** layout: short meta line, prose sections with headings. |
| 9 | Typography | Heavy use of `brand-ink`, mixed weights per component, all-caps micro-labels everywhere (tile labels, section headers, table headers). | One restrained type scale. Sentence-case section headings; reserve uppercase for tiny table headers only. Fewer weights. |
| 10 | Radius/spacing | Radii mix 12 (cards) / 999 (pills) / 6 (tags) / 8 (inputs); ad-hoc padding. | Token radii (6/8/10) and a 4-based spacing scale applied consistently. |
| 11 | Patient detail | Many equal sections stacked (metric grid, timeline, rule trace, evidence rows, outreach, button) → dense, developer-debugger feel. | Narrative order: Why flagged → Evidence (timeline) → Rule trace (collapsible) → Recommended action (draft, separated) → one action. Progressive disclosure for technical detail. |

## Design direction chosen
Calm, operational, public-health. Neutral surfaces, one clinical-blue accent, priority shown by
restrained indicators, strong type hierarchy over decoration, document layouts where reading
matters. Whitespace and alignment do the work; badges and cards are the exception, not the rule.

## Corrections applied
See `DESIGN_SYSTEM.md` for the final tokens, and the final report for the per-view changes.
