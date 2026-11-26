"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import timoImg from "@/public/timo.webp";
import { createClient } from "@/lib/supabase";
import { initials, useSession } from "@/lib/session";
import { BEST_KEY, BINS, FACTS, ITEMS, WORLD, worldOf, type BinKey } from "@/lib/game";
import { confetti } from "@/components/effects";

type Item = { id: number; emoji: string; name: string; bin: BinKey; x: number; born: number; dur: number };
type Top = { student_id: string; full_name: string | null; class_name: string | null; best: number };
type Phase = "intro" | "play" | "over";

const LIVES = 3;
const ITEM = 56; // px

function rnd<T>(list: readonly T[]) {
  return list[Math.floor(Math.random() * list.length)];
}

export default function GamePage() {
  const { user, refresh } = useSession();
  const [supabase] = useState(() => createClient());

  const [phase, setPhase] = useState<Phase>("intro");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [combo, setCombo] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [paused, setPaused] = useState(false);
  const [bubble, setBubble] = useState<{ text: string; good: boolean } | null>(null);
  const [flash, setFlash] = useState<{ bin: BinKey; good: boolean; n: number } | null>(null);
  const [best, setBest] = useState(0);
  const [result, setResult] = useState<{ reward: number; rewardedToday: boolean; best: number } | null>(null);
  const [top, setTop] = useState<Top[]>([]);
  const [fact, setFact] = useState(FACTS[0]);

  const arenaRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<HTMLElement>(null);
  const els = useRef(new Map<number, HTMLDivElement>());
  const itemsRef = useRef<Item[]>([]);
  const st = useRef({ time: 0, last: 0, nextSpawn: 0, id: 0, score: 0, lives: LIVES, combo: 0, correct: 0, paused: false });
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTop = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.rpc("get_game_top");
    setTop(((data as Top[]) || []).map((t) => ({ ...t, best: Number(t.best) })));
  }, [supabase, user]);

  useEffect(() => {
    try {
      setBest(Number(localStorage.getItem(BEST_KEY)) || 0);
    } catch {
      /* brauzer xotirasi yopiq */
    }
    loadTop();
  }, [loadTop]);

  const say = useCallback((text: string, good: boolean) => {
    setBubble({ text, good });
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubble(null), 1600);
  }, []);

  const level = () => 1 + Math.floor(st.current.correct / 6);

  const sync = () => setItems([...itemsRef.current]);

  const finish = useCallback(async () => {
    setPhase("over");
    itemsRef.current = [];
    setItems([]);
    setFact(rnd(FACTS));
    const final = st.current.score;
    const localBest = Math.max(best, final);
    setBest(localBest);
    try {
      localStorage.setItem(BEST_KEY, String(localBest));
    } catch {
      /* e’tiborsiz */
    }
    if (final > 0 && final >= localBest) confetti({ count: 90 });
    if (user) {
      const { data, error } = await supabase.rpc("submit_game_score", { p_score: final });
      const row = (Array.isArray(data) ? data[0] : data) as { best: number; reward: number; rewarded_today: boolean } | null;
      if (!error && row) {
        setResult({ reward: Number(row.reward), rewardedToday: !!row.rewarded_today, best: Number(row.best) });
        if (Number(row.reward) > 0) refresh();
      } else setResult(null);
      loadTop();
    }
  }, [best, user, supabase, refresh, loadTop]);

  const loseLife = useCallback(
    (text: string) => {
      st.current.lives -= 1;
      st.current.combo = 0;
      setLives(st.current.lives);
      setCombo(0);
      say(text, false);
      if (st.current.lives <= 0) finish();
    },
    [say, finish]
  );

  function start() {
    st.current = { time: 0, last: 0, nextSpawn: 400, id: 0, score: 0, lives: LIVES, combo: 0, correct: 0, paused: false };
    itemsRef.current = [];
    setItems([]);
    setScore(0);
    setLives(LIVES);
    setCombo(0);
    setResult(null);
    setPaused(false);
    setPhase("play");
    say("Qani, ketdik! 🌍", true);
    gameRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  // O'yin sikli
  useEffect(() => {
    if (phase !== "play") return;
    let raf = 0;
    const tick = (now: number) => {
      const s = st.current;
      const dt = s.last ? Math.min(now - s.last, 50) : 16;
      s.last = now;
      if (!s.paused && s.lives > 0) {
        s.time += dt;
        const lvl = level();
        // yangi chiqindi
        if (s.time >= s.nextSpawn && itemsRef.current.length < Math.min(3, 1 + Math.floor(lvl / 3))) {
          const it = rnd(ITEMS);
          itemsRef.current.push({
            id: ++s.id,
            ...it,
            x: 8 + Math.random() * 76,
            born: s.time,
            dur: Math.max(1700, 4600 - lvl * 320),
          });
          s.nextSpawn = s.time + Math.max(650, 1900 - lvl * 140);
          sync();
        }
        // tushish
        const h = (arenaRef.current?.clientHeight ?? 380) - ITEM - 8;
        let missed: Item | null = null;
        for (const it of itemsRef.current) {
          const p = (s.time - it.born) / it.dur;
          const el = els.current.get(it.id);
          if (el) el.style.transform = `translate3d(-50%, ${Math.min(1, p) * h}px, 0) rotate(${p * 160 - 80}deg)`;
          if (p >= 1 && !missed) missed = it;
        }
        if (missed) {
          itemsRef.current = itemsRef.current.filter((i) => i !== missed);
          sync();
          loseLife(`${missed.emoji} yerga tushib qoldi!`);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, loseLife]);

  // O'yin paytida pastki menyu yashiriladi (qutilarni to'smasin)
  useEffect(() => {
    if (phase !== "play") return;
    document.documentElement.dataset.game = "on";
    return () => {
      delete document.documentElement.dataset.game;
    };
  }, [phase]);

  // Boshqa oynaga o'tilsa — pauza
  useEffect(() => {
    const onHide = () => {
      if (document.hidden && phase === "play") {
        st.current.paused = true;
        setPaused(true);
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [phase]);

  const pick = useCallback(
    (bin: BinKey) => {
      const s = st.current;
      if (phase !== "play" || s.paused || s.lives <= 0) return;
      // eng pastdagi (eng eski) chiqindi
      const target = itemsRef.current.reduce<Item | null>((acc, it) => {
        const p = (s.time - it.born) / it.dur;
        return !acc || p > (s.time - acc.born) / acc.dur ? it : acc;
      }, null);
      if (!target) return;
      itemsRef.current = itemsRef.current.filter((i) => i !== target);
      sync();
      if (target.bin === bin) {
        s.correct += 1;
        s.combo += 1;
        const mult = s.combo >= 10 ? 3 : s.combo >= 5 ? 2 : 1;
        s.score += 10 * mult;
        setScore(s.score);
        setCombo(s.combo);
        setFlash({ bin, good: true, n: Date.now() });
        const before = worldOf(s.score - 10 * mult).index;
        const after = worldOf(s.score);
        if (after.index > before) {
          say(`Dunyo yashnayapti: ${after.name}! ✨`, true);
          confetti({ count: 40 });
        } else if (s.combo === 5 || s.combo === 10) say(`Seriya ×${mult}! 🔥`, true);
        else if (s.combo % 4 === 0) say(rnd(["Zo‘r!", "Barakalla!", "To‘g‘ri! 👏", "Ajoyib!"]), true);
      } else {
        setFlash({ bin, good: false, n: Date.now() });
        const right = BINS.find((b) => b.key === target.bin)!;
        loseLife(`${target.emoji} ${target.name} — “${right.label}” qutisiga!`);
      }
    },
    [phase, say, loseLife]
  );

  // Klaviatura: 1-4
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const b = BINS.find((x) => x.key1 === e.key);
      if (b) {
        e.preventDefault();
        pick(b.key);
      } else if (e.key === " " && phase !== "play") {
        e.preventDefault();
        start();
      } else if ((e.key === "p" || e.key === "Escape") && phase === "play") {
        st.current.paused = !st.current.paused;
        setPaused(st.current.paused);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const world = worldOf(phase === "intro" ? best : score);

  return (
    <>
      <div className="container-page pt-6 sm:pt-8">
        <Link href="/timo" className="mb-3 inline-flex text-sm font-bold text-muted hover:text-ink">← Timo bog‘i</Link>
        <p className="eyebrow">
          <span className="h-px w-6 bg-forest-500" />
          Timo dunyosi
        </p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
          Timoning olamini <span className="text-gradient-anim italic">tozalang</span> 🎮
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted sm:text-base">
          Osmondan chiqindi tushyapti! Har birini to‘g‘ri qutiga tashlang — ochko oshgani sari Timoning dunyosi tozarib, yashnab boradi.
        </p>
      </div>

      <div className="container-page pb-28 pt-5">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* O'yin */}
          <section ref={gameRef} className="card min-w-0 overflow-hidden p-3 sm:p-4">
            {/* Panel */}
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-1 text-xl" aria-label={`${lives} jon`}>
                {Array.from({ length: LIVES }).map((_, i) => (
                  <span key={i} className={i < lives ? "" : "opacity-20 grayscale"}>💚</span>
                ))}
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted">{world.name}</p>
                <p className="font-display text-2xl font-semibold leading-none text-accent">{score}</p>
              </div>
              <div className="flex items-center gap-2">
                {combo >= 3 && <span className="chip bg-sand-200 text-sand-400">🔥 {combo}</span>}
                {phase === "play" && (
                  <button
                    onClick={() => {
                      st.current.paused = !st.current.paused;
                      setPaused(st.current.paused);
                    }}
                    className="grid h-9 w-9 place-items-center rounded-xl border border-line"
                    aria-label={paused ? "Davom etish" : "Pauza"}
                  >
                    {paused ? "▶" : "⏸"}
                  </button>
                )}
              </div>
            </div>

            {/* Dunyo — o'yin maydoni */}
            <div
              ref={arenaRef}
              className="relative h-[min(50vh,420px)] select-none overflow-hidden rounded-2xl transition-[background] duration-1000"
              style={{ background: `linear-gradient(180deg, ${world.sky[0]}, ${world.sky[1]})` }}
            >
              {/* bulut / tutun */}
              <span className="pointer-events-none absolute left-[8%] top-[10%] text-4xl opacity-60">{world.index < 2 ? "💨" : "☁️"}</span>
              <span className="pointer-events-none absolute right-[12%] top-[18%] text-3xl opacity-50">{world.index < 2 ? "💨" : world.index > 3 ? "☀️" : "☁️"}</span>
              {/* yer */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[22%] transition-colors duration-1000" style={{ background: world.ground }}>
                <div className="flex h-full items-start justify-around px-[16%] pt-1 text-3xl sm:text-4xl">
                  {world.deco.map((d, i) => (
                    <span key={`${world.index}-${i}`} className="-mt-7 inline-block origin-bottom animate-[rise_.6s_ease-out_both]" style={{ animationDelay: `${i * 90}ms` }}>
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              {/* Timo */}
              <div className="pointer-events-none absolute bottom-[8%] left-2 z-10 w-[76px] sm:w-[96px]">
                {bubble && (
                  <div className={`absolute bottom-full left-2 mb-2 w-max max-w-[220px] rounded-2xl px-3 py-2 text-xs font-extrabold shadow-lg ${bubble.good ? "bg-white text-forest-950" : "bg-coral-500 text-white"}`}>
                    {bubble.text}
                  </div>
                )}
                <Image src={timoImg} alt="Timo" className="h-auto w-full drop-shadow-xl" />
              </div>

              {/* Tushayotgan chiqindilar */}
              {items.map((it) => (
                <div
                  key={it.id}
                  ref={(el) => {
                    if (el) els.current.set(it.id, el);
                    else els.current.delete(it.id);
                  }}
                  className="pointer-events-none absolute top-0 grid place-items-center rounded-2xl bg-white/90 text-3xl shadow-lg will-change-transform"
                  style={{ left: `${it.x}%`, width: ITEM, height: ITEM, transform: "translate3d(-50%, 0, 0)" }}
                  title={it.name}
                >
                  {it.emoji}
                </div>
              ))}

              {/* Ekranlar */}
              {phase !== "play" && (
                <div className="absolute inset-0 z-20 grid place-items-center bg-black/45 p-5 text-center text-white backdrop-blur-[2px]">
                  {phase === "intro" ? (
                    <div className="max-w-sm">
                      <p className="text-5xl">🌍</p>
                      <h2 className="mt-3 text-3xl font-semibold">Timo dunyosi</h2>
                      <p className="mt-2 text-sm text-white/80">
                        Tushayotgan chiqindini to‘g‘ri qutiga yuboring: pastdagi tugmani bosing (kompyuterda 1–4 tugmalari). Xato yoki yerga tushsa — bitta jon ketadi.
                      </p>
                      <button onClick={start} className="btn btn-lime mt-5 px-8 text-base">▶ O‘ynash</button>
                    </div>
                  ) : (
                    <div className="max-w-sm">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">O‘yin tugadi</p>
                      <p className="mt-1 font-display text-6xl font-semibold">{score}</p>
                      <p className="text-sm text-white/80">Dunyo: {worldOf(score).name} · Rekord: {Math.max(best, result?.best ?? 0)}</p>
                      {user ? (
                        result && (
                          <p className={`mt-3 rounded-xl px-3 py-2 text-sm font-bold ${result.reward ? "bg-glow text-forest-950" : "bg-white/10"}`}>
                            {result.reward
                              ? `🎁 Bugungi mukofot: +${result.reward} eco ball!`
                              : result.rewardedToday
                              ? "Bugungi mukofotni oldingiz — ertaga yana keling!"
                              : "100 ochkodan oshsangiz, kuniga bir marta eco ball beriladi."}
                          </p>
                        )
                      ) : (
                        <p className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-sm">Eco ball olish uchun akkauntingizga kiring.</p>
                      )}
                      <p className="mt-4 rounded-xl bg-white/10 p-3 text-left text-xs leading-5 text-white/85">💡 <b>Bilasizmi?</b> {fact}</p>
                      <button onClick={start} className="btn btn-lime mt-5 px-8 text-base">↻ Yana o‘ynash</button>
                    </div>
                  )}
                </div>
              )}
              {phase === "play" && paused && (
                <button
                  onClick={() => {
                    st.current.paused = false;
                    setPaused(false);
                  }}
                  className="absolute inset-0 z-20 grid place-items-center bg-black/50 text-white"
                >
                  <span className="text-center">
                    <span className="block text-5xl">⏸</span>
                    <span className="mt-2 block font-extrabold">Pauza — davom etish uchun bosing</span>
                  </span>
                </button>
              )}
            </div>

            {/* Qutilar */}
            <div className="mt-3 grid grid-cols-4 gap-2">
              {BINS.map((b) => {
                const f = flash?.bin === b.key ? flash : null;
                return (
                  <button
                    key={`${b.key}-${f?.n ?? 0}`}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      pick(b.key);
                    }}
                    disabled={phase !== "play"}
                    className={`relative flex touch-manipulation flex-col items-center gap-1 rounded-2xl px-1 py-3 text-white shadow-lg transition active:scale-95 disabled:opacity-60 ${
                      f ? (f.good ? "ring-4 ring-leaf-300" : "ring-4 ring-coral-500") : ""
                    }`}
                    style={{ background: `linear-gradient(180deg, ${b.color}, color-mix(in srgb, ${b.color} 65%, black))` }}
                    aria-label={`${b.label} qutisi`}
                  >
                    <span className="text-2xl sm:text-3xl">{b.icon}</span>
                    <span className="text-[11px] font-extrabold leading-tight sm:text-xs">{b.label}</span>
                    <span className="absolute right-1.5 top-1 hidden text-[10px] font-black opacity-60 sm:block">{b.key1}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Yon panel */}
          <aside className="space-y-4">
            <div className="card p-5">
              <h2 className="text-lg font-semibold">🌍 Dunyo bosqichlari</h2>
              <div className="mt-3 space-y-1.5">
                {WORLD.map((w, i) => (
                  <div key={w.name} className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${i <= world.index ? "bg-leaf-100 text-accent" : "bg-white/[0.03] text-muted"}`}>
                    <span className="font-bold">{w.deco[0]} {w.name}</span>
                    <span className="text-xs font-black">{w.min}+</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <h2 className="text-lg font-semibold">🏆 Eng yaxshi o‘yinchilar</h2>
              {!user ? (
                <p className="mt-2 text-sm text-muted">Reytingni ko‘rish uchun kiring.</p>
              ) : top.length === 0 ? (
                <p className="mt-2 text-sm text-muted">Hali hech kim o‘ynamagan — birinchi bo‘ling!</p>
              ) : (
                <div className="mt-3 space-y-1.5">
                  {top.map((t, i) => (
                    <div key={t.student_id} className={`flex items-center gap-2.5 rounded-xl p-2 ${t.student_id === user.id ? "bg-leaf-100 ring-1 ring-forest-500/40" : "bg-white/[0.03]"}`}>
                      <span className="w-5 text-center text-sm font-black">{["🥇", "🥈", "🥉"][i] ?? i + 1}</span>
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sky-100 text-[11px] font-black text-sky-500">{initials(t.full_name)}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-bold">
                        {t.full_name || "O‘yinchi"}
                        {t.class_name && <span className="font-normal text-muted"> · {t.class_name}</span>}
                      </span>
                      <span className="text-sm font-extrabold text-accent">{t.best}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-5 text-sm leading-6 text-muted">
              <p className="font-bold text-ink">Qoidalar</p>
              <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
                <li>To‘g‘ri saralash: +10 ochko</li>
                <li>Ketma-ket 5 ta: ×2, 10 ta: ×3</li>
                <li>Kuniga 1 marta: har 100 ochkoga +1 eco ball (ko‘pi bilan 10)</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
