"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { ACHIEVEMENTS, levelOf, loadStats, type EcoStats } from "@/lib/eco";
import { Emblem } from "@/components/Emblem";
import { formatHours } from "@/lib/volunteer";
import { LoginRequired, Skeleton } from "@/components/ui";

type Person = { id: string; full_name: string | null; class_name: string | null; points: number; role?: string | null };

const MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];

function longDate(d = new Date()) {
  return `${d.getFullYear()}-yil ${d.getDate()}-${MONTHS[d.getMonth()]}`;
}

export default function CertificatePage() {
  const { user, profile, isStaff, loading } = useSession();
  const [supabase] = useState(() => createClient());
  const [person, setPerson] = useState<Person | null>(null);
  const [stats, setStats] = useState<EcoStats | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [volHours, setVolHours] = useState<number | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    // Admin/mentor boshqa o‘quvchining sertifikatini ?id= orqali ochishi mumkin
    const id = new URLSearchParams(window.location.search).get("id");
    (async () => {
      let p: Person | null = null;
      if (id && id !== user.id && isStaff) {
        const { data } = await supabase.from("profiles").select("id, full_name, class_name, points, role").eq("id", id).maybeSingle();
        p = (data as Person) ?? null;
      } else if (profile) {
        p = { id: user.id, full_name: profile.full_name, class_name: profile.class_name, points: profile.points ?? 0, role: profile.role };
      }
      if (!p) return setNotFound(true);
      setPerson(p);
      if (p.role === "volunteer") {
        supabase.rpc("my_volunteer_hours", { p_user: p.id }).then(({ data }: { data: unknown }) => setVolHours(Number(data ?? 0)));
      }
      loadStats(supabase, p.id, p.class_name, p.points).then(setStats).catch(() => setStats(null));
    })();
  }, [loading, user, profile, isStaff, supabase]);

  if (!loading && !user) {
    return (
      <div className="container-page py-16">
        <LoginRequired text="Sertifikatni olish uchun akkauntingizga kiring." />
      </div>
    );
  }

  if (notFound) {
    return <div className="container-page py-16 text-center text-muted">O‘quvchi topilmadi.</div>;
  }

  if (!person) {
    return (
      <div className="container-page py-16">
        <Skeleton className="mx-auto aspect-[1.414] max-w-4xl" />
      </div>
    );
  }

  const { level } = levelOf(person.points);
  const earned = stats ? ACHIEVEMENTS.filter((a) => a.done(stats)) : [];

  return (
    <div className="container-page py-10 print:p-0">
      <style>{`@media print { @page { size: A4 landscape; margin: 0; } .cert { width: 297mm !important; height: 210mm !important; max-width: none !important; border-radius: 0 !important; } }`}</style>

      <div className="no-print mx-auto mb-6 flex max-w-4xl flex-wrap items-center justify-between gap-3">
        <Link href="/profile" className="btn btn-ghost btn-sm">← Profil</Link>
        <button onClick={() => window.print()} className="btn btn-primary">🖨️ Chop etish / PDF</button>
      </div>

      <div className="cert print-area relative mx-auto aspect-[1.414] w-full max-w-4xl overflow-hidden rounded-2xl bg-white text-[#173b26] shadow-2xl">
        {/* Ramka */}
        <div className="absolute inset-[2.2%] rounded-xl border-[3px] border-[#1d7438]" />
        <div className="absolute inset-[3.4%] rounded-lg border border-[#1d7438]/40" />
        {/* Burchak barglari */}
        <svg viewBox="0 0 100 100" className="absolute -left-[3%] -top-[5%] w-[22%] opacity-[0.13]" aria-hidden>
          <path d="M10 90 C10 40 40 10 90 10 C90 60 60 90 10 90 Z" fill="#1d7438" />
        </svg>
        <svg viewBox="0 0 100 100" className="absolute -bottom-[5%] -right-[3%] w-[22%] rotate-180 opacity-[0.13]" aria-hidden>
          <path d="M10 90 C10 40 40 10 90 10 C90 60 60 90 10 90 Z" fill="#1d7438" />
        </svg>

        <div className="relative flex h-full flex-col items-center justify-between px-[8%] py-[5.5%] text-center">
          <div className="flex flex-col items-center">
            <Emblem className="h-auto w-[13%] min-w-14" />
            <p className="mt-[1.5%] text-[clamp(8px,1.3vw,12px)] font-black uppercase tracking-[0.35em] text-[#1d7438]">ECO SCHOOL · Eco Future Andijan</p>
            <h1 className="mt-[1%] font-display text-[clamp(22px,5vw,46px)] font-semibold leading-none tracking-tight text-[#173b26]">SERTIFIKAT</h1>
          </div>

          <div className="flex flex-col items-center">
            <p className="text-[clamp(10px,1.6vw,15px)] text-[#4b6b57]">Ushbu sertifikat</p>
            <p className="mt-[0.6%] border-b-2 border-[#1d7438]/30 px-[6%] pb-[0.6%] font-display text-[clamp(20px,4.4vw,40px)] font-semibold italic leading-tight text-[#1d7438]">
              {person.full_name || "O‘quvchi"}
            </p>
            <p className="mt-[1.5%] max-w-[78%] text-[clamp(10px,1.6vw,15px)] leading-relaxed text-[#2f4d3a]">
              {person.role === "volunteer" ? (
                <>
                  ECO SCHOOL volontyoriga tabiatni asrash yo‘lidagi fidokorona mehnati — jami <b>{volHours === null ? "…" : formatHours(volHours)}</b> ko‘ngillilik
                  faoliyati uchun beriladi.
                </>
              ) : (
                <>
                  {person.class_name ? <b>{person.class_name}-sinf</b> : "Maktab"} o‘quvchisiga ECO SCHOOL ekologik platformasida faol ishtiroki, tabiatni asrashga
                  qo‘shgan hissasi va <b>{level.name}</b> darajasiga erishgani uchun beriladi.
                </>
              )}
            </p>
          </div>

          <div className="grid w-full max-w-[70%] grid-cols-3 gap-[2%]">
            {[
              person.role === "volunteer"
                ? { v: volHours === null ? "…" : formatHours(volHours), l: "Volontyor soati" }
                : { v: `${level.icon} ${level.name}`, l: "Daraja" },
              { v: `${person.points} XP`, l: "Eco ballar" },
              { v: stats ? `${earned.length} / ${ACHIEVEMENTS.length}` : "…", l: "Yutuqlar" },
            ].map((s) => (
              <div key={s.l} className="rounded-xl bg-[#eef7e9] px-2 py-[6%]">
                <p className="text-[clamp(10px,1.7vw,16px)] font-extrabold leading-tight text-[#173b26]">{s.v}</p>
                <p className="mt-0.5 text-[clamp(7px,1vw,10px)] font-bold uppercase tracking-wider text-[#4b6b57]">{s.l}</p>
              </div>
            ))}
          </div>

          {earned.length > 0 && (
            <p className="max-w-[80%] text-[clamp(14px,2.2vw,22px)] leading-none" title={earned.map((a) => a.title).join(", ")}>
              {earned.map((a) => a.icon).join(" ")}
            </p>
          )}

          <div className="flex w-full items-end justify-between text-[clamp(8px,1.2vw,12px)] text-[#4b6b57]">
            <div className="text-left">
              <p className="font-bold text-[#173b26]">{longDate()}</p>
              <p>Berilgan sana</p>
            </div>
            <div className="text-right">
              <p className="mb-1 w-[clamp(90px,18vw,170px)] border-b border-[#173b26]/60" />
              <p>Eco Committee raisi</p>
            </div>
          </div>
        </div>
      </div>

      <p className="no-print mx-auto mt-4 max-w-4xl text-center text-xs text-muted">
        PDF qilish uchun “Chop etish” → printer o‘rniga “PDF sifatida saqlash”ni tanlang. Yo‘nalish: Albom (landscape).
      </p>
    </div>
  );
}
