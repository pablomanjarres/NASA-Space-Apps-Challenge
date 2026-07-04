# GRIT-X-AWA — Design System Contract

**Aesthetic:** deep-space observatory / mission control. Refined and NASA-grade —
telemetry and instrumentation, not sci-fi cartoon. One unified cosmic palette on a
deep-void base, hairline borders, glass panels, exactly one soft shadow, generous
restraint. Grounded in the "command-center / blueprint" reference direction
(near-black ground + a single cyan signal, HUD hairlines).

This file is the **contract**. New/re-skinned surfaces must consume these tokens.
Source of truth: `tailwind.config.mjs` (scales) + `src/styles/global.css` (CSS vars,
semantic surfaces, reconciled utilities). Dark is the primary theme; light is a
graceful fallback (`html:not(.dark)`).

---

## 1. Palette + roles

One system. Four families. Do not introduce new hues.

| Role | Token family | Key value | Use for |
|------|--------------|-----------|---------|
| **Void** (base) | `void` | `#070b16` (900) | page background, deep chrome, panel grounds |
| **Nebula** (mid-tone) | `nebula` | `#8b5cf6` (500) | structural indigo/violet: gradients, secondary highlights, ambient glows |
| **Stellar** (accent) | `stellar` | `#22d3ee` (400) | THE accent — data, links, active state, focus, hairline emphasis |
| **Signal** (warm) | `signal` | `#f5a524` (500) | **CTAs / primary actions only.** Scarce by design. |

Void ramp: `950 #04060d · 900 #070b16 · 800 #0b1122 · 700 #111a30 · 600 #1a2440 · 500 #243156`
Nebula ramp: `300 #c4b5fd · 400 #a78bfa · 500 #8b5cf6 · 600 #7c5cf0 · 700 #5b4bd6`
Stellar ramp: `200 #a5f0fb · 300 #67e8f9 · 400 #22d3ee · 500 #06b6d4 · 600 #0891b2`
Signal ramp: `300 #ffd28a · 400 #f7b23f · 500 #f5a524 · 600 #d98a1a · 700 #b06d12`

**This is the unification.** The hero's old indigo/orange and the dashboard's old
purple/cyan now resolve to: indigo/violet → **nebula**, orange → **signal amber**,
cyan → **stellar**. Same four tokens everywhere.

### Semantic surfaces (CSS-var-backed, theme-aware)
`--bg` · `--surface` / `surface-raised` / `surface-sunken` · `--panel` · `--border` / `border-strong`
Tailwind: `bg-surface`, `bg-surface-raised`, `border-hairline`, `border-hairline-strong`.

### 3 semantic text roles
| Role | Var | Dark value | Meaning |
|------|-----|-----------|---------|
| Primary | `--text-primary` | `#e8ecf8` | headings, key values |
| Secondary | `--text-secondary` | `#9aa6c8` | body, supporting copy |
| Tertiary | `--text-tertiary` | `#626d92` | captions, labels, hairline meta |

Tailwind `text-ink` / `text-ink-secondary` / `text-ink-tertiary`, or the CSS classes
`.text-primary` / `.text-secondary` / `.text-tertiary`. Plus `.text-accent` (stellar)
and `.text-signal` (amber) for emphasis.

---

## 2. Type

| Role | Family | Token | Where |
|------|--------|-------|-------|
| **Display** | **Chakra Petch** | `font-display` | headlines, hero title, section headers, big numbers |
| **Body / UI** | Inter | `font-sans` (default) | paragraphs, controls, general UI |
| **Telemetry / data** | JetBrains Mono | `font-mono` | metrics, readouts, coordinates, code, tabular data |

**Why Chakra Petch:** a squared, semi-condensed "control-panel" face — reads as
instrument/HUD telemetry, distinctive, and pairs cleanly with JetBrains Mono. Not
Inter/system, and deliberately not Space Grotesk. Loaded via Google Fonts in
`Layout.astro`. `h1,h2,h3` get the display font automatically (base layer).

**Display type scale** (fluid, additive): `text-display-2xl` · `text-display-xl` ·
`text-display-lg` · `text-eyebrow` (0.2em tracked label). Body sizes use Tailwind's
default scale.

---

## 3. Space, radius, shadow

- **Spacing:** Tailwind's 4px scale (`p-2`=8px, `p-4`=16px, `p-6`=24px, `p-8`=32px…). Use it; don't hand-roll pixel padding.
- **Radius scale:** `rounded-control` (10px, buttons/inputs) · `rounded-card` (16px, cards/tiles) · `rounded-panel` (20px, large glass) · `rounded-pill` (999px).
- **Shadow — exactly one soft shadow:** `shadow-panel` (`--shadow-panel`) for panels/cards; `shadow-elevated` for hover lift. Accent glows `shadow-glow-stellar` / `shadow-glow-signal` are for **focus/active only**, not decoration.

---

## 4. Reconciled utilities (already wired to tokens)

- `.glass` — `--panel` fill + `blur(16px) saturate(140%)` + 1px `--border` hairline + `--shadow-panel`. (No chunky borders, one shadow.)
- `.panel` — solid `--surface` variant of the above at `--radius-panel`.
- `.gradient-text` — stellar→nebula sweep (cyan→violet). The one sanctioned text gradient.
- `.btn-primary` — **solid signal amber, dark ink** = the primary CTA. Scarce.
- `.btn-secondary` — transparent, stellar hairline outline, subtle stellar wash on hover.
- `.btn-space` — shared button base (display font, `--radius-control`, restrained press, **no scale-105 bounce**).
- Helpers: `.hud-grid` / `bg-hud-grid` (blueprint hairline grid), `bg-nebula-veil` (ambient corner glow), `.card-hover`, `.hairline` / `.hairline-strong`.

---

## 5. Cursor — CHOSEN: `CustomCursor.tsx`

**One cursor system: the React `CustomCursor.tsx` reticle** (ring + dot follower),
mounted once in `Layout.astro`. The cartoonish SVG "spaceship" CSS cursors were
**removed** from `global.css` (they were dead anyway — CustomCursor sets
`cursor: none`). Retuned to palette: idle/hover = stellar→nebula, **click = signal
amber** (was off-palette pink). Hidden on ≤768px and in 3D fullscreen; decorative
pulse/scale gated behind `prefers-reduced-motion`.

---

## 6. Anti-slop rules (enforce on every surface)

1. **One accent budget.** Stellar for state/data, nebula for structure, signal amber for CTAs **only**. Keep chromatic ink under ~5% of a surface so the void reads as premium.
2. **Signal amber is scarce.** If two things are amber, one is wrong.
3. **Hairline borders, not chunky.** `--border` / `--border-strong` (1px). No 2px+ frames.
4. **One soft shadow.** `shadow-panel`. No gradient-on-everything, no stacked neon shadows outside focus/active.
5. **Restraint over motion.** Subtle transitions; no scale-105 bounce on buttons. Honor `prefers-reduced-motion` (global guard in `global.css`).
6. **Type does the work.** Display (Chakra Petch) for headings, mono (JetBrains) for all numbers/telemetry, Inter for prose. Three roles, no more.
7. **Tokens only.** No new raw hexes. Reach for `void/nebula/stellar/signal/ink/surface/hairline`.
8. **Never fabricate data.** Real numbers in `Dashboard.tsx` `modelMetricsData` and everything under `src/services`, `src/config`, `src/pages/api` are restyle-display-only.

---

## 7. Foundation change log

**Build blockers fixed (were failing the build):**
- `src/pages/index.astro` — removed the import of the non-existent `../components/Footer.astro`; removed the nested `<body>` inside Layout's `<body>`; removed the duplicated dark-mode init `<script>` (the canonical one lives in `Layout.astro`).
- `src/styles/global.css` — repaired the mangled `@tailwind components;` directive (a duplicate cursor + keyframes block had been pasted between `@tailwind base` and `@tailwind utilities`); restored the three clean directives and de-duplicated.
- `src/pages/api/test-env.ts` — **deleted** (returned `.env` contents — a security leak).

**System established:** unified palette + semantic surfaces + 3 text roles + type/spacing/radius/shadow tokens (`tailwind.config.mjs` + `global.css`); Chakra Petch + JetBrains Mono loaded in `Layout.astro`; `.glass` / `.gradient-text` / `.btn-*` reconciled to tokens; hero (`Hero.css`) retuned to the palette; single cursor chosen.

**Bundle trim (manifest-only, zero imports confirmed):** removed `plotly.js`,
`react-plotly.js`, `@tensorflow/tfjs`, `ml-matrix`, `react-router-dom`, and the
orphaned `@types/plotly.js` from `package.json`. `html2canvas` was **kept** (it is
dynamically imported — appears in the build).

**Legacy:** the `space` (sky) and `cosmic` (purple) Tailwind scales are retained so
existing markup keeps rendering. They are **deprecated** — migrate to
`void/nebula/stellar/signal` when re-skinning each surface.
