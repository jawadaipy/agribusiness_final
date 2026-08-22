# AgriBusiness.pk — Field Ledger Design System

The visual identity: **a mandi register, professionally kept.** Evergreen ink on
rice-paper canvas, harvest-gold used only where money moves, tabular numerals
for every figure, hairline rules where a ledger would rule. The dark exchange
board is the one dramatic surface — everything else stays quiet so the data
speaks.

**What this system is not:** glassmorphism, glow shadows, gradient text,
button light-sweeps, purple AI-gradient anything. If a class isn't in this
document, it doesn't exist.

---

## Colors

Single token system in `src/styles.css` `@theme` (Tailwind v4). shadcn-style
`:root` vars mirror the same values — never introduce a second palette.

| Token | Value | Use |
|---|---|---|
| `primary` / `on-primary` | `#0f5132` / `#ffffff` | Brand green, primary buttons, links |
| `primary-container` | `#0b3d27` | Hover/pressed primary, dark panels |
| `primary-light` | `#2d7a56` | `em` accents in display text |
| `secondary` (gold) | `#d98b1d` | Money moments only: rates, CTAs on dark, eyebrow rules |
| `on-secondary` | `#2e1e05` | **Dark ink on gold** — never white-on-gold (fails contrast) |
| `secondary-container` | `#f8e8c9` | Gold chip backgrounds |
| `exchange` | `#08160f` | The dark board surface (hero, CTA band) |
| `exchange-raised` | `#0d2a1d` | Raised panels on the board |
| `on-exchange` / `on-exchange-muted` | `#e9f2ec` / `#9db5a8` | Text on the board |
| `background` | `#f5f7f3` | Rice-canvas page background |
| `surface` + 5-step container ramp | `#ffffff` → `#d2ded3` | Cards, inputs, chips (Material-3 ramp) |
| `outline` / `outline-variant` / `input-border` | `#83948b` / `#d8e0d8` / `#b9c9bf` | Borders; inputs use `input-border` |
| `error` / `success` | `#dc2626` / `#16a34a` | Semantics only |

Rules:
- Gold is an **accent**, never a large background. The only gradients:
  `gradient-agri` (evergreen) on banner surfaces.
- Hardcoded hex in components is a bug — add a token instead.
- Tailwind default palette (`emerald-*`, `red-*`, `blue-*`, `slate-*`) is
  off-system. Use `success`, `error`, and brand tokens.

## Typography

- **Inter** (300–900) — body, UI. **Space Grotesk** (400–700) — headings via
  `font-display`. **Noto Nastaliq Urdu** — `[dir="rtl"]` body at `line-height: 2.75`.
- Fonts load once via `<link>` in `__root.tsx`. Do not `@import` them again.
- **12px minimum.** No `text-[9px]`/`text-[10px]`/`text-[11px]` anywhere —
  labels use `text-xs` (12px) with tracking; badges use `.badge-*` classes.
- Numerals in stats/prices/rates: `.stat-num` (tabular figures).
- Hero display: `.display-hero` (Space Grotesk 600, `-0.032em`, lh 1.02; `em`
  inside renders in `primary-light`, on dark in `secondary-light`).
- Section label: `.eyebrow` — 12px bold uppercase, `0.16em` tracking, gold
  18×2px rule before. This is the only eyebrow.

## Spacing & layout

- Container: `max-w-container-max` (1240px). Page margins:
  `px-margin-mobile` (16px) / `md:px-margin-desktop` (48px).
- Radii: `rounded-xl` controls · `rounded-2xl` cards · `rounded-3xl/4xl`
  feature panels only.
- Elevation: one system — `--shadow-lift-1/2/3` tokens, consumed via
  `.card-shadow` (lift-1) and `.card-shadow-hover` (lift-2).

## Components

- Buttons: `.btn-primary` / `.btn-secondary` / `.btn-ghost` / `.control-secondary`.
  Secondary = gold bg + dark ink. No light-sweep effects.
- Badges: `.badge-primary` / `.badge-gold` / `.badge-success` — 12px, tokens.
- Cards: `bg-surface` (white) or `bg-surface-container-low`, `border-outline-variant/50`,
  `.card-shadow`, `.hover-lift` when interactive.
- Skeletons: `.skeleton` (brand-tinted ramp, never slate).
- Tags: `.tag-pill`. Ledger rules between data rows: `.rule-ledger`.
- Field texture for hero/dark surfaces: `.bg-field-grid` / inline ruled lines
  at 44px. Dot texture: `.section-dots` (use sparingly).

## Motion

- Shared framer-motion eases live next to each consumer as `EASE_OUT_EXPO`
  (`[0.16, 1, 0.3, 1]`); CSS counterparts are `--ease-out-expo` /
  `--ease-spring`. Durations: micro 150ms, fast 250ms, reveal 500ms.
- Animate **transform and opacity only**. Stagger children 0.07–0.1s.
  Scroll reveals: `Reveal`/`RevealGroup`/`RevealItem` from
  `@/components/motion/Reveal` with `viewport={{ once: true }}`.
- Every animated component must respect `useReducedMotion()`; CSS animations
  are killed globally under `prefers-reduced-motion`.
- Exchange-board effects (dark hero only): `.scanline`, `.row-flash`,
  `.delta-pulse`, `.glow-breathe`. They do not migrate to light surfaces.

## Data honesty

- Anything labelled "live" must actually poll (`useMarketRates`, 60s,
  paused when tab hidden).
- Change percentages are computed from real rate-date history, never
  fabricated from a trend glyph.
- Fallback/indicative data must be labelled as such.
- No invented counts ("12.4k listings") — counts come from the database or
  don't render.

## Accessibility floor

- Icon-only buttons need `aria-label`; Material Symbols spans get `aria-hidden`.
- Images: descriptive `alt`, or `alt=""` + `aria-hidden` when decorative.
- Global `:focus-visible` ring (2px primary) — don't override with fainter rings.
- The rate board renders `role="table"`/`row`/`cell` semantics with an
  sr-only trend word, not just colored arrows.
