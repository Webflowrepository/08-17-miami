# GILD Visual Direction

## Philosophy
Stripe Press meets cinematic late-night photography. Restraint quirúrgico de Linear/Apple, atmospheric depth de Hello Monday, paleta dark "private dinner near midnight."

## References (in order of weight)
1. press.stripe.com — typography restraint, single typeface used with intent
2. linear.app — spacing system, no dividers/borders, separation by air
3. apple.com (Vision Pro / AirPods Max launch pages) — dark editorial polish, fixed aspect ratios
4. hellomonday.com — photography treatment, cinematic full-bleed
5. Anthropic.com (current) — atmospheric subtle backgrounds

NOT references: Monocle (too dense), corporate event photo galleries (too obvious), wedding photographer Pic-Time (different category).

## Typography

### Family
ONE TYPEFACE: Inter Variable. Loaded from Google Fonts via @import in theme.css.
Optional second: JetBrains Mono — ONLY for colophon technical bits.
NO Fraunces, NO display serif of any kind.

### Scale (desktop)
| Use | Size | Weight | Tracking | Line-height |
|---|---|---|---|---|
| Display XL (cover title) | 96px | 500 | -3% (-0.03em) | 1.0 |
| Display L (section H2) | 56px | 500 | -2.5% | 1.05 |
| Display M (sub-headers) | 32px | 500 | -2% | 1.15 |
| Body L (lead) | 21px | 380 | -1% | 1.5 |
| Body M (default) | 17px | 400 | 0 | 1.55 |
| Body S | 14px | 420 | 0 | 1.5 |
| Eyebrow caps | 12px | 500 | +8% (0.08em) | 1.0 |
| Mono | 13px | 400 | 0 | 1.5 |

### Mobile scale (proportional)
Display XL: 56px / Display L: 36px / Display M: 24px / Body L: 18px / Body M: 16px / Body S: 13px / Eyebrow: 11px

### Rules
- NEVER mix two weights on the same line
- NEVER use italic except for: colophon section labels, sponsor line "Made possible with X."
- NEVER use uppercase except for: eyebrows, signal titles
- ALWAYS apply: font-feature-settings: "ss01", "cv11" on Inter for stylistic alternates

## Color (dark atmospheric)

```css
Listo. Te paso el paquete completo. Tres cosas:

Setup terminal (2 min)
Tres archivos a crear ANTES de abrir Antigravity (5 min)
El prompt para pegar en Antigravity (Fase 1: solo el Cover)


1. Setup terminal
Abrí terminal y corré esto:
bashmkdir -p ~/code/gild-preview && cd ~/code/gild-preview
git init
mkdir -p src/styles src/content src/components src/pages/editions/no-01 public/assets/photos
Quedás en la carpeta. No hagas pnpm init ni instales nada todavía — Antigravity lo hace.

2. Crear 3 archivos a mano (antes de abrir Antigravity)
Pegá estos 3 archivos en la carpeta ~/code/gild-preview/. Antigravity los va a leer y respetar.
Archivo 1: CLAUDE.md (raíz del proyecto)
markdown# GILD Preview Site

## Project
Building a navigable preview website for GILD, a private B2B operator community based in the US (Austin). Audience: potential sponsors. Goal: demonstrate the editorial product so sponsors understand what they receive as partners.

This is a PREVIEW for sales conversations — not production. Token validation is mocked, no real auth.

## Stack (pinned, non-negotiable)
- Astro 5.16+ TypeScript strict
- Tailwind v4.2 CSS-first config (@theme in src/styles/theme.css)
- GSAP 3.13 ScrollTrigger
- Lenis 1.3 (only on /editions/no-01 recap page)
- pnpm
- Deploy: Cloudflare Pages

## Visual direction
READ `VISUAL_DIRECTION.md` BEFORE WRITING ANY CODE OR CSS.
That document is the source of truth for typography, color, spacing, motion, photography, and hard "no" rules.

## Content
READ `src/content/edition-no-01.json` for ALL copy. NEVER paraphrase, NEVER invent text. If a string is missing from the JSON, ask before writing it.

## Workflow rules
1. PLAN MODE FIRST. Show plan before implementing. Always.
2. Build ONE section at a time. Wait for approval before next.
3. Use Context7 MCP when writing code with Astro, Tailwind v4, GSAP, or Lenis APIs to avoid outdated patterns.
4. NEVER use Tailwind v3 patterns (tailwind.config.js). v4 CSS-first only.
5. NEVER use Locomotive Scroll, Framer Motion, or any other animation library.
6. NEVER add icons from a library (Lucide, Heroicons, etc.). Unicode or inline SVG only.
7. NEVER use border, border-top, dividers for separation. Use spacing only.
8. NEVER use card shadows. Cards use --color-bg-elevated for distinction.
9. NEVER commit unless I explicitly say "commit".
10. NEVER deploy unless I explicitly say "deploy".

## Hard no's
- No commercial CTAs in /editions/no-01 recap (only mailto in colophon)
- No sponsor banners
- No tracking/analytics for this preview
- No real auth — token validation is mocked
- No contact forms — only mailto links
- No carousels, slideshows, auto-rotate
- No bento grids
- No glassmorphism, frosted blur
- No gradients (except the global atmospheric body gradient)
- No multiple typefaces (Inter only, optionally Mono)

## Done criteria
A section is "done" when:
1. Visual matches VISUAL_DIRECTION.md exactly
2. Mobile (375px) and desktop (1440px) both work
3. Motion respects prefers-reduced-motion
4. WCAG 2.2 AA contrast (verify with browser tools)
5. I confirm visually
Archivo 2: VISUAL_DIRECTION.md (raíz del proyecto)
markdown# GILD Visual Direction

## Philosophy
Stripe Press meets cinematic late-night photography. Restraint quirúrgico de Linear/Apple, atmospheric depth de Hello Monday, paleta dark "private dinner near midnight."

## References (in order of weight)
1. press.stripe.com — typography restraint, single typeface used with intent
2. linear.app — spacing system, no dividers/borders, separation by air
3. apple.com (Vision Pro / AirPods Max launch pages) — dark editorial polish, fixed aspect ratios
4. hellomonday.com — photography treatment, cinematic full-bleed
5. Anthropic.com (current) — atmospheric subtle backgrounds

NOT references: Monocle (too dense), corporate event photo galleries (too obvious), wedding photographer Pic-Time (different category).

## Typography

### Family
ONE TYPEFACE: Inter Variable. Loaded from Google Fonts via @import in theme.css.
Optional second: JetBrains Mono — ONLY for colophon technical bits.
NO Fraunces, NO display serif of any kind.

### Scale (desktop)
| Use | Size | Weight | Tracking | Line-height |
|---|---|---|---|---|
| Display XL (cover title) | 96px | 500 | -3% (-0.03em) | 1.0 |
| Display L (section H2) | 56px | 500 | -2.5% | 1.05 |
| Display M (sub-headers) | 32px | 500 | -2% | 1.15 |
| Body L (lead) | 21px | 380 | -1% | 1.5 |
| Body M (default) | 17px | 400 | 0 | 1.55 |
| Body S | 14px | 420 | 0 | 1.5 |
| Eyebrow caps | 12px | 500 | +8% (0.08em) | 1.0 |
| Mono | 13px | 400 | 0 | 1.5 |

### Mobile scale (proportional)
Display XL: 56px / Display L: 36px / Display M: 24px / Body L: 18px / Body M: 16px / Body S: 13px / Eyebrow: 11px

### Rules
- NEVER mix two weights on the same line
- NEVER use italic except for: colophon section labels, sponsor line "Made possible with X."
- NEVER use uppercase except for: eyebrows, signal titles
- ALWAYS apply: font-feature-settings: "ss01", "cv11" on Inter for stylistic alternates

## Color (dark atmospheric)

```css
@theme {
  /* Backgrounds */
  --color-bg-base: oklch(0.20 0.025 235);     /* #15212B near-black blue-tinted */
  --color-bg-deep: oklch(0.13 0.02 235);      /* #0B1419 gradient deepest */
  --color-bg-elevated: oklch(0.25 0.025 235); /* #1F2D38 cards */
  
  /* Foreground */
  --color-fg: oklch(0.97 0.002 90);           /* #F4F4F2 main text */
  --color-fg-muted: oklch(0.72 0.005 90);     /* #B5B5AE muted text */
  --color-fg-subtle: oklch(0.55 0.025 235);   /* #5C6B73 captions, eyebrows */
  
  /* Accent */
  --color-accent: oklch(0.65 0.06 195);       /* #5DA89F teal */
  --color-accent-dim: oklch(0.50 0.05 195);   /* #437A73 muted teal */
  
  /* Hairline (avoid) */
  --color-rule: oklch(0.30 0.02 235);
  
  /* Type */
  --font-display: "Inter", sans-serif;
  --font-body: "Inter", sans-serif;
  --font-mono: "JetBrains Mono", monospace;
}
```

### Atmospheric body background (global, all pages)

```css
body {
  background-color: var(--color-bg-base);
  background-image: radial-gradient(
    ellipse 140% 100% at 20% 5%,
    oklch(0.28 0.03 235) 0%,
    var(--color-bg-base) 45%,
    var(--color-bg-deep) 100%
  );
  min-height: 100vh;
  color: var(--color-fg);
}

body::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.06 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  mix-blend-mode: screen;
  opacity: 0.4;
}

main { position: relative; z-index: 1; }
```

### Color rules
- Background gradient is GLOBAL (all pages, fixed direction top-left → bottom-right). NEVER rotate or animate.
- Accent (teal) appears ONLY in: signal numbers (01, 02, 03), link hover state. NEVER as background.
- Cards use --color-bg-elevated. NO border, NO shadow.

## Spacing

### Baseline
8px. Every value multiple of 8. No exceptions. Allowed: 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 128, 160, 192, 256, 320.

### Layout
- Section padding vertical: 192px desktop / 96px mobile
- Section padding horizontal: 64px desktop / 24px mobile
- Block-to-block within section: 64px desktop / 48px mobile
- Element-to-element: 32 / 24 / 16 / 8
- Max content width: 720px (single-column)
- Max gallery width: 1280px

### Hard rule
NO BORDERS. NO DIVIDERS. NO LINES. Separation by spacing only. If a section needs visual separation, increase padding.

## Motion

### Easing
ALL animations: cubic-bezier(0.16, 1, 0.3, 1)

### Durations
- Entrance: 600ms
- Hover/state: 200ms
- Lightbox open/close: 300ms

### Stagger
60ms between list elements.

### ScrollTrigger
- Trigger at 25% viewport visibility
- once: true
- markers: false (production)

### Allowed
- opacity (0 → 1)
- translateY (max 24px)
- translateX (max 16px)

### Prohibited
- parallax of any kind
- scale on scroll
- rotate, skew
- scroll-jacking
- pinning sections
- magnetic cursors
- custom cursors of any kind

### prefers-reduced-motion
opacity-only fades, no transforms, no Lenis (native scroll).

## Photography

### Aspect ratios (fixed, no exceptions)
- Cover hero: 16:9 desktop, 4:5 mobile
- Gallery: mixed — 60% portrait 4:5, 30% wide 16:9, 10% square 1:1 (only for detail)
- Briefing PDF preview pages: 8.5:11 (US Letter)
- Sponsor logo: max-height 32px

### Treatment (dark bg specific)
- Cover photo: full-bleed in column, no padding
- Gallery photo: 4px subtle rounded corners (rounded-[4px])
- Lightbox backdrop: pure black (#000), NO blur
- Photos placeholder filter (Unsplash): `filter: brightness(0.95) saturate(0.92)` for tonal consistency with dark bg
- NO duotone, NO hue-rotate, NO heavy filters

### Cover photo — fade mask to integrate with bg
```css
.cover-photo {
  mask-image: linear-gradient(
    to bottom right,
    black 60%,
    transparent 100%
  );
}
```

## Iconography

ZERO icon libraries.
Allowed: → (arrow links), ↓ (download), × (multiplication, NOT letter x), · (middot)
Inline SVG with currentColor only when absolutely needed.