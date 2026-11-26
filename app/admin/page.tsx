"use client";

import Image from "next/image";
import timoImg from "@/public/timo.webp";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatNumber, initials, MONTHS, useSession } from "@/lib/session";
import { useAdmin } from "@/components/admin/AdminShell";
import { FallingLeaves, Reveal, TiltCard } from "@/components/effects";
import { Skeleton } from "@/components/ui";

type Impact = {
  paper_kg: number;
  plastic_kg: number;
  recycling_kg: number;
  recycling_points: number;
  approved_challenges: number;
  challenge_points: number;
  total_points: number;
  active_students: number;
};

type ClassRow = { class_name: string; total_points: number };
type StudentRow = { student_id: string; full_name: string; class_name: string | null; points: number };

type FeedItem = {
  id: string;
  kind: "challenge" | "recycling" | "research";
  title: string;
  who: string;
  at: string;
  href: string;
};

const KIND = {
  challenge: { icon: "🎯", tint: "from-leaf-300 to-leaf-500", label: "Challenge" },
  recycling: { icon: "♻️", tint: "from-[#e2a63a] to-[#c98a17]", label: "Recycling" },
  research: { icon: "📚", tint: "from-[#8cc2ec] to-sky-500", label: "Tadqiqot" },
};

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "hozirgina";
  if (diff < 3600) return `${Math.floor(diff / 60)} daqiqa oldin`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} soat oldin`;
  return `${Math.floor(diff / 86400)} kun oldin`;
}

/* ─────────── Donut diagramma ─────────── */
function Donut({ parts, size = 168 }: { parts: { value: number; color: string }[]; size?: number }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const r = 62;
  const c = 2 * Math.PI * r;
  const offsets = parts.map((_, i) => parts.slice(0, i).reduce((s, p) => s + (p.value / total) * c, 0));
  return (
    <svg viewBox="0 0 160 160" width={size} height={size} className="-rotate-90">
      <circle cx="80" cy="80" r={r} fill="none" stroke="var(--color-cream)" strokeWidth="18" />
      {parts.map((p, i) => {
        const len = (p.value / total) * c;
        return (
          <circle
            key={i}
            cx="80"
            cy="80"
            r={r}
            fill="none"
            stroke={p.color}
            strokeWidth="18"
            strokeLinecap="round"
            strokeDasharray={`${Math.max(0, len - 4)} ${c}`}
            strokeDashoffset={-offsets[i]}
            className="donut-seg"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        );
      })}
    </svg>
  );
}

export default function AdminDashboard() {
  const { profile, isAdmin } = useSession();
  const { counts } = useAdmin();
  const [supabase] = useState(() => createClient());
  const [impact, setImpact] = useState<Impact | null>(null);
  const [classes, setClasses] = useState<ClassRow[] | null>(null);
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [feed, setFeed] = useState<FeedItem[] | null>(null);
  const [upcoming, setUpcoming] = useState<{ id: number; title: string; start_date: string }[] | null>(null);
  const [today, setToday] = useState<{ label: string; greeting: string } | null>(null);

  useEffect(() => {
    const now = new Date();
    const h = now.getHours();
    const days = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
    setToday({
      label: `${days[now.getDay()]}, ${now.getDate()}-${MONTHS[now.getMonth()]}`,
      greeting: h < 12 ? "Xayrli tong" : h < 18 ? "Xayrli kun" : "Xayrli kech",
    });
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    supabase.rpc("get_school_overall_impact").then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : data;
      const keys = ["paper_kg", "plastic_kg", "recycling_kg", "recycling_points", "approved_challenges", "challenge_points", "total_points", "active_students"];
      setImpact(Object.fromEntries(keys.map((k) => [k, Number(row?.[k]) || 0])) as Impact);
    });
    supabase.rpc("get_school_class_leaderboard").then(({ data }) =>
      setClasses(((data as ClassRow[]) || []).slice(0, 5).map((c) => ({ ...c, total_points: Number(c.total_points) || 0 })))
    );
    supabase.rpc("get_school_leaderboard").then(({ data }) =>
      setStudents(((data as StudentRow[]) || []).slice(0, 5).map((s) => ({ ...s, points: Number(s.points) || 0 })))
    );
    supabase
      .from("eco_events")
      .select("id, title, start_date")
      .gte("start_date", todayKey)
      .order("start_date")
      .limit(3)
      .then(({ data }) => setUpcoming(data || []));

    (async () => {
      const [ch, rec, res] = await Promise.all([
        supabase
          .from("challenge_submissions")
          .select("id, submitted_at, challenges (title), profiles (full_name)")
          .eq("status", "pending")
          .order("submitted_at", { ascending: false })
          .limit(5),
        supabase
          .from("recycling_submissions")
          .select("id, material, amount_kg, submitted_at, profiles!recycling_submissions_student_id_fkey (full_name)")
          .eq("status", "pending")
          .eq("school_id", profile?.school_id ?? -1)
          .order("submitted_at", { ascending: false })
          .limit(5),
        supabase
          .from("eco_research")
          .select("id, title, submitted_at")
          .eq("status", "pending")
          .order("submitted_at", { ascending: false })
          .limit(5),
      ]);
      const one = <T,>(v: T | T[] | null | undefined) => (Array.isArray(v) ? v[0] : v);
      const items: FeedItem[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ch.data || []).forEach((r: any) =>
        items.push({
          id: "c" + r.id,
          kind: "challenge",
          title: one(r.challenges)?.title || "Challenge",
          who: one(r.profiles)?.full_name || "O‘quvchi",
          at: r.submitted_at,
          href: "/admin/challenges",
        })
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (rec.data || []).forEach((r: any) =>
        items.push({
          id: "r" + r.id,
          kind: "recycling",
          title: `${r.material === "paper" ? "Qog‘oz" : "Plastik"} · ${r.amount_kg} kg`,
          who: one(r.profiles)?.full_name || "O‘quvchi",
          at: r.submitted_at,
          href: "/admin/recycling",
        })
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (res.data || []).forEach((r: any) =>
        items.push({ id: "t" + r.id, kind: "research", title: r.title, who: "Tadqiqot muallifi", at: r.submitted_at, href: "/admin/research" })
      );
      items.sort((a, b) => (a.at < b.at ? 1 : -1));
      setFeed(items.slice(0, 6));
    })();
  }, [supabase, profile?.school_id]);

  const total = counts.challenges + counts.recycling + counts.research;
  const firstName = profile?.full_name?.split(" ")[0] || "admin";

  const queues = [
    {
      href: "/admin/challenges",
      icon: "🎯",
      title: "Challenge’lar",
      text: "dalil tekshiruvi",
      count: counts.challenges,
      bg: "from-forest-500 to-forest-700",
      glow: "shadow-[0_20px_40px_-18px_rgb(31_95_62/0.8)]",
    },
    {
      href: "/admin/recycling",
      icon: "♻️",
      title: "Recycling",
      text: "sinflarga kiritish",
      count: counts.recycling,
      bg: "from-[#d9a441] to-[#b9802a]",
      glow: "shadow-[0_20px_40px_-18px_rgb(185_128_42/0.8)]",
    },
    {
      href: "/admin/research",
      icon: "📚",
      title: "Tadqiqotlar",
      text: "baholash va nashr",
      count: counts.research,
      bg: "from-[#4a95d4] to-[#2b6aa3]",
      glow: "shadow-[0_20px_40px_-18px_rgb(43_106_163/0.8)]",
    },
  ];

  const maxClass = classes?.[0]?.total_points || 1;
  const challengeShare = impact && impact.total_points ? Math.round((impact.challenge_points / impact.total_points) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* ─────────── Salomlashuv banneri ─────────── */}
      <Reveal from="scale">
        <section className="aurora relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-forest-700 via-forest-800 to-forest-950 p-6 text-white shadow-[var(--shadow-lift)] sm:p-9">
          <div className="absolute inset-0 leaf-pattern opacity-10" />
          <FallingLeaves count={10} />
          <div className="relative grid items-center gap-6 md:grid-cols-[1fr_auto]">
            <div>
              <span className="chip bg-white/10 text-leaf-300 ring-1 ring-white/15">📅 {today?.label ?? "…"}</span>
              <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
                {today?.greeting ?? "Salom"}, <span className="text-gradient-anim italic">{firstName}!</span>
              </h1>
              <p className="mt-3 max-w-lg text-white/70">
                {total > 0
                  ? `Bugun ${total} ta topshiriq sizning qaroringizni kutmoqda. Har bir tasdiq — o‘quvchi uchun motivatsiya!`
                  : "Barcha topshiriqlar ko‘rib chiqilgan. Ajoyib ish! 🎉"}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {total > 0 && (
                  <Link
                    href={counts.challenges ? "/admin/challenges" : counts.recycling ? "/admin/recycling" : "/admin/research"}
                    className="pulse-ring btn btn-lime px-6"
                  >
                    ⚡ Tekshirishni boshlash
                  </Link>
                )}
{isAdmin && (
                <Link href="/admin/events" className="btn bg-white/10 px-6 text-white ring-1 ring-white/20 hover:bg-white/20">
                  + Tadbir qo‘shish
                </Link>
                )}
              </div>
            </div>
            <div className="relative mx-auto hidden h-52 w-52 md:block">
              <div className="blob absolute inset-0 bg-gradient-to-br from-leaf-300/70 to-leaf-500/40" />
              <div className="spin-slow absolute -inset-4 rounded-full border-2 border-dashed border-white/20" />
              <Image src={timoImg} alt="Timo" width={240} height={233} className="relative h-auto w-full animate-float drop-shadow-2xl" />
              {total > 0 && (
                <span className="absolute -left-4 top-6 grid h-14 w-14 place-items-center rounded-2xl bg-coral-500 font-display text-2xl font-semibold shadow-xl animate-float [animation-delay:-2s]">
                  {total}
                </span>
              )}
            </div>
          </div>
        </section>
      </Reveal>

      {/* ─────────── Tekshiruv navbatlari ─────────── */}
      <section className="grid gap-4 md:grid-cols-3">
        {queues.map((q, i) => (
          <Reveal key={q.href} delay={i * 100}>
            <TiltCard max={7} className="h-full rounded-[1.75rem]">
              <Link
                href={q.href}
                className={`hover-bounce group relative block h-full overflow-hidden rounded-[1.75rem] bg-gradient-to-br ${q.bg} p-6 text-white ${q.glow}`}
              >
                <span className="absolute -bottom-6 -right-4 text-[8rem] leading-none opacity-15 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-12">
                  {q.icon}
                </span>
                <div className="relative flex items-center justify-between">
                  <span className="bounce-target grid h-12 w-12 place-items-center rounded-2xl bg-ink/20 text-2xl backdrop-blur">{q.icon}</span>
                  {q.count > 0 ? (
                    <span className="chip bg-surface text-coral-500">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" /> Yangi
                    </span>
                  ) : (
                    <span className="chip bg-ink/20 text-white">✓ Toza</span>
                  )}
                </div>
                <p className="relative mt-6 font-display text-6xl font-semibold leading-none">{q.count}</p>
                <p className="relative mt-2 text-lg font-extrabold">{q.title}</p>
                <p className="relative text-sm text-white/70">{q.text}</p>
                <span className="relative mt-5 inline-flex items-center gap-1.5 rounded-full bg-ink/15 px-4 py-2 text-sm font-extrabold backdrop-blur transition group-hover:bg-ink/25">
                  {q.count > 0 ? "Ko‘rib chiqish" : "Ochish"} <span className="transition-transform group-hover:translate-x-1">→</span>
                </span>
              </Link>
            </TiltCard>
          </Reveal>
        ))}
      </section>

      {/* ─────────── Ko‘rsatkichlar ─────────── */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: "👥", label: "Faol o‘quvchilar", value: impact ? formatNumber(impact.active_students) : null, unit: "nafar", c: "from-leaf-200 to-leaf-100" },
          { icon: "⭐", label: "Jami ballar", value: impact ? formatNumber(impact.total_points) : null, unit: "ball", c: "from-sand-200 to-sand-100" },
          { icon: "✅", label: "Bajarilgan challenge", value: impact ? formatNumber(impact.approved_challenges) : null, unit: "ta", c: "from-sky-500/25 to-transparent" },
          { icon: "♻️", label: "Recycling", value: impact ? formatNumber(impact.recycling_kg, 1) : null, unit: "kg", c: "from-coral-500/20 to-transparent" },
        ].map((s, i) => (
          <Reveal key={s.label} delay={i * 80}>
            <div className={`hover-bounce card card-hover relative h-full overflow-hidden bg-gradient-to-br ${s.c} p-5`}>
              <span className="bounce-target grid h-11 w-11 place-items-center rounded-2xl bg-surface text-xl shadow-sm">{s.icon}</span>
              <p className="mt-4 text-xs font-extrabold uppercase tracking-wider text-muted">{s.label}</p>
              {s.value === null ? (
                <Skeleton className="mt-2 h-9 w-24" />
              ) : (
                <p className="mt-1 font-display text-3xl font-semibold text-accent sm:text-4xl">
                  {s.value}
                  <span className="ml-1 font-sans text-sm font-bold text-muted">{s.unit}</span>
                </p>
              )}
            </div>
          </Reveal>
        ))}
      </section>

      {/* ─────────── Diagrammalar + faoliyat ─────────── */}
      <section className="grid gap-4 xl:grid-cols-[1fr_1fr_1.15fr]">
        {/* Recycling tarkibi */}
        <Reveal className="card min-w-0 p-6">
          <h2 className="text-xl font-semibold">Recycling tarkibi</h2>
          <p className="text-sm text-muted">Tasdiqlangan vazn bo‘yicha</p>
          <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row">
            <div className="relative shrink-0">
              {impact ? (
                <Donut
                  parts={[
                    { value: impact.paper_kg, color: "var(--color-sand-500)" },
                    { value: impact.plastic_kg, color: "var(--color-sky-500)" },
                  ]}
                />
              ) : (
                <Skeleton className="h-[168px] w-[168px] rounded-full" />
              )}
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <p className="font-display text-2xl font-semibold">{formatNumber(impact?.recycling_kg, 1)}</p>
                  <p className="text-[11px] font-bold uppercase text-muted">kg jami</p>
                </div>
              </div>
            </div>
            <div className="grid w-full flex-1 grid-cols-2 gap-3 sm:grid-cols-1">
              {[
                { l: "📄 Qog‘oz", v: impact?.paper_kg, c: "bg-sand-500" },
                { l: "🧴 Plastik", v: impact?.plastic_kg, c: "bg-sky-500" },
              ].map((r) => (
                <div key={r.l} className="rounded-2xl bg-cream p-3">
                  <p className="flex items-center gap-2 text-xs font-bold text-muted">
                    <span className={`h-2.5 w-2.5 rounded-full ${r.c}`} /> {r.l}
                  </p>
                  <p className="mt-0.5 whitespace-nowrap font-display text-lg font-semibold">{formatNumber(r.v, 1)} kg</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 rounded-2xl bg-leaf-100 p-4">
            <div className="flex justify-between text-xs font-extrabold">
              <span>🎯 Challenge {challengeShare}%</span>
              <span>♻️ Recycling {100 - challengeShare}%</span>
            </div>
            <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-surface">
              <div className="bar-grow bg-forest-500" style={{ width: `${challengeShare}%` }} />
              <div className="bar-grow bg-leaf-400" style={{ width: `${100 - challengeShare}%`, animationDelay: "0.3s" }} />
            </div>
            <p className="mt-2 text-[11px] font-bold text-muted">Ballar manbai</p>
          </div>
        </Reveal>

        {/* Sinflar reytingi */}
        <Reveal delay={100} className="card min-w-0 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Top sinflar</h2>
              <p className="text-sm text-muted">Jami ball bo‘yicha</p>
            </div>
            <Link href="/class-leaderboard" className="text-xs font-extrabold text-accent hover:underline">Hammasi →</Link>
          </div>
          <div className="mt-6 flex h-44 items-end gap-3">
            {classes === null
              ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-full flex-1" />)
              : classes.map((c, i) => (
                  <div key={c.class_name} className="group flex h-full flex-1 flex-col items-center justify-end">
                    <span className="mb-1 text-[11px] font-black text-accent opacity-0 transition group-hover:opacity-100">
                      {formatNumber(c.total_points)}
                    </span>
                    <div
                      className={`bar-rise w-full rounded-t-xl ${i === 0 ? "bg-gradient-to-t from-forest-600 to-leaf-400" : "bg-gradient-to-t from-leaf-300 to-leaf-200"} transition group-hover:brightness-110`}
                      style={{ height: `${Math.max(8, (c.total_points / maxClass) * 100)}%`, animationDelay: `${i * 90}ms` }}
                    />
                    <span className="mt-2 text-xs font-extrabold">{c.class_name}</span>
                  </div>
                ))}
          </div>

          <div className="mt-6 border-t border-line pt-5">
            <p className="text-xs font-extrabold uppercase tracking-wider text-muted">Top o‘quvchilar</p>
            <ul className="mt-3 space-y-2">
              {students === null
                ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-9" />)
                : students.slice(0, 4).map((s, i) => (
                    <li key={s.student_id} className="flex items-center gap-3">
                      <span className="w-5 text-center text-sm">{["🥇", "🥈", "🥉"][i] ?? i + 1}</span>
                      <span className="grid h-8 w-8 place-items-center rounded-xl bg-leaf-200 text-[10px] font-black text-accent">
                        {initials(s.full_name)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-bold">{s.full_name}</span>
                      <span className="text-sm font-black text-accent">{s.points}</span>
                    </li>
                  ))}
            </ul>
          </div>
        </Reveal>

        {/* So‘nggi topshiriqlar */}
        <Reveal delay={200} className="card flex min-w-0 flex-col p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Yangi topshiriqlar</h2>
              <p className="text-sm text-muted">Tekshiruvni kutayotganlar</p>
            </div>
            {total > 0 && <span className="chip bg-coral-100 text-coral-500">{total} ta</span>}
          </div>
          <ol className="relative mt-5 flex-1 space-y-1">
            {feed === null ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)
            ) : feed.length === 0 ? (
              <li className="grid h-full place-items-center rounded-2xl bg-cream p-8 text-center">
                <div>
                  <p className="text-4xl animate-sway">🎉</p>
                  <p className="mt-2 font-extrabold">Navbat bo‘sh</p>
                  <p className="text-sm text-muted">Yangi topshiriqlar shu yerda chiqadi</p>
                </div>
              </li>
            ) : (
              feed.map((f) => (
                <li key={f.id}>
                  <Link href={f.href} className="group flex items-center gap-3 rounded-2xl p-2.5 transition hover:bg-cream">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${KIND[f.kind].tint} text-lg shadow-sm transition-transform group-hover:scale-110`}>
                      {KIND[f.kind].icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold">{f.title}</span>
                      <span className="block truncate text-xs text-muted">
                        {f.who} · {timeAgo(f.at)}
                      </span>
                    </span>
                    <span className="text-muted transition group-hover:translate-x-1 group-hover:text-accent">→</span>
                  </Link>
                </li>
              ))
            )}
          </ol>
        </Reveal>
      </section>

      {/* ─────────── Kelgusi tadbirlar ─────────── */}
      <Reveal className="card overflow-hidden">
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Kelgusi tadbirlar</h2>
            <p className="text-sm text-muted">Eko-taqvimdagi eng yaqin sanalar</p>
          </div>
          {isAdmin && <Link href="/admin/events" className="btn btn-primary btn-sm">Boshqarish →</Link>}
        </div>
        <div className="grid gap-px bg-line sm:grid-cols-3">
          {upcoming === null ? (
            <Skeleton className="h-24 rounded-none sm:col-span-3" />
          ) : upcoming.length === 0 ? (
            <p className="bg-surface p-6 text-sm text-muted sm:col-span-3">Kelgusi tadbirlar yo‘q — birinchisini qo‘shing! 📅</p>
          ) : (
            upcoming.map((e) => {
              const d = new Date(e.start_date + "T12:00:00");
              return (
                <div key={e.id} className="flex items-center gap-4 bg-surface p-5 transition hover:bg-leaf-100/50">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-forest-600 to-forest-800 leading-none text-white shadow-md">
                    <span className="text-center">
                      <span className="block font-display text-xl font-semibold">{d.getDate()}</span>
                      <span className="block text-[9px] font-bold uppercase text-leaf-300">{MONTHS[d.getMonth()].slice(0, 3)}</span>
                    </span>
                  </span>
                  <p className="font-extrabold leading-snug">{e.title}</p>
                </div>
              );
            })
          )}
        </div>
      </Reveal>
    </div>
  );
}
