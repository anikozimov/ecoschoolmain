"use client";

import { useEffect, useState } from "react";
import { EFFECTS_EVENT, effectsEnabled, writeEffectsPref } from "@/lib/effects-pref";

/**
 * Effektlarni yoqish/o'chirish tugmasi.
 *  variant="icon"  — sarlavhadagi dumaloq tugma
 *  variant="row"   — menyu ichidagi to'liq qator (yozuv + kalit)
 */
export default function EffectsToggle({ variant = "icon", className = "" }: { variant?: "icon" | "row"; className?: string }) {
  const [on, setOn] = useState<boolean | null>(null);

  useEffect(() => {
    const sync = () => setOn(effectsEnabled());
    const t = window.setTimeout(sync, 0); // birinchi chizishdan keyin (server bilan mos kelishi uchun)
    window.addEventListener(EFFECTS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EFFECTS_EVENT, sync);
      window.removeEventListener("storage", sync);
      window.clearTimeout(t);
    };
  }, []);

  const toggle = () => writeEffectsPref(on ? "off" : "on");
  const label = on ? "Effektlarni o‘chirish" : "Effektlarni yoqish";

  if (on === null) {
    return variant === "icon" ? <span className={`h-10 w-10 rounded-full bg-line/60 ${className}`} /> : null;
  }

  if (variant === "row") {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={toggle}
        className={`flex w-full items-center gap-3 rounded-2xl bg-ink/[0.05] px-4 py-3 text-left ring-1 ring-ink/10 ${className}`}
      >
        <span className="text-xl">{on ? "✨" : "🌙"}</span>
        <span className="flex-1">
          <span className="block text-sm font-extrabold">Effektlar</span>
          <span className="block text-xs text-muted">{on ? "Yoqilgan — telefon qotsa, o‘chiring" : "O‘chirilgan — sayt tezroq ishlaydi"}</span>
        </span>
        <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-glow" : "bg-ink/15"}`}>
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-6" : "left-1"}`} />
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      title={label}
      onClick={toggle}
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border text-lg transition ${
        on ? "border-leaf-400/40 bg-leaf-100 text-ink" : "border-line bg-surface text-muted"
      } hover:border-forest-500/50 ${className}`}
    >
      <span aria-hidden>{on ? "✨" : "🌙"}</span>
    </button>
  );
}
