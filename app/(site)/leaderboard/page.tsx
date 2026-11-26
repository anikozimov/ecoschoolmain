"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { initials, useSession } from "@/lib/session";
import { Alert, EmptyState, LoginRequired, PageHero, Skeleton } from "@/components/ui";
import { LeaderboardSwitch, Podium } from "@/components/Podium";

type Student = {
  student_id: string;
  full_name: string;
  class_name: string | null;
  points: number;
};

export default function LeaderboardPage() {
  const { user, loading: sessionLoading } = useSession();
  const [supabase] = useState(() => createClient());
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_school_leaderboard");
    if (error) {
      console.error(error);
      setError("Reytingni yuklab bo‘lmadi.");
    } else {
      setStudents(
        ((data as Student[]) || []).map((item) => ({ ...item, points: Number(item.points) || 0 }))
      );
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) setLoading(false);
    else load();
  }, [sessionLoading, user, load]);

  const myIndex = students.findIndex((s) => s.student_id === user?.id);
  const filtered = students
    .map((s, i) => ({ ...s, rank: i + 1 }))
    .filter(
      (s) =>
        !query.trim() ||
        s.full_name?.toLowerCase().includes(query.toLowerCase()) ||
        s.class_name?.toLowerCase().includes(query.toLowerCase())
    );
  const max = students[0]?.points || 1;

  return (
    <>
      <PageHero
        eyebrow="Reyting"
        tone="sand"
        title={
          <>
            Ekologik <span className="text-gradient-anim italic">yetakchilar</span>
          </>
        }
        text="Maktabimizdagi eng faol eko-qahramonlar. Har bir tasdiqlangan harakat sizni yuqoriga ko‘taradi."
        emoji="🏆"
      >
        <LeaderboardSwitch active="students" />
      </PageHero>

      <div className="container-page pb-20">
        {!sessionLoading && !user ? (
          <LoginRequired text="Reyting faqat maktab a’zolariga ko‘rinadi." />
        ) : loading || sessionLoading ? (
          <div className="space-y-4">
            <Skeleton className="mx-auto h-64 max-w-2xl" />
            <Skeleton className="h-96" />
          </div>
        ) : error ? (
          <Alert tone="error">{error}</Alert>
        ) : students.length === 0 ? (
          <EmptyState icon="🏆" title="Reyting hali bo‘sh" text="Birinchi ballni siz oling — challenge bajaring!" />
        ) : (
          <>
            <Podium
              initialsOf={initials}
              items={students.slice(0, 3).map((s) => ({
                key: s.student_id,
                title: s.full_name || "O‘quvchi",
                subtitle: s.class_name || "—",
                points: s.points,
                highlight: s.student_id === user?.id,
              }))}
            />

            {myIndex >= 0 && (
              <div className="pulse-ring mx-auto mt-8 flex max-w-2xl items-center gap-4 rounded-[1.5rem] bg-glow p-4 text-forest-950 sm:p-5">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-leaf-400 font-display text-xl font-semibold text-forest-950">
                  #{myIndex + 1}
                </span>
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-white/60">Sizning o‘rningiz</p>
                  <p className="font-extrabold">
                    {myIndex === 0
                      ? "Siz yetakchisiz! 🎉"
                      : `#${myIndex} o‘ringa ${students[myIndex - 1].points - students[myIndex].points + 1} ball qoldi`}
                  </p>
                </div>
                <span className="font-display text-2xl font-semibold">{students[myIndex].points}</span>
              </div>
            )}

            <section className="card mt-8 overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Barcha o‘quvchilar</h2>
                  <p className="text-sm text-muted">Jami {students.length} nafar</p>
                </div>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="🔍 Ism yoki sinf bo‘yicha qidirish"
                  className="input py-2.5 sm:max-w-xs"
                />
              </div>
              <ol className="divide-y divide-line">
                {filtered.map((s) => {
                  const me = s.student_id === user?.id;
                  return (
                    <li key={s.student_id} className={`flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-cream sm:gap-4 sm:px-5 ${me ? "bg-leaf-100" : ""}`}>
                      <span className={`w-8 shrink-0 text-center font-display text-lg font-semibold ${s.rank <= 3 ? "text-sand-400" : "text-muted"}`}>
                        {s.rank}
                      </span>
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-leaf-200 text-xs font-black text-accent">
                        {initials(s.full_name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-extrabold">
                          {s.full_name || "O‘quvchi"} {me && <span className="chip ml-1 bg-glow text-forest-950">Siz</span>}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-xs text-muted">{s.class_name || "—"}</span>
                          <div className="hidden h-1.5 flex-1 rounded-full bg-cream sm:block">
                            <div className="bar-grow h-full rounded-full bg-gradient-to-r from-forest-500 to-leaf-400" style={{ width: `${Math.max(3, (s.points / max) * 100)}%` }} />
                          </div>
                        </div>
                      </div>
                      <span className="shrink-0 font-display text-lg font-semibold text-accent">
                        {s.points.toLocaleString("uz-UZ")}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
            <p className="mt-4 text-xs leading-5 text-muted">
              Reyting faqat tizimga kirgan maktab a’zolariga ko‘rinadi. Ism-familiya ko‘rsatilishi maktab va ota-onalar roziligi asosida bo‘lishi kerak.
            </p>
          </>
        )}
      </div>
    </>
  );
}
