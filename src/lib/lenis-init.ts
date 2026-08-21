/**
 * GILD Preview — Lenis Smooth Scroll Init
 * Only used on /editions/no-01 page, NOT global.
 * Source: CLAUDE.md — "Lenis 1.3 (only on /editions/no-01 recap page)"
 *
 * prefers-reduced-motion: skip Lenis entirely, use native scroll.
 */

import Lenis from 'lenis';

let lenisInstance: Lenis | null = null;

export function initLenis(): void {
  /* Respect reduced motion — use native scroll */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  lenisInstance = new Lenis({
    duration: 1.2,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    touchMultiplier: 2,
  });

  function raf(time: number): void {
    lenisInstance?.raf(time);
    requestAnimationFrame(raf);
  }

  requestAnimationFrame(raf);
}

export function destroyLenis(): void {
  lenisInstance?.destroy();
  lenisInstance = null;
}
