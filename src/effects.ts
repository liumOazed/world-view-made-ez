import { useSyncExternalStore } from 'react';

/**
 * "Reduced effects" mode: turns off the globe's spin, flowing arcs, glass blur
 * and other motion. It follows the system's reduced-motion setting until the
 * visitor flips the toggle, and the choice is remembered on this device.
 */

const KEY = 'atlas-effects';
const listeners = new Set<() => void>();
const media = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-reduced-motion: reduce)') : undefined;

function stored(): 'full' | 'reduced' | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'full' || v === 'reduced' ? v : null;
  } catch {
    return null;
  }
}

function compute(): boolean {
  const s = stored();
  return s ? s === 'reduced' : !!media?.matches;
}

let reduced = typeof window !== 'undefined' ? compute() : false;

function apply() {
  if (typeof document !== 'undefined') document.documentElement.dataset.effects = reduced ? 'reduced' : 'full';
}
apply();

function emit() {
  apply();
  listeners.forEach((l) => l());
}

media?.addEventListener?.('change', () => {
  if (stored()) return;
  reduced = compute();
  emit();
});

export function setReducedEffects(on: boolean) {
  reduced = on;
  try {
    localStorage.setItem(KEY, on ? 'reduced' : 'full');
  } catch {
    /* private mode: the choice lasts for this visit only */
  }
  emit();
}

export function useReducedEffects(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => reduced,
    () => false,
  );
}
