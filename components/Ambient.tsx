"use client";

import { useEffect, useRef } from "react";

/**
 * Butun sayt uchun "tungi o‘rmon" muhiti (aurora dog‘lari, yorug‘ qo‘ng‘izlar, kursor nuri).
 *
 * TEZLIK:
 *  - Qurilma kuchiga qarab 3 daraja: full (kompyuter), lite (telefon/kuchsiz), off (tejamkor rejim)
 *  - <html data-perf="lite|off"> — og'ir CSS effektlar (xiralashtirish, animatsiya) o'chadi
 *  - Qo‘ng‘izlar oldindan chizilgan rasm (sprite) bilan chiziladi — har kadrda gradient yaratilmaydi
 *  - Kadrlar soni cheklangan (full: 60, lite: 30), sahifa yashirin bo‘lsa — to‘xtaydi
 *  - Sichqoncha harakati kadrga bir marta qayta ishlanadi
 */
type Tier = "full" | "lite" | "off";

function detectTier(): Tier {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "off";
  if (nav.connection?.saveData) return "off";
  if ((nav.deviceMemory ?? 8) <= 2) return "off";
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const weak = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
  return coarse || weak ? "lite" : "full";
}

/** Bitta qo‘ng‘iz rasmi (radial nur) — bir marta chiziladi, keyin faqat nusxalanadi */
function makeSprite(hue: number) {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const r = size / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, `hsla(${hue}, 90%, 72%, 1)`);
  grad.addColorStop(0.25, `hsla(${hue}, 90%, 60%, 0.35)`);
  grad.addColorStop(1, "hsla(0,0%,0%,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

export default function Ambient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tier = detectTier();
    const root = document.documentElement;
    if (tier === "full") delete root.dataset.perf;
    else root.dataset.perf = tier;

    const canvas = canvasRef.current;
    const ctx = tier === "off" ? null : canvas?.getContext("2d") ?? null;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const mouse = { x: -9999, y: -9999 };
    const frameMs = tier === "full" ? 1000 / 60 : 1000 / 30;
    const dpr = tier === "full" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    let raf = 0;
    let last = 0;
    let w = 0;
    let h = 0;

    const sprites = ctx ? [makeSprite(100), makeSprite(115), makeSprite(185)] : [];
    type Fly = { x: number; y: number; vx: number; vy: number; r: number; p: number; s: number; img: HTMLCanvasElement };
    let flies: Fly[] = [];

    function resize() {
      if (!canvas || !ctx) return;
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = tier === "full" ? Math.round(Math.min(48, (w * h) / 26000)) : Math.round(Math.min(14, (w * h) / 30000));
      flies = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: (Math.random() * 1.8 + 0.6) * 9,
        p: Math.random() * Math.PI * 2,
        s: Math.random() * 0.02 + 0.008,
        img: sprites[Math.random() < 0.8 ? (Math.random() < 0.5 ? 0 : 1) : 2],
      }));
    }

    function tick(t: number) {
      raf = requestAnimationFrame(tick);
      if (!ctx || t - last < frameMs - 1) return;
      const step = Math.min(3, (t - last) / (1000 / 60)); // 30 kadrda ham tezlik bir xil
      last = t;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (const f of flies) {
        f.p += f.s * step;
        if (finePointer) {
          const dx = f.x - mouse.x;
          const dy = f.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 22000) {
            const d = Math.sqrt(d2) || 1;
            f.vx += (dx / d) * 0.12;
            f.vy += (dy / d) * 0.12;
          }
        }
        f.vx += Math.cos(f.p * 0.7) * 0.004 * step;
        f.vy += (Math.sin(f.p * 0.9) * 0.004 - 0.0015) * step;
        f.vx *= 0.97;
        f.vy *= 0.97;
        f.x += f.vx * step;
        f.y += f.vy * step;
        if (f.x < -20) f.x = w + 20;
        if (f.x > w + 20) f.x = -20;
        if (f.y < -20) f.y = h + 20;
        if (f.y > h + 20) f.y = -20;
        ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(f.p));
        ctx.drawImage(f.img, f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
      }
      ctx.globalAlpha = 1;
    }

    // Sichqoncha: hodisa ko‘p keladi, lekin ish kadrga bir marta qilinadi
    let pending: PointerEvent | null = null;
    let moveRaf = 0;
    function applyMove() {
      moveRaf = 0;
      const e = pending;
      if (!e) return;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
        glowRef.current.style.opacity = "1";
      }
      const card = (e.target as Element | null)?.closest?.(".card") as HTMLElement | null;
      if (card) {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      }
    }
    function onMove(e: PointerEvent) {
      pending = e;
      if (!moveRaf) moveRaf = requestAnimationFrame(applyMove);
    }
    function onLeave() {
      mouse.x = mouse.y = -9999;
      if (glowRef.current) glowRef.current.style.opacity = "0";
    }

    let resizeTimer = 0;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 150);
    };

    if (tier === "full" && finePointer) {
      window.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerleave", onLeave);
    }
    if (ctx) {
      resize();
      window.addEventListener("resize", onResize);
      raf = requestAnimationFrame(tick);
    }
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && ctx) raf = requestAnimationFrame(tick);
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(moveRaf);
      clearTimeout(resizeTimer);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <>
      <div className="aurora-bg" aria-hidden>
        <span style={{ width: "52vw", height: "52vw", left: "-12vw", top: "-18vw", background: "#1f8f4e" }} />
        <span style={{ width: "40vw", height: "40vw", right: "-10vw", top: "8vh", background: "#0f6e6a", animationDelay: "-6s" }} />
        <span style={{ width: "34vw", height: "34vw", left: "30vw", bottom: "-14vw", background: "#5c8f16", animationDelay: "-12s", opacity: 0.35 }} />
        <span style={{ width: "26vw", height: "26vw", right: "20vw", bottom: "10vh", background: "#1c5a8a", animationDelay: "-3s", opacity: 0.3 }} />
      </div>
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[-1]" aria-hidden />
      <div ref={glowRef} className="cursor-glow opacity-0" aria-hidden />
    </>
  );
}
