"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import timoImg from "@/public/timo-sm.webp";
import { createClient } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { useAppPathname } from "@/lib/nav";
import { MILESTONES, greeting, loadTimo, nextMilestone, timoAdvice, type TimoState } from "@/lib/timo";

const HIDE_ON = ["/timo", "/game", "/certificate", "/login"];
const INTRO_KEY = "eco-timo-intro";

// Sahifalar orasida qayta yuklamaslik uchun (1 daqiqa)
let cache: { uid: string; at: number; state: TimoState } | null = null;

/** Har sahifada yuradigan kichik Timo: maslahat beradi va bog'ga olib boradi */
export default function TimoBuddy() {
  const { user, profile, isVolunteer } = useSession();
  const pathname = useAppPathname();
  const [supabase] = useState(() => createClient());
  const [state, setState] = useState<TimoState | null>(null);
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    if (cache && cache.uid === user.id && Date.now() - cache.at < 60_000) {
      setState(cache.state);
      return;
    }
    let alive = true;
    loadTimo(supabase, profile?.points ?? 0).then(({ state: st, ready }) => {
      if (!alive || !ready) return;
      cache = { uid: user.id, at: Date.now(), state: st };
      setState(st);
    });
    return () => {
      alive = false;
    };
  }, [user, profile?.points, supabase]);

  // Sessiyada bir marta o'zi salom beradi
  useEffect(() => {
    if (!state) return;
    let shown = false;
    try {
      shown = sessionStorage.getItem(INTRO_KEY) === "1";
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch {
      /* yopiq xotira */
    }
    if (shown) return;
    const next = nextMilestone(state.tasks);
    const a = setTimeout(() => setHint(next ? `Yana ${next.at - state.tasks} ta ish — ${next.icon} ${next.title}!` : "Bog‘imiz afsonaviy bo‘ldi 🌈"), 2500);
    const b = setTimeout(() => setHint(null), 9000);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [state]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (panel.current && !panel.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  useEffect(() => setOpen(false), [pathname]);

  if (!user || !state || HIDE_ON.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;

  const next = nextMilestone(state.tasks);
  const prevAt = [...MILESTONES].reverse().find((m) => m.at <= state.tasks)?.at ?? 0;
  const pct = next ? Math.round(((state.tasks - prevAt) / (next.at - prevAt)) * 100) : 100;

  return (
    <div ref={panel} className="no-print fixed bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+5.6rem)] right-3 z-40 lg:bottom-6 lg:right-6">
      {open && (
        <div className="buddy-panel absolute bottom-[4rem] right-0 w-[min(320px,calc(100vw-1.5rem))] rounded-[22px] p-4" role="dialog" aria-label="Timo yordamchi">
          <p className="font-display text-lg font-semibold">{greeting(profile?.full_name)}</p>
          <div className="mt-3 rounded-2xl bg-ink/[0.05] p-3 ring-1 ring-ink/10">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>{next ? `${next.icon} ${next.title}` : "🌈 Hammasi ochildi"}</span>
              <span className="text-muted">{state.tasks}{next ? ` / ${next.at}` : ""}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/[0.08]">
              <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <ul className="mt-3 space-y-1.5 text-[13px] leading-snug text-ink/90">
            {timoAdvice(state, { volunteer: isVolunteer })
              .slice(0, 2)
              .map((t) => (
                <li key={t}>• {t}</li>
              ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <Link href="/timo" className="btn btn-primary btn-sm flex-1">🌳 Bog‘imga o‘tish</Link>
            <Link href={isVolunteer ? "/volunteer" : "/challenges"} className="btn btn-ghost btn-sm">{isVolunteer ? "🤝 Soat" : "🎯 Vazifa"}</Link>
          </div>
        </div>
      )}
      {hint && !open && (
        <button
          type="button"
          onClick={() => {
            setHint(null);
            setOpen(true);
          }}
          className="timo-bubble absolute bottom-[3.9rem] right-0 w-max max-w-[220px] rounded-2xl bg-white px-3 py-2 text-left text-xs font-bold text-[#173b26] shadow-xl"
        >
          {hint}
          <span className="absolute -bottom-1.5 right-6 h-3 w-3 rotate-45 bg-white" />
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          setHint(null);
          setOpen((v) => !v);
        }}
        className="buddy-btn relative grid h-[52px] w-[52px] place-items-center overflow-hidden rounded-[18px] lg:h-16 lg:w-16 lg:rounded-[20px]"
        aria-label="Timo yordamchini ochish"
        aria-expanded={open}
      >
        <Image src={timoImg} alt="" width={72} height={72} className="buddy-face h-[60px] w-[60px] max-w-none lg:h-[72px] lg:w-[72px] translate-y-[12%] object-cover object-top" />
        {next && state.tasks > 0 && pct >= 75 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-sand-500 ring-2 ring-[#0b1820]" />}
      </button>
    </div>
  );
}
