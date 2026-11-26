"use client";

import { Reveal } from "@/components/effects";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatNumber, useSession } from "@/lib/session";
import { Alert, EmptyState, LoginRequired, PageHero, Skeleton } from "@/components/ui";
import { LeaderboardSwitch, Podium } from "@/components/Podium";

type ClassResult = {
  class_name: string;
  student_count: number;
  total_points: number;
  recycling_kg: number;
  approved_challenges: number;
};

export default function ClassLeaderboardPage() {
  const { user, profile, loading: sessionLoading } = useSession();
  const [supabase] = useState(() => createClient());
  const [classes, setClasses] = useState<ClassResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_school_class_leaderboard");
    if (error) {
      console.error(error);
      setError("Sinflar reytingini yuklab bo‘lmadi.");
    } else {
      setClasses(
        ((data as ClassResult[]) || []).map((item) => ({
          class_name: item.class_name,
          student_count: Number(item.student_count) || 0,
          total_points: Number(item.total_points) || 0,
          recycling_kg: Number(item.recycling_kg) || 0,
          approved_challenges: Number(item.approved_challenges) || 0,
        }))
      );
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) setLoading(false);
    else load();
  }, [sessionLoading, user, load]);

  const max = classes[0]?.total_points || 1;

  return (
    <>
      <PageHero
        eyebrow="Class vs Class"
        title={
          <>
            Sinflar <span className="text-gradient-anim italic">bellashuvi</span>
          </>
        }
        text="Birgalikdagi harakat — katta o‘zgarish. Qaysi sinf maktabimiz ekologiyasiga eng katta hissa qo‘shmoqda?"
        emoji="🏫"
      >
        <LeaderboardSwitch active="classes" />
      </PageHero>

      <div className="container-page pb-20">
        {!sessionLoading && !user ? (
          <LoginRequired text="Sinflar reytingi faqat maktab a’zolariga ko‘rinadi." />
        ) : loading || sessionLoading ? (
          <div className="space-y-4">
            <Skeleton className="mx-auto h-64 max-w-2xl" />
            <Skeleton className="h-96" />
          </div>
        ) : error ? (
          <Alert tone="error">{error}</Alert>
        ) : classes.length === 0 ? (
          <EmptyState icon="🏫" title="Hozircha ma’lumot yo‘q" text="Sinflar ball to‘plashni boshlagach, bu yerda reyting paydo bo‘ladi." />
        ) : (
          <>
            <Podium
              items={classes.slice(0, 3).map((c) => ({
                key: c.class_name,
                title: c.class_name,
                subtitle: `${c.student_count} nafar o‘quvchi`,
                points: c.total_points,
                highlight: c.class_name === profile?.class_name,
              }))}
            />

            <section className="mt-10 grid gap-4">
              {classes.map((c, i) => {
                const mine = c.class_name === profile?.class_name;
                return (
                  <Reveal key={c.class_name} delay={Math.min(i, 5) * 70}>
                  <article className={`card card-hover p-5 sm:p-6 ${mine ? "ring-2 ring-leaf-400" : ""}`}>
                    <div className="flex items-center gap-4">
                      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl font-display text-xl font-semibold ${
                        i < 3 ? "bg-sand-200 text-sand-400" : "bg-cream text-muted"
                      }`}>
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xl font-semibold">
                          {c.class_name} {mine && <span className="chip ml-1 bg-glow align-middle font-sans text-forest-950">Sizning sinfingiz</span>}
                        </h3>
                        <div className="mt-2 h-2 rounded-full bg-cream">
                          <div className="bar-grow h-full rounded-full bg-gradient-to-r from-forest-500 to-leaf-400" style={{ width: `${Math.max(3, (c.total_points / max) * 100)}%` }} />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-2xl font-semibold text-accent">{c.total_points.toLocaleString("uz-UZ")}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted">ball</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center sm:gap-3">
                      <div className="rounded-xl bg-cream px-2 py-2.5">
                        <p className="text-[11px] font-bold text-muted">♻️ Recycling</p>
                        <p className="mt-0.5 font-extrabold">{formatNumber(c.recycling_kg, 1)} kg</p>
                      </div>
                      <div className="rounded-xl bg-cream px-2 py-2.5">
                        <p className="text-[11px] font-bold text-muted">🎯 Challenge</p>
                        <p className="mt-0.5 font-extrabold">{c.approved_challenges} ta</p>
                      </div>
                      <div className="rounded-xl bg-cream px-2 py-2.5">
                        <p className="text-[11px] font-bold text-muted">👥 O‘quvchi</p>
                        <p className="mt-0.5 font-extrabold">{c.student_count}</p>
                      </div>
                    </div>
                  </article>
                  </Reveal>
                );
              })}
            </section>
          </>
        )}
      </div>
    </>
  );
}
