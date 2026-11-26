"use client";

import { Reveal } from "@/components/effects";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatDate, formatNumber, useSession } from "@/lib/session";
import { GF_STEPS, TASK_STATUS, goalPct, goalValue, loadGreenFlag, stepState, type GreenFlagData } from "@/lib/greenflag";
import { Alert, EmptyState, LoginRequired, PageHero, Skeleton } from "@/components/ui";

const STATE = [
  { label: "Boshlanmagan", cls: "bg-ink/[0.06] text-muted", ring: "ring-line" },
  { label: "Jarayonda", cls: "bg-sand-200 text-sand-400", ring: "ring-sand-400/40" },
  { label: "Bajarildi ✓", cls: "bg-glow text-forest-950", ring: "ring-forest-500" },
];

export default function GreenFlagPage() {
  const { user, isAdmin, loading: sessionLoading } = useSession();
  const [supabase] = useState(() => createClient());
  const [data, setData] = useState<GreenFlagData | null>(null);

  useEffect(() => {
    if (sessionLoading || !user) return;
    loadGreenFlag(supabase).then(setData);
  }, [sessionLoading, user, supabase]);

  const done = data ? GF_STEPS.filter((s) => stepState(s.key, data) === 2).length : 0;

  return (
    <>
      <PageHero
        eyebrow="Green Flag"
        tone="leaf"
        title={
          <>
            Yashil bayroq sari <span className="text-gradient-anim italic">7 qadam</span>
          </>
        }
        text="Eco-Schools xalqaro dasturi: maktabimiz har bir qadamni bajarib, Green Flag mukofotini olishga intiladi. Hamma narsa shaffof — maqsadlar, rejalar va natijalar."
        emoji="🏳️"
      >
        {isAdmin && (
          <Link href="/admin/greenflag" className="btn btn-lime btn-sm">⚙️ Boshqarish</Link>
        )}
      </PageHero>

      <div className="container-page pb-20">
        {!sessionLoading && !user ? (
          <LoginRequired text="Green Flag jarayonini ko‘rish uchun akkauntingizga kiring." />
        ) : !data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)}</div>
        ) : !data.ready ? (
          <Alert tone="error">Green Flag bo‘limi hali sozlanmagan. Administrator Supabase’da yangi SQL faylni ishga tushirishi kerak.</Alert>
        ) : (
          <div className="space-y-6">
            {/* 7 qadam */}
            <section>
              <div className="mb-4 flex items-end justify-between gap-3">
                <h2 className="text-2xl font-semibold">7 qadam</h2>
                <span className="chip bg-leaf-100 text-accent">{done} / 7 bajarildi</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {GF_STEPS.map((s, i) => {
                  const st = STATE[stepState(s.key, data)];
                  return (
                    <Reveal key={s.key} delay={i * 50}>
                      <div className={`card h-full p-4 ring-1 ${st.ring}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-2xl">{s.icon}</span>
                          <span className={`chip ${st.cls}`}>{st.label}</span>
                        </div>
                        <p className="mt-3 text-xs font-black text-muted">{s.n}-qadam</p>
                        <p className="font-extrabold">{s.title}</p>
                        <p className="mt-1 text-xs text-muted">{s.text}</p>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            </section>

            {/* Monitoring */}
            <section className="card p-6 sm:p-8">
              <h2 className="text-2xl font-semibold">📈 Maqsadlar va natijalar</h2>
              <p className="mt-1 text-sm text-muted">Belgilangan maqsadlarga qanchalik yaqinmiz. “avto” — sayt ma’lumotlaridan o‘zi hisoblanadi.</p>
              <div className="mt-6 grid gap-x-8 gap-y-5 md:grid-cols-2">
                {data.goals.length === 0 ? (
                  <EmptyState icon="🎯" title="Maqsadlar hali qo‘shilmagan" />
                ) : (
                  data.goals.map((g) => {
                    const pct = goalPct(g, data.auto);
                    const v = goalValue(g, data.auto);
                    return (
                      <div key={g.id}>
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="font-extrabold">
                            {g.title}
                            {g.auto && <span className="ml-2 align-middle text-[10px] font-black uppercase text-accent">avto</span>}
                          </span>
                          <span className="whitespace-nowrap text-sm font-bold">
                            {formatNumber(v, v % 1 ? 1 : 0)} / {formatNumber(g.target)} {g.unit}
                          </span>
                        </div>
                        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink/[0.06]">
                          <div className={`h-full rounded-full transition-all duration-700 ${pct >= 100 ? "bg-glow" : "bg-gradient-to-r from-forest-500 to-leaf-400"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Eco Committee */}
              <section className="card p-6 sm:p-8">
                <h2 className="text-2xl font-semibold">👥 Eco Committee</h2>
                <div className="mt-5 flex flex-wrap gap-2">
                  {data.members.length === 0 ? (
                    <p className="text-sm text-muted">A’zolar hali qo‘shilmagan.</p>
                  ) : (
                    data.members.map((m) => (
                      <span key={m.id} className="rounded-2xl bg-ink/[0.04] px-3.5 py-2 ring-1 ring-line">
                        <span className="block text-sm font-extrabold">{m.full_name}</span>
                        <span className="block text-[11px] text-muted">{[m.role_title, m.class_name].filter(Boolean).join(" · ") || "A’zo"}</span>
                      </span>
                    ))
                  )}
                </div>
                <h3 className="mt-7 text-sm font-black uppercase tracking-wider text-muted">Yig‘ilishlar</h3>
                <div className="mt-3 space-y-2">
                  {data.meetings.length === 0 ? (
                    <p className="text-sm text-muted">Hali yig‘ilish o‘tkazilmagan.</p>
                  ) : (
                    data.meetings.slice(0, 5).map((mt) => (
                      <details key={mt.id} className="rounded-2xl bg-ink/[0.03] p-3.5 ring-1 ring-line">
                        <summary className="cursor-pointer list-none">
                          <span className="font-extrabold">{mt.title}</span>
                          <span className="ml-2 text-xs text-muted">{formatDate(mt.meet_date)}</span>
                        </summary>
                        {mt.decisions && <p className="mt-2 whitespace-pre-line text-sm"><b>Qarorlar:</b> {mt.decisions}</p>}
                        {mt.minutes && <p className="mt-2 whitespace-pre-line text-sm text-muted">{mt.minutes}</p>}
                      </details>
                    ))
                  )}
                </div>
              </section>

              {/* Action Plan */}
              <section className="card p-6 sm:p-8">
                <h2 className="text-2xl font-semibold">🗂️ Action Plan</h2>
                <div className="mt-5 space-y-2">
                  {data.tasks.length === 0 ? (
                    <p className="text-sm text-muted">Reja hali tuzilmagan.</p>
                  ) : (
                    data.tasks.map((t) => (
                      <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-ink/[0.03] p-3.5 ring-1 ring-line">
                        <span className="text-lg">{GF_STEPS.find((s) => s.key === t.step)?.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className={`block font-extrabold ${t.status === "done" ? "line-through opacity-60" : ""}`}>{t.title}</span>
                          <span className="block text-xs text-muted">
                            {[t.owner_name && `👤 ${t.owner_name}`, t.deadline && `📅 ${formatDate(t.deadline)}`].filter(Boolean).join(" · ") || "—"}
                          </span>
                        </span>
                        <span className={`chip ${TASK_STATUS[t.status].cls}`}>{TASK_STATUS[t.status].label}</span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            {/* Eco-Code */}
            <section className="relative overflow-hidden rounded-[1.75rem] bg-forest-800 p-7 text-white sm:p-10">
              <span className="absolute -right-6 -top-10 text-[10rem] opacity-10">📜</span>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-leaf-300">7-qadam · Eco-Code</p>
              <h2 className="mt-2 text-3xl font-semibold">Maktabimizning ekologik nizomi</h2>
              {data.ecocode ? (
                <p className="relative mt-5 max-w-3xl whitespace-pre-line font-display text-lg leading-8 text-white/90">{data.ecocode}</p>
              ) : (
                <p className="mt-4 text-white/70">Nizom Eco Committee tomonidan tayyorlanmoqda.</p>
              )}
            </section>
          </div>
        )}
      </div>
    </>
  );
}
