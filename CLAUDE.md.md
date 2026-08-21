# GILD Preview Site

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