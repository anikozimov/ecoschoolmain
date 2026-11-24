"use client";

import { Reveal } from "@/components/effects";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatDate, formatNumber, useSession } from "@/lib/session";
import { useSiteContent } from "@/lib/content";
import { Alert, EmptyState, LoginRequired, PageHero, Skeleton } from "@/components/ui";

type ClassRow = { class_name: string; paper_kg: number; plastic_kg: number; total_kg: number; points: number; entries: number };
type Entry = { id: number; class_name: string; material: "paper" | "plastic"; amount_kg: number; verified_amount_kg: number | null; awarded_points: number; submitted_at: string };

const POINTS_PER_KG = 25;
const MEDALS = ["🥇", "🥈", "🥉"];

const materials = {
  paper: { icon: "📄", label: "Qog‘oz", tint: "bg-sand-100" },
  plastic: { icon: "🧴", label: "Plastik", tint: "bg-sky-100" },
} as const;

export default function RecyclingPage() {
  const { user, profile, loading: sessionLoading, isAdmin } = useSession();
  const content = useSiteContent("recycling");
  const [supabase] = useState(() => createClient());
  const [rows, setRows] = useState<ClassRow[]>([]);
  const [recent, setRecent] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [sRes, eRes] = await Promise.all([
      supabase.rpc("get_class_recycling"),
      supabase
        .from("recycling_submissions")
        .select("id, class_name, material, amount_kg, verified_amount_kg, awarded_points, submitted_at")
        .is("student_id", null)
        .eq("status", "approved")
        .order("submitted_at", { ascending: false })
        .limit(8),
    ]);
    if (sRes.error) {
      console.error(sRes.error);
      setError("Natijalarni yuklab bo‘lmadi. Birozdan keyin qayta urinib ko‘ring.");
    } else {
      setRows(((sRes.data as ClassRow[]) || []).map((r) => ({ ...r, total_kg: Number(r.total_kg), paper_kg: Number(r.paper_kg), plastic_kg: Number(r.plastic_kg) })));
    }
    if (!eRes.error) setRecent((eRes.data as Entry[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) setLoading(false);
    else load();
  }, [sessionLoading, user, load]);

  const totalKg = rows.reduce((s, r) => s + r.total_kg, 0);
  const myClass = profile?.class_name?.toUpperCase() || "";
  const myRank = rows.findIndex((r) => r.class_name === myClass);
  const maxKg = Math.max(1, ...rows.map((r) => r.total_kg));

  return (
    <>
      <PageHero
        eyebrow="Recycling"
        tone="sand"
        title={
          <>
            {content.title} <span className="text-gradient-anim italic">{content.accent}</span>
          </>
        }
        text={content.text}
        emoji="♻️"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { n: "1", icon: "🧺", title: "Sinf bilan to‘plang", text: "Qog‘oz yoki plastikni sinfingiz bilan yig‘ib, Eco Team’ga topshiring" },
            { n: "2", icon: "⚖️", title: "Eco Team o‘lchaydi", text: "Chiqindi tarozida tortiladi va vazni tasdiqlanadi" },
            { n: "3", icon: "⭐", title: "Sinfingiz ball oladi", text: `Har 1 kg uchun ${POINTS_PER_KG} ball sinflar reytingiga qo‘shiladi` },
          ].map((s) => (
            <div key={s.n} className="glass-strong flex items-start gap-3 rounded-2xl p-4">
              <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-2xl">
                {s.icon}
                <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-glow text-[10px] font-black text-forest-950">{s.n}</span>
              </span>
              <span>
                <span className="block font-extrabold">{s.title}</span>
                <span className="mt-0.5 block text-xs leading-5 text-muted">{s.text}</span>
              </span>
            </div>
          ))}
        </div>
        {isAdmin && (
          <Link href="/admin/recycling" className="btn btn-lime btn-sm mt-5">
            ⚙️ Recycling kiritish
          </Link>
        )}
      </PageHero>

      <div className="container-page pb-20">
        {!sessionLoading && !user ? (
          <LoginRequired text="Sinflar natijasini ko‘rish uchun akkauntingizga kiring." />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <Reveal from="left">
              <div className="card p-6 sm:p-8">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold">Sinflar reytingi</h2>
                    <p className="mt-1 text-sm text-muted">Eco Team tarozida o‘lchab tasdiqlagan chiqindi</p>
                  </div>
                  <Link href="/class-leaderboard" className="text-sm font-extrabold text-accent hover:underline">Umumiy reyting →</Link>
                </div>
                {error && <div className="mt-5"><Alert tone="error">{error}</Alert></div>}
                <div className="mt-6 space-y-2.5">
                  {loading ? (
                    <>
                      <Skeleton className="h-16" />
                      <Skeleton className="h-16" />
                      <Skeleton className="h-16" />
                    </>
                  ) : rows.length === 0 ? (
                    <EmptyState icon="♻️" title="Hali natija yo‘q" text="Birinchi topshiruvdan keyin sinflar shu yerda ko‘rinadi." />
                  ) : (
                    rows.map((r, i) => {
                      const mine = r.class_name === myClass;
                      return (
                        <div key={r.class_name} className={`rounded-2xl p-3.5 ring-1 ${mine ? "bg-leaf-100/50 ring-forest-500" : "bg-white/[0.03] ring-line"}`}>
                          <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-sm font-black">
                              {MEDALS[i] ?? i + 1}
                            </span>
                            <span className="font-extrabold">
                              {r.class_name}
                              {mine && <span className="chip ml-2 bg-glow align-middle text-forest-950">Sizning sinf</span>}
                            </span>
                            <span className="ml-auto font-display text-lg font-semibold">{formatNumber(r.total_kg, 1)} kg</span>
                            <span className="w-16 text-right text-sm font-extrabold text-accent">+{r.points}</span>
                          </div>
                          <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                            <div className="h-full rounded-full bg-glow transition-all duration-700" style={{ width: `${(r.total_kg / maxKg) * 100}%` }} />
                          </div>
                          <p className="mt-1.5 text-[11px] text-muted">📄 {formatNumber(r.paper_kg, 1)} kg · 🧴 {formatNumber(r.plastic_kg, 1)} kg</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </Reveal>

            <Reveal from="right" as="aside" className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="relative overflow-hidden rounded-[1.5rem] bg-glow p-5 text-forest-950">
                  <span className="absolute -right-3 -top-3 text-6xl opacity-15 animate-sway">♻️</span>
                  <p className="text-xs font-bold uppercase tracking-wider text-forest-950/60">Maktab bo‘yicha</p>
                  <p className="mt-2 font-display text-3xl font-semibold">
                    {formatNumber(totalKg, 1)} <span className="text-sm text-forest-950/60">kg</span>
                  </p>
                </div>
                <div className="rounded-[1.5rem] bg-leaf-300 p-5 text-forest-950">
                  <p className="text-xs font-bold uppercase tracking-wider text-forest-950/60">Sinfingiz</p>
                  <p className="mt-2 font-display text-3xl font-semibold">{myRank >= 0 ? `${myRank + 1}-o‘rin` : "—"}</p>
                </div>
              </div>

              <div className="card p-5 sm:p-6">
                <h2 className="text-xl font-semibold">So‘nggi o‘lchovlar</h2>
                <div className="mt-4 space-y-3">
                  {loading ? (
                    <Skeleton className="h-16" />
                  ) : recent.length === 0 ? (
                    <EmptyState icon="⚖️" title="Hali o‘lchov yo‘q" />
                  ) : (
                    recent.map((item) => {
                      const m = materials[item.material] ?? materials.paper;
                      return (
                        <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-cream p-3">
                          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl ${m.tint}`}>{m.icon}</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-extrabold">
                              {item.class_name} · {formatNumber(Number(item.verified_amount_kg ?? item.amount_kg), 1)} kg
                            </p>
                            <p className="text-xs text-muted">{m.label} · {formatDate(item.submitted_at)}</p>
                          </div>
                          <p className="text-sm font-extrabold text-accent">+{item.awarded_points}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </Reveal>
          </div>
        )}
      </div>
    </>
  );
}
