"use client";

import { FallingLeaves } from "@/components/effects";

import Link from "next/link";
import { displayLogin } from "@/lib/login";
import { useAppRouter } from "@/lib/nav";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatDate, initials, useSession } from "@/lib/session";
import { LoginRequired, Skeleton, StatusBadge, type Status } from "@/components/ui";

type Activity = {
  id: string;
  kind: "challenge" | "recycling" | "research";
  title: string;
  status: Status;
  points: number;
  date: string;
};

const LEVELS = [
  { min: 0, name: "Urug‘", icon: "🌰" },
  { min: 50, name: "Nihol", icon: "🌱" },
  { min: 150, name: "Barg", icon: "🍃" },
  { min: 300, name: "Daraxt", icon: "🌳" },
  { min: 600, name: "O‘rmon", icon: "🌲" },
  { min: 1000, name: "Eko-qahramon", icon: "🦸" },
];

export default function ProfilePage() {
  const router = useAppRouter();
  const { user, profile, isAdmin, isStaff, isOwner, loading } = useSession();
  const [supabase] = useState(() => createClient());
  const [activity, setActivity] = useState<Activity[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [ch, rec, res] = await Promise.all([
        supabase
          .from("challenge_submissions")
          .select("id, status, awarded_points, submitted_at, challenges(title)")
          .eq("student_id", user.id)
          .order("submitted_at", { ascending: false })
          .limit(10),
        supabase
          .from("recycling_submissions")
          .select("id, material, amount_kg, status, awarded_points, submitted_at")
          .eq("student_id", user.id)
          .order("submitted_at", { ascending: false })
          .limit(10),
        supabase
          .from("eco_research")
          .select("id, title, status, awarded_points, submitted_at")
          .eq("student_id", user.id)
          .order("submitted_at", { ascending: false })
          .limit(10),
      ]);

      const items: Activity[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ch.data || []).forEach((r: any) =>
        items.push({
          id: "c" + r.id,
          kind: "challenge",
          title: (Array.isArray(r.challenges) ? r.challenges[0]?.title : r.challenges?.title) || "Challenge",
          status: r.status,
          points: r.awarded_points || 0,
          date: r.submitted_at,
        })
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (rec.data || []).forEach((r: any) =>
        items.push({
          id: "r" + r.id,
          kind: "recycling",
          title: `${r.material === "paper" ? "Qog‘oz" : "Plastik"} · ${r.amount_kg} kg`,
          status: r.status,
          points: r.awarded_points || 0,
          date: r.submitted_at,
        })
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (res.data || []).forEach((r: any) =>
        items.push({
          id: "t" + r.id,
          kind: "research",
          title: r.title,
          status: r.status,
          points: r.awarded_points || 0,
          date: r.submitted_at,
        })
      );
      items.sort((a, b) => (a.date < b.date ? 1 : -1));
      setActivity(items.slice(0, 12));
      setActivityLoading(false);
    })();
  }, [user, supabase]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="container-page py-10">
        <Skeleton className="h-64" />
        <Skeleton className="mt-6 h-96" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container-page py-12">
        <LoginRequired />
      </div>
    );
  }

  const points = profile?.points ?? 0;
  const levelIndex = LEVELS.reduce((acc, l, i) => (points >= l.min ? i : acc), 0);
  const level = LEVELS[levelIndex];
  const next = LEVELS[levelIndex + 1];
  const progress = next ? ((points - level.min) / (next.min - level.min)) * 100 : 100;
  const kindIcon = { challenge: "🎯", recycling: "♻️", research: "📚" };

  return (
    <div className="container-page py-8 sm:py-12">
      {/* Profil kartasi */}
      <section className="relative overflow-hidden rounded-[2rem] bg-forest-800 p-6 text-white sm:p-10">
        <div className="absolute inset-0 leaf-pattern opacity-15" />
        <div className="blob absolute -right-20 -top-20 h-72 w-72 bg-leaf-500/30 blur-3xl" />
        <FallingLeaves count={8} />
        <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-[1.75rem] bg-leaf-400 font-display text-3xl font-semibold text-forest-950 sm:h-24 sm:w-24">
              {initials(profile?.full_name)}
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-leaf-300">
                {isOwner ? "Bosh admin" : isAdmin ? "Administrator" : isStaff ? "Tekshiruvchi" : "Eko-qahramon"}
              </p>
              <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">{profile?.full_name || "Foydalanuvchi"}</h1>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                {profile?.class_name && <span className="chip bg-white/10 text-white">🏫 {profile.class_name}-sinf</span>}
                {profile?.school_code && <span className="chip bg-white/10 text-white">🔑 {profile.school_code}</span>}
                <span className="chip bg-white/10 text-white">👤 {displayLogin(user.email, profile?.username)}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isStaff && (
              <Link href="/admin" className="btn btn-lime">⚙️ {isAdmin ? "Admin panel" : "Tekshiruv paneli"}</Link>
            )}
            <button onClick={logout} className="btn bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20">
              Chiqish
            </button>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Daraja */}
        <aside className="space-y-4">
          <div className="card p-6">
            <p className="text-sm font-bold text-muted">Eco ballaringiz</p>
            <p className="mt-1 font-display text-6xl font-semibold text-accent">{points}</p>
            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-leaf-100 p-4">
              <span className="text-4xl animate-sway">{level.icon}</span>
              <div className="flex-1">
                <p className="text-xs font-bold text-muted">Darajangiz</p>
                <p className="text-lg font-extrabold text-accent">{level.name}</p>
              </div>
            </div>
            {next ? (
              <div className="mt-4">
                <div className="flex justify-between text-xs font-bold text-muted">
                  <span>{level.name}</span>
                  <span>{next.icon} {next.name} · {next.min}</span>
                </div>
                <div className="mt-2 h-3 rounded-full bg-cream">
                  <div className="bar-grow h-full rounded-full bg-gradient-to-r from-forest-500 to-leaf-400" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted">Keyingi darajagacha {next.min - points} ball qoldi</p>
              </div>
            ) : (
              <p className="mt-4 text-sm font-bold text-accent">Siz eng yuqori darajadasiz! 🎉</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { href: "/challenges", icon: "🎯", label: "Challenge" },
              { href: "/recycling", icon: "♻️", label: "Recycling" },
              { href: "/research", icon: "📚", label: "Tadqiqot" },
            ].map((a) => (
              <Link key={a.href} href={a.href} className="card card-hover flex flex-col items-center gap-2 p-4 text-center">
                <span className="text-2xl">{a.icon}</span>
                <span className="text-xs font-extrabold">{a.label}</span>
              </Link>
            ))}
          </div>
        </aside>

        {/* Faoliyat */}
        <section className="card p-6 sm:p-7">
          <h2 className="text-2xl font-semibold">So‘nggi faoliyat</h2>
          <div className="mt-5 space-y-2">
            {activityLoading ? (
              <>
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </>
            ) : activity.length === 0 ? (
              <div className="rounded-2xl bg-cream p-8 text-center">
                <p className="text-4xl">🌱</p>
                <p className="mt-3 font-extrabold">Hali faoliyat yo‘q</p>
                <p className="mt-1 text-sm text-muted">Birinchi challenge’ni bajarib, sayohatni boshlang!</p>
                <Link href="/challenges" className="btn btn-primary mt-5">Boshlash →</Link>
              </div>
            ) : (
              activity.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-cream">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-leaf-100 text-xl">{kindIcon[a.kind]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold">{a.title}</p>
                    <p className="text-xs text-muted">{formatDate(a.date)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={a.status} />
                    {(a.status === "approved" || a.status === "published") && a.points > 0 && (
                      <span className="text-sm font-extrabold text-accent">+{a.points}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
