"use client";

import { confetti, Reveal } from "@/components/effects";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatDate, useSession } from "@/lib/session";
import { useSiteContent } from "@/lib/content";
import { RESEARCH_MAX_POINTS, RESEARCH_RUBRIC, type Research } from "@/lib/research";
import {
  Alert,
  CardsSkeleton,
  EmptyState,
  LoginRequired,
  Modal,
  PageHero,
  Spinner,
  StatusBadge,
  Tabs,
} from "@/components/ui";

const SELECT: string =
  "id, student_id, title, summary, content, sources, status, awarded_points, reviewer_feedback, submitted_at, team_name, team_members";
const SELECT_FALLBACK: string =
  "id, student_id, title, summary, content, sources, status, awarded_points, reviewer_feedback, submitted_at";

export default function ResearchPage() {
  const { user, isStaff, loading: sessionLoading } = useSession();
  const content = useSiteContent("research");
  const [supabase] = useState(() => createClient());
  const [research, setResearch] = useState<Research[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [tab, setTab] = useState<"published" | "mine">("published");
  const [reading, setReading] = useState<Research | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamMembers, setTeamMembers] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [sources, setSources] = useState("");
  const [formError, setFormError] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    let res = await supabase.from("eco_research").select(SELECT).order("submitted_at", { ascending: false });
    // Migratsiya hali ishga tushirilmagan bo'lsa (jamoa ustunlari yo'q) — eski ustunlar bilan
    if (res.error) res = await supabase.from("eco_research").select(SELECT_FALLBACK).order("submitted_at", { ascending: false });
    if (res.error) {
      console.error(res.error);
      setMessage({ text: "Tadqiqotlarni yuklab bo‘lmadi.", error: true });
    } else {
      setResearch((res.data as unknown as Research[]) || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) setLoading(false);
    else load();
  }, [sessionLoading, user, load]);

  async function submitResearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    if (!user) return;

    if (teamName.trim().length < 2) return setFormError("Jamoa nomini kiriting.");
    if (title.trim().length < 5) return setFormError("Sarlavha kamida 5 ta belgidan iborat bo‘lsin.");
    if (summary.trim().length < 20) return setFormError("Qisqacha mazmun kamida 20 ta belgidan iborat bo‘lsin.");
    if (body.trim().length < 100) return setFormError("Tadqiqot matni kamida 100 ta belgidan iborat bo‘lsin.");

    setSending(true);
    const row = {
      student_id: user.id,
      title: title.trim().slice(0, 200),
      summary: summary.trim().slice(0, 1000),
      content: body.trim().slice(0, 20000),
      sources: sources.trim().slice(0, 3000) || null,
    };
    let { error } = await supabase.from("eco_research").insert({
      ...row,
      team_name: teamName.trim().slice(0, 120),
      team_members: teamMembers.trim().slice(0, 500) || null,
    });
    if (error && /team_/.test(error.message ?? "")) {
      // Jamoa ustunlari hali yo'q — jamoani matn boshiga yozib yuboramiz
      ({ error } = await supabase.from("eco_research").insert({
        ...row,
        content: `Jamoa: ${teamName.trim()}${teamMembers.trim() ? ` (${teamMembers.trim()})` : ""}\n\n${row.content}`,
      }));
    }
    setSending(false);

    if (error) {
      console.error(error);
      setFormError("Tadqiqotni yuborib bo‘lmadi. Qayta urinib ko‘ring.");
      return;
    }

    setTeamName("");
    setTeamMembers("");
    setTitle("");
    setSummary("");
    setBody("");
    setSources("");
    setShowForm(false);
    setTab("mine");
    confetti();
    setMessage({ text: "Jamoangiz tadqiqoti tekshiruvga yuborildi! Natija shu yerda ko‘rinadi. 📚", error: false });
    await load();
  }

  const published = research.filter((r) => r.status === "published");
  const mine = research.filter((r) => r.student_id === user?.id);
  const pendingMine = mine.filter((r) => r.status === "pending").length;
  const teams = new Set(published.map((r) => r.team_name).filter(Boolean)).size;
  const visible = tab === "published" ? published : mine;

  return (
    <>
      <PageHero
        eyebrow="Eco Research"
        tone="sky"
        title={
          <>
            {content.title} <span className="text-gradient-anim italic">{content.accent}</span>
          </>
        }
        text={content.text}
        emoji="📚"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="glass-strong inline-flex items-center gap-3 rounded-2xl px-4 py-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-glow font-display text-lg font-bold text-forest-950">
              {RESEARCH_MAX_POINTS}
            </span>
            <span className="text-sm font-bold leading-5">
              ballgacha
              <span className="block text-xs font-semibold text-muted">har bir jamoa tadqiqoti uchun</span>
            </span>
          </span>
          {user && (
            <button onClick={() => setShowForm(true)} className="btn btn-primary">
              ✍️ Jamoa tadqiqotini yuborish
            </button>
          )}
          {isStaff && (
            <Link href="/admin/research" className="btn btn-lime">
              ⚙️ Tekshirish
            </Link>
          )}
        </div>
      </PageHero>

      <div className="container-page pb-20">
        {!sessionLoading && !user ? (
          <LoginRequired text="Maktab tadqiqotlarini o‘qish va yuborish uchun akkauntingizga kiring." />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div>
              {message && (
                <div className="mb-5">
                  <Alert tone={message.error ? "error" : "success"} onClose={() => setMessage(null)}>
                    {message.text}
                  </Alert>
                </div>
              )}

              <Tabs
                value={tab}
                onChange={setTab}
                items={[
                  { value: "published", label: "Maktab tadqiqotlari", count: published.length },
                  { value: "mine", label: "Bizning ishlarimiz", count: mine.length },
                ]}
              />

              <div className="mt-6 grid gap-4">
                {loading || sessionLoading ? (
                  <CardsSkeleton count={3} className="h-44" />
                ) : visible.length === 0 ? (
                  <EmptyState
                    icon="📚"
                    title={tab === "published" ? "Hali nashr qilingan tadqiqot yo‘q" : "Siz hali tadqiqot yubormagansiz"}
                    text="Jamoa tuzing, mavzu tanlang va birinchi bo‘lib tadqiqot yuboring!"
                    action={
                      <button onClick={() => setShowForm(true)} className="btn btn-primary">
                        ✍️ Tadqiqot yozish
                      </button>
                    }
                  />
                ) : (
                  visible.map((item, idx) => (
                    <Reveal key={item.id} delay={Math.min(idx, 4) * 80}>
                      <article className="card p-6 sm:p-7">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {item.team_name && <span className="chip bg-sky-100 text-sky-500">👥 {item.team_name}</span>}
                            <StatusBadge status={item.status} />
                          </div>
                          <span className="text-xs font-bold text-muted">{formatDate(item.submitted_at)}</span>
                        </div>
                        <h2 className="mt-4 text-2xl font-semibold leading-snug">{item.title}</h2>
                        {item.team_members && <p className="mt-1 text-xs font-semibold text-muted">A’zolar: {item.team_members}</p>}
                        <p className="mt-3 line-clamp-3 leading-7 text-muted">{item.summary}</p>

                        {item.reviewer_feedback && tab === "mine" && (
                          <div className="mt-4 rounded-2xl bg-sand-100 p-4 text-sm text-sand-400">
                            <strong>Tekshiruvchi izohi:</strong> {item.reviewer_feedback}
                          </div>
                        )}

                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                          <button onClick={() => setReading(item)} className="text-sm font-extrabold text-accent hover:underline">
                            To‘liq o‘qish →
                          </button>
                          {item.status === "published" && (
                            <span className="chip bg-leaf-100 text-accent">
                              ⭐ {item.awarded_points}/{RESEARCH_MAX_POINTS} ball
                            </span>
                          )}
                        </div>
                      </article>
                    </Reveal>
                  ))
                )}
              </div>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <div className="grid grid-cols-2 gap-3">
                <div className="card p-4">
                  <p className="text-xs font-bold text-muted">Nashr qilingan</p>
                  <p className="mt-1 font-display text-3xl font-semibold text-accent">{published.length}</p>
                </div>
                <div className="card p-4">
                  <p className="text-xs font-bold text-muted">Jamoalar</p>
                  <p className="mt-1 font-display text-3xl font-semibold text-sky-500">{teams}</p>
                </div>
              </div>
              {pendingMine > 0 && (
                <div className="card p-4 text-sm">
                  ⏳ <strong>{pendingMine}</strong> ta ishingiz tekshiruvda
                </div>
              )}
              <div className="card p-6">
                <h3 className="text-xl font-semibold">Qanday baholanadi?</h3>
                <ul className="mt-4 space-y-3 text-sm">
                  {RESEARCH_RUBRIC.map((r) => (
                    <li key={r.key}>
                      <div className="flex justify-between font-semibold">
                        <span className="text-muted">{r.label}</span>
                        <span>{r.max}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-ink/5">
                        <div className="h-full rounded-full bg-leaf-400" style={{ width: `${(r.max / 25) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex justify-between border-t border-line pt-4 font-extrabold text-accent">
                  <span>Jami</span>
                  <span>{RESEARCH_MAX_POINTS} ball</span>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* O‘qish oynasi */}
      <Modal open={!!reading} onClose={() => setReading(null)} title={reading?.title ?? ""} subtitle={reading?.team_name ? `Jamoa: ${reading.team_name}` : undefined} size="lg">
        {reading && (
          <div>
            {reading.team_members && <p className="mb-4 text-sm text-muted">👥 {reading.team_members}</p>}
            <p className="rounded-2xl bg-leaf-100 p-4 text-sm font-semibold leading-6 text-accent">{reading.summary}</p>
            <div className="mt-5 whitespace-pre-wrap leading-8 text-ink/85">{reading.content}</div>
            {reading.sources && (
              <div className="mt-6 rounded-2xl bg-sky-100 p-4">
                <p className="text-sm font-extrabold text-sky-500">Manbalar</p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-sky-500">{reading.sources}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Yuborish oynasi */}
      <Modal
        open={showForm}
        onClose={() => !sending && setShowForm(false)}
        title="Jamoa tadqiqoti"
        subtitle={`Eco Team tekshiradi va ${RESEARCH_MAX_POINTS} ballgacha baholaydi.`}
        size="lg"
      >
        <form onSubmit={submitResearch} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="r-team">Jamoa nomi</label>
              <input id="r-team" required value={teamName} onChange={(e) => setTeamName(e.target.value)} maxLength={120}
                placeholder="Masalan: Yashil Avlod" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="r-members">A’zolar <span className="font-semibold text-muted">(ixtiyoriy)</span></label>
              <input id="r-members" value={teamMembers} onChange={(e) => setTeamMembers(e.target.value)} maxLength={500}
                placeholder="Ism Familiya, Ism Familiya…" className="input" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="r-title">Sarlavha</label>
            <input id="r-title" required value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200}
              placeholder="Masalan: Maktabimizda plastik chiqindilar hajmi" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="r-summary">Qisqacha mazmun</label>
            <textarea id="r-summary" required value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} maxLength={1000}
              placeholder="2–3 jumlada asosiy fikr" className="input resize-none" />
          </div>
          <div>
            <label className="label" htmlFor="r-content">To‘liq matn</label>
            <textarea id="r-content" required value={body} onChange={(e) => setBody(e.target.value)} rows={9} maxLength={20000}
              placeholder="Muammo, kuzatuvlar, tahlil va xulosalar…" className="input" />
            <p className={`hint text-right ${body.trim().length < 100 ? "text-coral-500" : ""}`}>
              {body.trim().length} belgi {body.trim().length < 100 && "(kamida 100)"}
            </p>
          </div>
          <div>
            <label className="label" htmlFor="r-sources">Manbalar <span className="font-semibold text-muted">(tavsiya etiladi)</span></label>
            <textarea id="r-sources" value={sources} onChange={(e) => setSources(e.target.value)} rows={3} maxLength={3000}
              placeholder="Kitob, maqola nomlari va havolalar" className="input resize-none" />
          </div>
          {formError && <Alert tone="error">{formError}</Alert>}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setShowForm(false)} disabled={sending} className="btn btn-ghost">Bekor qilish</button>
            <button type="submit" disabled={sending} className="btn btn-primary">
              {sending && <Spinner />} Tekshiruvga yuborish
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
