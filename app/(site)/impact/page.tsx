"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatNumber, useSession } from "@/lib/session";
import { Alert, LoginRequired, PageHero, StatCard } from "@/components/ui";

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

const EMPTY: Impact = {
  paper_kg: 0,
  plastic_kg: 0,
  recycling_kg: 0,
  recycling_points: 0,
  approved_challenges: 0,
  challenge_points: 0,
  total_points: 0,
  active_students: 0,
};

export default function ImpactPage() {
  const { user, loading: sessionLoading } = useSession();
  const [supabase] = useState(() => createClient());
  const [impact, setImpact] = useState<Impact>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    supabase.rpc("get_school_overall_impact").then(({ data, error }) => {
      if (error) {
        console.error(error);
        setError("Statistikani yuklab bo‘lmadi.");
      } else {
        const row = Array.isArray(data) ? data[0] : data;
        if (row) {
          setImpact(
            Object.fromEntries(Object.keys(EMPTY).map((k) => [k, Number(row[k]) || 0])) as Impact
          );
        }
      }
      setLoading(false);
    });
  }, [sessionLoading, user, supabase]);

  const paperShare = impact.recycling_kg > 0 ? (impact.paper_kg / impact.recycling_kg) * 100 : 50;
  const challengeShare = impact.total_points > 0 ? (impact.challenge_points / impact.total_points) * 100 : 0;

  return (
    <>
      <PageHero
        eyebrow="Our impact"
        title={
          <>
            Maktabimizning <span className="text-gradient-anim italic">ta’siri</span>
          </>
        }
        text="Har bir kichik harakat katta o‘zgarishning bir qismi. Raqamlar Eco Team tasdiqlagan real ma’lumotlarga asoslanadi."
        emoji="🌍"
      />

      <div className="container-page pb-20">
        {!sessionLoading && !user ? (
          <LoginRequired text="Batafsil statistikani ko‘rish uchun akkauntingizga kiring." />
        ) : (
          <>
            {error && <div className="mb-5"><Alert tone="error">{error}</Alert></div>}

            {/* Asosiy ko‘rsatkich */}
            <section className="relative overflow-hidden rounded-[2rem] bg-forest-800 p-7 text-white sm:p-10">
              <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-leaf-500/25 blur-3xl" />
              <div className="relative grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-leaf-300">Jami qayta ishlashga topshirildi</p>
                  <p className="mt-3 font-display text-6xl font-semibold sm:text-7xl">
                    {loading ? "…" : formatNumber(impact.recycling_kg, 1)}
                    <span className="ml-2 font-sans text-xl font-bold text-white/50">kg</span>
                  </p>
                  <p className="mt-3 max-w-md text-sm leading-6 text-white/65">
                    Bu — {impact.active_students} nafar faol o‘quvchining birgalikdagi mehnati natijasi.
                  </p>
                </div>
                <div className="rounded-[1.5rem] bg-white/[0.07] p-5 ring-1 ring-white/10">
                  <p className="text-sm font-bold text-white/70">Tarkibi</p>
                  <div className="mt-3 flex h-4 overflow-hidden rounded-full bg-white/10">
                    <div className="bg-[#e9b949] transition-all duration-700" style={{ width: `${paperShare}%` }} />
                    <div className="bg-sky-500 transition-all duration-700" style={{ width: `${100 - paperShare}%` }} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="flex items-center gap-2 text-white/65"><span className="h-2.5 w-2.5 rounded-full bg-[#e9b949]" /> Qog‘oz</p>
                      <p className="mt-1 font-display text-2xl font-semibold">{formatNumber(impact.paper_kg, 1)} kg</p>
                    </div>
                    <div>
                      <p className="flex items-center gap-2 text-white/65"><span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> Plastik</p>
                      <p className="mt-1 font-display text-2xl font-semibold">{formatNumber(impact.plastic_kg, 1)} kg</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <StatCard icon="👥" label="Faol o‘quvchilar" value={impact.active_students} unit="nafar" loading={loading} />
              <StatCard icon="✅" label="Tasdiqlangan challenge" value={impact.approved_challenges} unit="ta" tone="sky" loading={loading} />
              <StatCard icon="⭐" label="Jami ballar" value={formatNumber(impact.total_points)} unit="ball" tone="sand" loading={loading} />
              <StatCard icon="♻️" label="Recycling ballari" value={formatNumber(impact.recycling_points)} unit="ball" tone="coral" loading={loading} />
            </section>

            <section className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="card p-6 sm:p-7">
                <p className="eyebrow">Ballar manbai</p>
                <h2 className="mt-3 text-2xl font-semibold">Qayerdan keldi?</h2>
                <div className="mt-6 space-y-4">
                  <div>
                    <div className="flex justify-between text-sm font-bold">
                      <span>🎯 Challenge’lar</span>
                      <span>{formatNumber(impact.challenge_points)} ball</span>
                    </div>
                    <div className="mt-2 h-3 rounded-full bg-cream">
                      <div className="h-full rounded-full bg-forest-500 transition-all duration-700" style={{ width: `${challengeShare}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm font-bold">
                      <span>♻️ Recycling</span>
                      <span>{formatNumber(impact.recycling_points)} ball</span>
                    </div>
                    <div className="mt-2 h-3 rounded-full bg-cream">
                      <div
                        className="h-full rounded-full bg-leaf-400 transition-all duration-700"
                        style={{ width: `${impact.total_points > 0 ? (impact.recycling_points / impact.total_points) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="card bg-leaf-100/60 p-6 sm:p-7">
                <p className="eyebrow">Shaffoflik</p>
                <h2 className="mt-3 text-2xl font-semibold">Natijalar haqida</h2>
                <p className="mt-4 text-sm leading-7 text-muted">
                  Recycling ko‘rsatkichlari Eco Team tasdiqlagan haqiqiy vaznlardan olinadi. Challenge natijalari esa tasdiqlangan topshiriqlarga asoslanadi.
                </p>
                <p className="mt-3 text-sm leading-7 text-muted">
                  Bu raqamlar chiqindilar qayta ishlashga topshirilganini bildiradi, ularning zavodda qayta ishlangani haqida mustaqil dalil hisoblanmaydi.
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}
