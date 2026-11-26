"use client";

import { Reveal } from "@/components/effects";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { MONTHS, formatNumber, useSession } from "@/lib/session";
import { monthInputValue } from "@/lib/eco";
import { Alert, EmptyState, LoginRequired, PageHero, Skeleton, Tabs } from "@/components/ui";

type Row = { class_name: string; students: number; points: number; per_student: number; recycling_kg: number; challenges: number; research: number };
type Mode = "total" | "fair";

const MEDALS = ["🥇", "🥈", "🥉"];

function monthLabel(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function LeaguePage() {
  const { user, profile, loading: sessionLoading } = useSession();
  const [supabase] = useState(() => createClient());
  const months = useMemo(() => [0, -1, -2, -3, -4, -5].map((o) => monthInputValue(o)), []);
  const [month, setMonth] = useState(months[0]);
  const [mode, setMode] = useState<Mode>("total");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase.rpc("get_league", { p_month: month });
    if (err) {
      console.error(err);
      setError(err.code === "PGRST202" ? "Eco League hali sozlanmagan (administrator yangi SQL faylni ishga tushirishi kerak)." : "Natijalarni yuklab bo‘lmadi.");
      setRows([]);
    } else {
      setError("");
      setRows(((data as Row[]) || []).map((r) => ({ ...r, points: Number(r.points), per_student: Number(r.per_student), recycling_kg: Number(r.recycling_kg), students: Number(r.students), challenges: Number(r.challenges), research: Number(r.research) })));
    }
    setLoading(false);
  }, [supabase, month]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) setLoading(false);
    else load();
  }, [sessionLoading, user, load]);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => (mode === "total" ? b.points - a.points : b.per_student - a.per_student) || a.class_name.localeCompare(b.class_name)),
    [rows, mode]
  );
  const value = (r: Row) => (mode === "total" ? r.points : r.per_student);
  const max = Math.max(1, ...sorted.map(value));
  const myClass = profile?.class_name?.toUpperCase() || "";
  const leader = sorted[0] && value(sorted[0]) > 0 ? sorted[0] : null;
  const isCurrent = month === months[0];
  const daysLeft = (() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
  })();

  return (
    <>
      <PageHero
        eyebrow="Eco League"
        tone="sky"
        title={
          <>
            Sinflar <span className="text-gradient-anim italic">mavsumiy</span> turniri
          </>
        }
        text="Har oy yangi mavsum. Challenge, tadqiqot va recycling ballari sinfga qo‘shiladi. Oy yakunida g‘oliblar maktab yig‘ilishida e’lon qilinadi."
        emoji="🏆"
      />

      <div className="container-page pb-20">
        {!sessionLoading && !user ? (
          <LoginRequired text="Ligani ko‘rish uchun akkauntingizga kiring." />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <select value={month} onChange={(e) => setMonth(e.target.value)} className="input w-auto py-2.5 font-bold" aria-label="Mavsum">
                {months.map((m, i) => (
                  <option key={m} value={m}>{monthLabel(m)}{i === 0 ? " (joriy)" : ""}</option>
                ))}
              </select>
              <Tabs<Mode>
                value={mode}
                onChange={setMode}
                items={[
                  { value: "total", label: "Jami ball" },
                  { value: "fair", label: "O‘quvchi boshiga" },
                ]}
              />
              {isCurrent && <span className="chip ml-auto bg-sky-100 text-sky-500">⏳ Mavsum tugashiga {daysLeft} kun</span>}
            </div>
            <p className="mt-2 text-xs text-muted">
              “O‘quvchi boshiga” — kichik sinflar ham adolatli bellashishi uchun: sinf bali o‘quvchilar soniga bo‘linadi.
            </p>

            {error && <div className="mt-5"><Alert tone="error">{error}</Alert></div>}

            {leader && (
              <Reveal>
                <div className="relative mt-6 overflow-hidden rounded-[1.75rem] bg-glow p-6 text-forest-950 sm:p-8">
                  <span className="absolute -right-4 -top-6 text-[9rem] opacity-15">🏆</span>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-forest-950/60">{isCurrent ? "Hozircha yetakchi" : `${monthLabel(month)} g‘olibi`}</p>
                  <p className="mt-1 font-display text-5xl font-semibold">{leader.class_name}</p>
                  <p className="mt-2 text-sm font-bold">
                    {formatNumber(leader.points)} XP · o‘quvchi boshiga {formatNumber(leader.per_student, 1)} · {formatNumber(leader.recycling_kg, 1)} kg recycling
                  </p>
                </div>
              </Reveal>
            )}

            <div className="card mt-6 p-4 sm:p-6">
              {loading ? (
                <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
              ) : sorted.length === 0 ? (
                <EmptyState icon="🏫" title="Sinflar topilmadi" text="Administrator “Maktab va sinflar” bo‘limida sinflarni qo‘shadi." />
              ) : (
                <ol className="space-y-2.5">
                  {sorted.map((r, i) => {
                    const mine = r.class_name === myClass;
                    return (
                      <li key={r.class_name} className={`rounded-2xl p-3.5 ring-1 ${mine ? "bg-leaf-100/60 ring-forest-500" : "bg-ink/[0.02] ring-line"}`}>
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink/[0.06] text-sm font-black">
                            {value(r) > 0 ? MEDALS[i] ?? i + 1 : i + 1}
                          </span>
                          <span className="font-extrabold">
                            {r.class_name}
                            {mine && <span className="chip ml-2 bg-glow align-middle text-forest-950">Sizning sinf</span>}
                          </span>
                          <span className="ml-auto whitespace-nowrap font-display text-lg font-semibold">
                            {mode === "total" ? `${formatNumber(r.points)} XP` : `${formatNumber(r.per_student, 1)} / o‘q.`}
                          </span>
                        </div>
                        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-ink/[0.06]">
                          <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${(value(r) / max) * 100}%` }} />
                        </div>
                        <p className="mt-1.5 text-[11px] text-muted">
                          👥 {r.students} o‘quvchi · 🎯 {r.challenges} challenge · 📚 {r.research} tadqiqot · ♻️ {formatNumber(r.recycling_kg, 1)} kg
                        </p>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
