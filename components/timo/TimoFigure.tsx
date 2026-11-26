"use client";

import Image from "next/image";
import timoImg from "@/public/timo-sm.webp";
import type { OutfitId } from "@/lib/timo";

/** Kiyim — Timo boshi ustiga chiziladi (100×60 koordinatalar) */
export function OutfitArt({ outfit }: { outfit: OutfitId }) {
  switch (outfit) {
    case "leaf":
      return (
        <g>
          {[-40, -24, -8, 8, 24, 40].map((a, i) => {
            const r = (a * Math.PI) / 180;
            const x = 50 + Math.sin(r) * 34;
            const y = 50 - Math.cos(r) * 20;
            return (
              <g key={i} transform={`translate(${x} ${y}) rotate(${a + (i % 2 ? 18 : -18)})`}>
                <ellipse rx="6.5" ry="11" fill={i % 2 ? "#3fa34d" : "#7fd65a"} stroke="#1d6b33" strokeWidth="1" />
                <path d="M0 -9 V9" stroke="#1d6b33" strokeWidth="0.8" />
              </g>
            );
          })}
          <circle cx="50" cy="28" r="5" fill="#ffd34d" stroke="#e0a41b" strokeWidth="1" />
          <circle cx="50" cy="28" r="2" fill="#e0a41b" />
        </g>
      );
    case "cap":
      return (
        <g>
          <path d="M18 50 C18 24 34 12 52 12 C70 12 84 24 84 50 Z" fill="#1d7438" stroke="#0f4a22" strokeWidth="1.6" />
          <path d="M52 12 V50 M34 16 C30 28 30 40 32 50 M70 16 C74 28 74 40 72 50" stroke="#0f4a22" strokeWidth="1" opacity="0.5" fill="none" />
          <path d="M76 46 C88 44 98 46 100 52 C92 55 82 54 74 52 Z" fill="#165c2c" stroke="#0f4a22" strokeWidth="1.4" />
          <circle cx="52" cy="12" r="3" fill="#b4f07f" />
          <circle cx="52" cy="34" r="8" fill="#fff" />
          <path d="M52 39 C48 35 47 31 48 28 C51 29 53 32 52 39 Z M52 39 C56 35 57 31 56 28 C53 29 51 32 52 39 Z" fill="#2fae6a" />
        </g>
      );
    case "explorer":
      return (
        <g>
          <ellipse cx="50" cy="50" rx="50" ry="10" fill="#d9b779" stroke="#9a7840" strokeWidth="1.6" />
          <path d="M24 49 C24 22 36 10 50 10 C64 10 76 22 76 49 Z" fill="#e7c98e" stroke="#9a7840" strokeWidth="1.6" />
          <path d="M25 40 C40 44 60 44 75 40 L76 48 C60 52 40 52 24 48 Z" fill="#2c7d4d" />
          <path d="M66 36 C72 30 80 30 84 26 C80 34 74 38 66 40 Z" fill="#5fa35a" />
        </g>
      );
    case "grad":
      return (
        <g>
          <path d="M28 40 C28 52 72 52 72 40 L72 30 L28 30 Z" fill="#1c2a24" stroke="#0b1510" strokeWidth="1.4" />
          <path d="M50 10 L98 26 L50 42 L2 26 Z" fill="#24362e" stroke="#0b1510" strokeWidth="1.6" />
          <circle cx="50" cy="26" r="2.6" fill="#f0b850" />
          <path d="M50 26 C70 30 82 32 86 36 V52" stroke="#f0b850" strokeWidth="2" fill="none" />
          <path d="M82 50 L86 60 L90 50 Z" fill="#f0b850" />
        </g>
      );
    case "crown":
      return (
        <g>
          <path d="M20 52 L14 16 L34 32 L50 8 L66 32 L86 16 L80 52 Z" fill="url(#timo-gold)" stroke="#a8781a" strokeWidth="1.8" strokeLinejoin="round" />
          <rect x="19" y="46" width="62" height="9" rx="3" fill="#e0a41b" stroke="#a8781a" strokeWidth="1.4" />
          <circle cx="50" cy="38" r="5" fill="#2fae6a" stroke="#fff" strokeWidth="1" />
          <circle cx="32" cy="42" r="3.2" fill="#5cc8f0" />
          <circle cx="68" cy="42" r="3.2" fill="#ff7a5c" />
          <circle cx="14" cy="16" r="3" fill="#ffe9a6" />
          <circle cx="50" cy="8" r="3.4" fill="#ffe9a6" />
          <circle cx="86" cy="16" r="3" fill="#ffe9a6" />
          <defs>
            <linearGradient id="timo-gold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffe28a" />
              <stop offset="1" stopColor="#f0b850" />
            </linearGradient>
          </defs>
        </g>
      );
    default:
      return null;
  }
}

/**
 * Timo personaji (rasm + kiyim). O'lcham ota elementdan olinadi.
 * mood: idle — sekin tebranadi; happy — sakraydi; sleep — uxlaydi (Zzz)
 */
export function TimoFigure({
  outfit = "none",
  mood = "idle",
  className = "",
  priority = false,
}: {
  outfit?: OutfitId;
  mood?: "idle" | "happy" | "sleep";
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`timo-figure relative aspect-square ${className}`} data-mood={mood}>
      <div className="timo-body absolute inset-0">
        <Image src={timoImg} alt="Timo" fill sizes="(max-width: 640px) 40vw, 260px" priority={priority} className="object-contain drop-shadow-[0_14px_18px_rgb(0_0_0/0.35)]" draggable={false} />
        {outfit !== "none" && (
          <svg viewBox="0 0 100 60" className="absolute left-[31%] top-[-11%] w-[42%] overflow-visible" aria-hidden>
            <OutfitArt outfit={outfit} />
          </svg>
        )}
      </div>
      {mood === "sleep" && (
        <span className="timo-zzz pointer-events-none absolute right-[8%] top-[2%] font-display text-lg font-bold text-sky-500" aria-hidden>
          z<span>z</span><span>z</span>
        </span>
      )}
    </div>
  );
}
