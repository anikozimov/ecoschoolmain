"use client";

import { useEffect, useRef } from "react";

/**
 * Butun sayt uchun "tungi o‘rmon" muhiti:
 *  - harakatlanuvchi aurora dog‘lari
 *  - sichqonchaga javob beradigan yorug‘ qo‘ng‘izlar (fireflies) canvas'i
 *  - kursor ortidan yuruvchi yumshoq nur
 *  - barcha .card elementlarida kursor nuri (--mx / --my)
 */
export default function Ambient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const mouse = { x: -9999, y: -9999 };
    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    type Fly = { x: number; y: number; vx: number; vy: number; r: number; p: number; s: number; hue: number };
    let flies: Fly[] = [];

    function resize() {
      if (!canvas) return;
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(90, (w * h) / 16000));
      flies = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.8 + 0.6,
        p: Math.random() * Math.PI * 2,
        s: Math.random() * 0.02 + 0.008,
        hue: Math.random() < 0.8 ? 85 + Math.random() * 40 : 170 + Math.random() * 30,
      }));
    }

    function tick() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (const f of flies) {
        f.p += f.s;
        const dx = f.x - mouse.x;
        const dy = f.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 22000) {
          // kursordan qochadi
          const d = Math.sqrt(d2) || 1;
          f.vx += (dx / d) * 0.12;
          f.vy += (dy / d) * 0.12;
        }
        f.vx += Math.cos(f.p * 0.7) * 0.004;
        f.vy += Math.sin(f.p * 0.9) * 0.004 - 0.0015;
        f.vx *= 0.97;
        f.vy *= 0.97;
        f.x += f.vx;
        f.y += f.vy;
        if (f.x < -20) f.x = w + 20;
        if (f.x > w + 20) f.x = -20;
        if (f.y < -20) f.y = h + 20;
        if (f.y > h + 20) f.y = -20;
        const a = 0.35 + 0.65 * Math.abs(Math.sin(f.p));
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 9);
        g.addColorStop(0, `hsla(${f.hue}, 90%, 72%, ${a})`);
        g.addColorStop(0.25, `hsla(${f.hue}, 90%, 60%, ${a * 0.35})`);
        g.addColorStop(1, "hsla(0,0%,0%,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r * 9, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    }

    function onMove(e: PointerEvent) {
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
    function onLeave() {
      mouse.x = mouse.y = -9999;
      if (glowRef.current) glowRef.current.style.opacity = "0";
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    if (!reduce && canvas && ctx) {
      resize();
      window.addEventListener("resize", resize);
      raf = requestAnimationFrame(tick);
    }
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduce && ctx) raf = requestAnimationFrame(tick);
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", resize);
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
      <div className="noise-overlay" aria-hidden />
    </>
  );
}
