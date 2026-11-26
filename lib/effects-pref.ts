/**
 * Effektlarni yoqish/o'chirish sozlamasi (EffectsToggle tugmasi).
 * Tanlov brauzerda saqlanadi; daraja lib/perf.ts dagi window.__ecoPerf() bilan qayta hisoblanadi.
 */
import { perfTier } from "./perf";

export type EffectsPref = "on" | "off";

const KEY = "eco-effects";
export const EFFECTS_EVENT = "eco-effects-change";

export function writeEffectsPref(v: EffectsPref) {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* maxfiy rejimda saqlanmasligi mumkin */
  }
  const root = document.documentElement;
  (window as Window & { __ecoPerf?: () => void }).__ecoPerf?.();
  // Tanlov saqlanmagan bo'lsa ham (maxfiy rejim) shu sahifada darhol ishlasin
  if (v === "off") root.dataset.perf = "off";
  else if (root.dataset.perf === "off") root.dataset.perf = "lite";
  window.dispatchEvent(new CustomEvent(EFFECTS_EVENT, { detail: v }));
}

/** Hozir effektlar yoqilganmi */
export function effectsEnabled() {
  return perfTier() !== "off";
}
