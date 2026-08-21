/**
 * GILD Preview — GSAP Utilities
 * Entrance animation helpers using GSAP 3.13+ with ScrollTrigger.
 * Source: VISUAL_DIRECTION.md § Motion
 *
 * Easing: cubic-bezier(0.16, 1, 0.3, 1)  →  GSAP CustomEase or "power4.out"
 * Duration: 600ms
 * Trigger: 25% viewport visibility (start: "top 75%")
 * Allowed transforms: opacity (0→1), translateY (max 24px)
 * prefers-reduced-motion: opacity-only, no transforms
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* Custom ease matching cubic-bezier(0.16, 1, 0.3, 1) */
const EASE = 'power4.out';
const DURATION = 0.6;
const STAGGER_LINES = 0.2; // 200ms between title lines
const STAGGER_LIST = 0.06; // 60ms between list elements
const TRANSLATE_Y = 24;

/** Check if user prefers reduced motion */
function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Fade-up entrance for cover title lines.
 * Each line is wrapped in <span class="block overflow-hidden">
 *   <span class="cover-line block">...</span>
 * </span>
 *
 * Animates the inner .cover-line spans with translateY mask reveal.
 */
export function animateCoverTitle(
  triggerElement: string | Element,
  lineSelector: string = '.cover-line'
): void {
  const lines = gsap.utils.toArray<HTMLElement>(lineSelector);
  if (!lines.length) return;

  const reduced = prefersReducedMotion();

  gsap.set(lines, {
    opacity: 0,
    y: reduced ? 0 : TRANSLATE_Y,
  });

  gsap.to(lines, {
    opacity: 1,
    y: 0,
    duration: DURATION,
    ease: EASE,
    stagger: reduced ? 0 : STAGGER_LINES,
    scrollTrigger: {
      trigger: triggerElement,
      start: 'top 75%',
      once: true,
      markers: false,
    },
  });
}

/**
 * Generic fade-up entrance for a set of elements.
 * Used for metadata, sponsor line, CTA, etc.
 */
export function animateFadeUp(
  triggerElement: string | Element,
  targetSelector: string,
  options?: {
    stagger?: number;
    delay?: number;
  }
): void {
  const elements = gsap.utils.toArray<HTMLElement>(targetSelector);
  if (!elements.length) return;

  const reduced = prefersReducedMotion();

  gsap.set(elements, {
    opacity: 0,
    y: reduced ? 0 : TRANSLATE_Y,
  });

  gsap.to(elements, {
    opacity: 1,
    y: 0,
    duration: DURATION,
    ease: EASE,
    stagger: reduced ? 0 : (options?.stagger ?? STAGGER_LIST),
    delay: options?.delay ?? 0,
    scrollTrigger: {
      trigger: triggerElement,
      start: 'top 75%',
      once: true,
      markers: false,
    },
  });
}
