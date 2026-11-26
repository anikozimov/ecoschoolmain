"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { LEVELS, levelOf } from "@/lib/eco";
import { FACTS } from "@/lib/game";
import {
  MILESTONES,
  OUTFITS,
  dayPhase,
  greeting,
  loadTimo,
  nextMilestone,
  seenKey,
  timoAdvice,
  type DayPhase,
  type MilestoneId,
  type OutfitId,
  type TimoState,
} from "@/lib/timo";
import { TimoGarden } from "@/components/timo/TimoGarden";
import { OutfitArt, TimoFigure } from "@/components/timo/TimoFigure";
import { confetti } from "@/components/effects";
import { Alert, Modal, Skeleton } from "@/components/ui";

const PREVIEW: TimoState = { tasks: 12, challenges: 9, research: 2, volunteer: 1, xp: 420, outfit: "cap" };
const today = () => new Date().toISOString().slice(0, 10);

function store(key: string, value?: string) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch {
    /* brauzer xotirasi yopiq — muhim emas */
  }
  return null;
}

export default function TimoPage() {
  const { user, profile, isVolunteer, loading } = useSession();
  const [supabase] = useState(() => createClient());
  const [state, setState] = useState<TimoState | null>(null);
  const [ready, setReady] = useState(true);
  const [phase, setPhase] = useState<DayPhase>("day");
  const [fresh, setFresh] = useState<Set<MilestoneId>>(new Set());
  const [celebrate, setCelebrate] = useState<MilestoneId[]>([]);
  const [bubble, setBubble] = useState<string | null>(null);
  const [happy, setHappy] = useState(false);
  const [watering, setWatering] = useState(false);
  const [watered, setWatered] = useState(false);
  const [saving, setSaving] = useState<OutfitId | null>(null);
  const [error, setError] = useState("");
  const talk = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const guest = !loading && !user;
  const s = state ?? (guest ? PREVIEW : null);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    const list = timers.current;
    return () => {
      list.forEach(clearTimeout);
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    };
  }, []);

  useEffect(() => {
    setPhase(dayPhase());
    const t = setInterval(() => setPhase(dayPhase()), 60_000);
    return () => clearInterval(t);
  }, []);

  const say = useCallback(
    (text: string, ms = 5200) => {
      setBubble(text);
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
      bubbleTimer.current = setTimeout(() => setBubble(null), ms);
    },
    []
  );

  useEffect(() => {
    if (loading || !user) return;
    loadTimo(supabase, profile?.points ?? 0).then(({ state: st, ready: ok }) => {
      setState(st);
      setReady(ok);
      setWatered(store(`eco-timo-water-${user.id}`) === today());
      // Yangi ochilgan elementlar — bayram
      const seen = Number(store(seenKey(user.id)) ?? -1);
      const news = MILESTONES.filter((m) => st.tasks >= m.at && m.at > seen).map((m) => m.id);
      if (seen >= 0 && news.length) {
        setFresh(new Set(news));
        setCelebrate(news);
        confetti();
      }
      store(seenKey(user.id), String(st.tasks));
      later(() => say(greeting(profile?.full_name)), 600);
    });
  }, [loading, user, profile?.points, profile?.full_name, supabase, say, later]);

  const lines = useMemo(() => {
    if (!s) return [];
    return [...timoAdvice(s, { volunteer: isVolunteer }), ...FACTS.map((f) => `Bilasanmi? ${f}`)];
  }, [s, isVolunteer]);

  function poke() {
    setHappy(true);
    later(() => setHappy(false), 950);
    if (!lines.length) return;
    say(lines[talk.current % lines.length]);
    talk.current += 1;
  }

  function water() {
    if (!user || watered) return;
    setWatering(true);
    setHappy(true);
    say("Rahmat! Gullar suvdan juda xursand 💧🌼", 4200);
    later(() => setHappy(false), 950);
    later(() => setWatering(false), 3200);
    store(`eco-timo-water-${user.id}`, today());
    setWatered(true);
  }

  async function wear(o: OutfitId) {
    if (!state || saving) return;
    setSaving(o);
    setError("");
    const { error: err } = await supabase.rpc("set_timo_outfit", { p_outfit: o });
    setSaving(null);
    if (err) {
      setError(err.message?.includes("ochilmagan") ? "Bu kiyim hali ochilmagan." : "Saqlab bo‘lmadi. Qayta urinib ko‘ring.");
      return;
    }
    setState({ ...state, outfit: o });
    setHappy(true);
    later(() => setHappy(false), 950);
    say(o === "none" ? "Oddiy holatim ham yoqadi 😊" : `Yangi kiyimim — ${OUTFITS.find((x) => x.id === o)?.title}! Qalay? ✨`);
  }

  const next = s ? nextMilestone(s.tasks) : null;
  const prevAt = s ? [...MILESTONES].reverse().find((m) => m.at <= s.tasks)?.at ?? 0 : 0;
  const pct = s && next ? Math.round(((s.tasks - prevAt) / (next.at - prevAt)) * 100) : 100;
  const lvl = levelOf(s?.xp ?? 0);

  return (
    <div className="container-page pb-24 pt-8 sm:pt-12">
      {/* Sarlavha */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Shaxsiy yordamchi</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">Timo bog‘i</h1>
          <p className="mt-2 max-w-xl text-muted">
            Har bir tasdiqlangan ekologik ishingiz bog‘ingizni o‘stiradi. Hech narsa so‘lib qolmaydi — bog‘ sizni doim kutadi.
          </p>
        </div>
        {s && (
          <div className="flex gap-2">
            <div className="glass-tile px-4 py-3 text-center">
              <p className="font-display text-2xl font-semibold leading-none">{s.tasks}</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-muted">bajarilgan ish</p>
            </div>
            <div className="glass-tile px-4 py-3 text-center">
              <p className="font-display text-2xl font-semibold leading-none">
                {MILESTONES.filter((m) => s.tasks >= m.at).length}/{MILESTONES.length}
              </p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-muted">ochilgan</p>
            </div>
          </div>
        )}
      </div>

      {guest && (
        <div className="mb-4">
          <Alert tone="info">
            Bu — namuna bog‘. <Link href="/login" className="font-bold underline">Kiring</Link>, va Timo sizning shaxsiy yordamchingizga aylanadi.
          </Alert>
        </div>
      )}
      {!ready && (
        <div className="mb-4">
          <Alert tone="error">Timo bog‘i hali to‘liq sozlanmagan — administrator yangi SQL faylni ishga tushirishi kerak.</Alert>
        </div>
      )}

      {!s ? (
        <Skeleton className="h-[340px] sm:h-[500px]" />
      ) : (
        <TimoGarden
          tasks={s.tasks}
          outfit={s.outfit}
          phase={phase}
          fresh={fresh}
          watering={watering}
          name={profile?.full_name ?? undefined}
          onTimo={poke}
          bubble={bubble}
          happy={happy}
        />
      )}

      {s && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            {/* Keyingi sovg'a */}
            <section className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-4">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-ink/[0.06] text-3xl ring-1 ring-ink/10">{next ? next.icon : "🌈"}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">{next ? "Keyingi sovg‘a" : "Hammasi ochildi"}</p>
                  <p className="font-display text-xl font-semibold">{next ? next.title : "Afsonaviy bog‘ tayyor!"}</p>
                  <p className="text-sm text-muted">{next ? `Yana ${next.at - s.tasks} ta tasdiqlangan ish kerak` : "Siz eng yuqori cho‘qqiga chiqdingiz."}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={water} disabled={guest || watered} className="btn btn-ghost">
                    💧 {watered ? "Bugun sug‘orildi" : "Sug‘orish"}
                  </button>
                  <Link href="/challenges" className="btn btn-primary">Vazifa topish</Link>
                </div>
              </div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-ink/[0.07]">
                <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                <span className="chip bg-ink/[0.05]">🎯 {s.challenges} challenge</span>
                <span className="chip bg-ink/[0.05]">📚 {s.research} tadqiqot</span>
                {(isVolunteer || s.volunteer > 0) && <span className="chip bg-ink/[0.05]">🤝 {s.volunteer} volontyorlik</span>}
              </div>
            </section>

            {/* Yo'l xaritasi */}
            <section>
              <h2 className="mb-3 text-2xl font-semibold">Bog‘ xaritasi</h2>
              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {MILESTONES.map((m) => {
                  const done = s.tasks >= m.at;
                  return (
                    <div key={m.id} className={`flex items-center gap-3 rounded-2xl p-3.5 ring-1 transition ${done ? "bg-leaf-100 ring-leaf-400/30" : "bg-ink/[0.03] ring-ink/10"}`}>
                      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl ${done ? "bg-ink/10" : "bg-ink/[0.04] grayscale opacity-60"}`}>{done ? m.icon : "🔒"}</span>
                      <span className="min-w-0">
                        <span className={`block text-sm font-extrabold ${done ? "" : "text-muted"}`}>{m.title}</span>
                        <span className="block text-xs text-muted">{done ? m.text : `${m.at} ta ishda ochiladi`}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="min-w-0 space-y-6">
            {/* Yordamchi */}
            <section className="card p-5">
              <div className="flex items-center gap-3">
                <TimoFigure outfit={s.outfit} className="w-16" />
                <div>
                  <p className="font-display text-lg font-semibold">{greeting(guest ? null : profile?.full_name, phase)}</p>
                  <p className="text-xs text-muted">Timo — sizning eko-yordamchingiz</p>
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {timoAdvice(s, { volunteer: isVolunteer }).map((t) => (
                  <li key={t} className="rounded-xl bg-ink/[0.04] px-3 py-2.5 ring-1 ring-ink/[0.06]">{t}</li>
                ))}
              </ul>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link href="/challenges" className="btn btn-ghost btn-sm">🎯 Challenge</Link>
                <Link href="/research" className="btn btn-ghost btn-sm">📚 Tadqiqot</Link>
                {isVolunteer ? (
                  <Link href="/volunteer" className="btn btn-ghost btn-sm">🤝 Soat yozish</Link>
                ) : (
                  <Link href="/recycling" className="btn btn-ghost btn-sm">♻️ Recycling</Link>
                )}
                <Link href="/game" className="btn btn-ghost btn-sm">🎮 O‘yin</Link>
              </div>
            </section>

            {/* Kiyimlar */}
            <section className="card p-5">
              <h2 className="text-xl font-semibold">Timo kiyimlari</h2>
              <p className="mt-1 text-xs text-muted">Darajangiz oshgani sari yangi kiyimlar ochiladi. Hozir: {lvl.level.icon} {lvl.level.name}</p>
              {error && <div className="mt-3"><Alert tone="error">{error}</Alert></div>}
              <div className="mt-4 grid grid-cols-3 gap-2">
                {OUTFITS.map((o, i) => {
                  const open = s.xp >= o.min;
                  const on = s.outfit === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      disabled={!open || guest || !!saving}
                      onClick={() => wear(o.id)}
                      title={open ? o.title : `${LEVELS[i].name} darajasida ochiladi`}
                      className={`relative flex flex-col items-center gap-1 rounded-2xl p-2.5 text-center ring-1 transition ${
                        on ? "bg-leaf-100 ring-leaf-400/60" : "bg-ink/[0.03] ring-ink/10 hover:bg-ink/[0.07]"
                      } disabled:cursor-not-allowed`}
                    >
                      <svg viewBox="0 0 100 64" className={`h-10 w-14 overflow-visible ${open ? "" : "opacity-25 grayscale"}`} aria-hidden>
                        {o.id === "none" ? <text x="50" y="44" textAnchor="middle" fontSize="34">🐢</text> : <OutfitArt outfit={o.id} />}
                      </svg>
                      <span className="text-[11px] font-bold leading-tight">{open ? o.title : `🔒 ${LEVELS[i].name}`}</span>
                      {saving === o.id && <span className="absolute inset-0 grid place-items-center rounded-2xl bg-black/30 text-xs">…</span>}
                    </button>
                  );
                })}
              </div>
            </section>
          </aside>
        </div>
      )}

      <Modal open={celebrate.length > 0} onClose={() => setCelebrate([])} title="Bog‘ingizda yangilik! 🎉">
        <div className="space-y-3">
          {celebrate.map((id) => {
            const m = MILESTONES.find((x) => x.id === id)!;
            return (
              <div key={id} className="flex items-center gap-3 rounded-2xl bg-ink/[0.05] p-3.5 ring-1 ring-ink/10">
                <span className="text-3xl">{m.icon}</span>
                <span>
                  <span className="block font-extrabold">{m.title}</span>
                  <span className="block text-sm text-muted">{m.text}</span>
                </span>
              </div>
            );
          })}
          <button type="button" onClick={() => setCelebrate([])} className="btn btn-primary w-full">Bog‘ni ko‘rish</button>
        </div>
      </Modal>
    </div>
  );
}
