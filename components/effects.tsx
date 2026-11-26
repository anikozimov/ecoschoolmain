"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ElementType, ReactNode } from "react";

import { isCalm } from "@/lib/perf";

/** Telefon, kuchsiz qurilma yoki "kamroq harakat" — effektlar o'chadi */
const reduceMotion = () => typeof window !== "undefined" && isCalm();

/* ─────────── Scroll'da paydo bo‘lish ─────────── */
export function Reveal({
  children,
  delay = 0,
  from = "up",
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  from?: "up" | "left" | "right" | "scale";
  className?: string;
  as?: ElementType;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduceMotion()) {
      setShown(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-reveal={from}
      data-shown={shown ? "true" : "false"}
      style={{ transitionDelay: `${delay}ms` } as CSSProperties}
      className={`reveal ${className}`}
    >
      {children}
    </Tag>
  );
}

/* ─────────── 3D egiluvchi karta + yorug‘lik ─────────── */
export function TiltCard({
  children,
  className = "",
  max = 8,
  glare = true,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  glare?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || e.pointerType === "touch" || reduceMotion()) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(0.5 - y) * max}deg`);
    el.style.setProperty("--ry", `${(x - 0.5) * max}deg`);
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
  }

  function onLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }

  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} className={`tilt ${glare ? "tilt-glare" : ""} ${className}`}>
      {children}
    </div>
  );
}

/* ─────────── Sichqonchaga tortiluvchi element ─────────── */
export function Magnetic({ children, strength = 0.3 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <span
      ref={ref}
      className="inline-block transition-transform duration-300 ease-out will-change-transform"
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el || e.pointerType === "touch" || reduceMotion()) return;
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      }}
      onPointerLeave={() => {
        if (ref.current) ref.current.style.transform = "";
      }}
    >
      {children}
    </span>
  );
}

/* ─────────── Uchib yuruvchi barglar ───────────
   Telefonlarni qotirgani uchun o'chirildi. Komponent sahifalarda qoldi,
   lekin hech narsa chizmaydi. */
export function FallingLeaves(_props: { count?: number; className?: string }) {
  void _props;
  return null;
}

/* ─────────── Sichqoncha bo‘yicha parallaks ─────────── */
export function Parallax({ children, depth = 20, className = "" }: { children: ReactNode; depth?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reduceMotion()) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * depth;
        const y = (e.clientY / window.innerHeight - 0.5) * depth;
        if (ref.current) ref.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [depth]);
  return (
    <div ref={ref} className={`transition-transform duration-500 ease-out will-change-transform ${className}`}>
      {children}
    </div>
  );
}

/* ─────────── Scroll progress chizig‘i ─────────── */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const h = document.documentElement;
      const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
      if (ref.current) ref.current.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div
      ref={ref}
      aria-hidden
      className="fixed left-0 right-0 top-0 z-[60] h-[3px] origin-left scale-x-0 bg-gradient-to-r from-forest-500 via-forest-500 to-[#e2a63a]"
    />
  );
}

/* ─────────── Yugurib o‘tuvchi lenta ─────────── */
export function Marquee({ items, className = "" }: { items: string[]; className?: string }) {
  const row = [...items, ...items];
  return (
    <div className={`marquee-mask overflow-hidden ${className}`}>
      <div className="marquee flex w-max gap-10">
        {row.map((t, i) => (
          <span key={i} className="flex shrink-0 items-center gap-10 whitespace-nowrap">
            {t}
            <span className="text-leaf-400">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─────────── Konfetti (muvaffaqiyat uchun) ─────────── */
export function confetti(opts: { x?: number; y?: number; count?: number } = {}) {
  if (typeof window === "undefined" || reduceMotion()) return;
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:200";
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas.remove();
  ctx.scale(devicePixelRatio, devicePixelRatio);

  const colors = ["#3a8f5c", "#9bd24d", "#bfe37a", "#efcb7d", "#1f5f3e", "#e4f1fb"];
  const ox = opts.x ?? window.innerWidth / 2;
  const oy = opts.y ?? window.innerHeight / 2.5;
  const parts = Array.from({ length: opts.count ?? 120 }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 9;
    return {
      x: ox,
      y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 6,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      c: colors[Math.floor(Math.random() * colors.length)],
      leaf: Math.random() < 0.25,
    };
  });

  const start = performance.now();
  const tick = (t: number) => {
    const elapsed = t - start;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const p of parts) {
      p.vy += 0.28;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - elapsed / 2600);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      if (p.leaf) {
        ctx.beginPath();
        ctx.ellipse(0, 0, p.w, p.w / 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
    }
    if (elapsed < 2600) requestAnimationFrame(tick);
    else canvas.remove();
  };
  requestAnimationFrame(tick);
}

/* ─────────── To‘lqinsimon bo‘luvchi ─────────── */
export function WaveDivider({ className = "", flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1440 80"
      preserveAspectRatio="none"
      className={`block h-10 w-full sm:h-16 ${flip ? "rotate-180" : ""} ${className}`}
    >
      <path
        className="wave-path"
        fill="currentColor"
        d="M-80,40 C240,80 480,0 720,32 C960,64 1200,8 1520,40 L1520,81 L-80,81 Z"
      />
    </svg>
  );
}
