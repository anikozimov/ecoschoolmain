"use client";

import { compressImage } from "@/lib/image";

import { confetti, Reveal, TiltCard } from "@/components/effects";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { ALLOWED_IMAGE_TYPES, formatDate, useSession } from "@/lib/session";
import { useSiteContent } from "@/lib/content";
import {
  Alert,
  CardsSkeleton,
  EmptyState,
  LoginRequired,
  Modal,
  PageHero,
  Spinner,
  StatusBadge,
} from "@/components/ui";

type Challenge = {
  id: number;
  title: string;
  description: string;
  category: string;
  points: number;
  end_date: string | null;
};

type Submission = {
  id: number;
  challenge_id: number;
  status: "pending" | "approved" | "rejected";
};

const MAX_UPLOAD_MB = 15;

const categoryStyle = (category: string) => {
  const c = category.toLowerCase();
  if (c.includes("energ")) return { icon: "💡", tint: "bg-sky-100" };
  if (c.includes("qog") || c.includes("resurs")) return { icon: "📄", tint: "bg-sand-100" };
  if (c.includes("suv") || c.includes("water")) return { icon: "💧", tint: "bg-sky-100" };
  if (c.includes("daraxt") || c.includes("tree") || c.includes("yashil")) return { icon: "🌳", tint: "bg-leaf-100" };
  if (c.includes("chiqindi") || c.includes("plast")) return { icon: "♻️", tint: "bg-leaf-100" };
  return { icon: "🌱", tint: "bg-leaf-100" };
};

export default function ChallengesPage() {
  const { user, loading: sessionLoading, refresh } = useSession();
  const content = useSiteContent("challenges");
  const [supabase] = useState(() => createClient());
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("all");

  const [selected, setSelected] = useState<Challenge | null>(null);
  const [proofText, setProofText] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      const [challengeResult, submissionResult] = await Promise.all([
        supabase.from("challenges").select("id, title, description, category, points, end_date").order("created_at"),
        supabase.from("challenge_submissions").select("id, challenge_id, status").eq("student_id", user.id),
      ]);
      if (challengeResult.error || submissionResult.error) {
        console.error(challengeResult.error ?? submissionResult.error);
        setError("Challenge’larni yuklab bo‘lmadi. Sahifani yangilab ko‘ring.");
      }
      setChallenges((challengeResult.data as Challenge[]) || []);
      setSubmissions((submissionResult.data as Submission[]) || []);
      setLoading(false);
    })();
  }, [sessionLoading, user, supabase]);

  useEffect(() => {
    if (!proofFile) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(proofFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [proofFile]);

  const categories = useMemo(
    () => Array.from(new Set(challenges.map((c) => c.category).filter(Boolean))),
    [challenges]
  );

  const visible = filter === "all" ? challenges : challenges.filter((c) => c.category === filter);
  const doneCount = submissions.filter((s) => s.status === "approved").length;
  const pendingCount = submissions.filter((s) => s.status === "pending").length;

  function openModal(challenge: Challenge) {
    setSelected(challenge);
    setProofText("");
    setProofFile(null);
    setFormError("");
    setMessage("");
  }

  function pickFile(file: File | null) {
    setFormError("");
    if (!file) return setProofFile(null);
    if (!ALLOWED_IMAGE_TYPES[file.type]) {
      setFormError("Faqat JPG, PNG yoki WebP rasm yuklang.");
      return;
    }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setFormError(`Rasm hajmi ${MAX_UPLOAD_MB} MB dan oshmasligi kerak.`);
      return;
    }
    setProofFile(file);
  }

  async function submitChallenge() {
    if (!selected || !user) return;
    if (!proofText.trim() && !proofFile) {
      setFormError("Iltimos, izoh yozing yoki rasm qo‘shing.");
      return;
    }

    setSending(true);
    setFormError("");
    let uploadedPath: string | null = null;

    try {
      if (proofFile) {
        const compressed = await compressImage(proofFile);
        const filePath = `${user.id}/${selected.id}/${Date.now()}-${crypto.randomUUID()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("challenge-proofs")
          .upload(filePath, compressed, { contentType: "image/jpeg", upsert: false });
        if (uploadError) throw uploadError;
        uploadedPath = filePath;
      }

      // Status va ball bazada (RLS/trigger) majburiy belgilanishi kerak — SECURITY.md
      const { error: insertError } = await supabase.from("challenge_submissions").insert({
        challenge_id: selected.id,
        student_id: user.id,
        proof_text: proofText.trim().slice(0, 2000) || null,
        proof_url: uploadedPath,
        status: "pending",
        awarded_points: 0,
      });

      if (insertError) {
        if (uploadedPath) await supabase.storage.from("challenge-proofs").remove([uploadedPath]);
        throw insertError;
      }

      const { data } = await supabase
        .from("challenge_submissions")
        .select("id, challenge_id, status")
        .eq("student_id", user.id);
      setSubmissions((data as Submission[]) || []);
      setSelected(null);
      confetti();
      setMessage(`“${selected.title}” yuborildi! Eco Team tekshirgach, ballaringiz qo‘shiladi.`);
      refresh();
    } catch (err) {
      console.error("SUBMISSION ERROR:", err);
      setFormError("Yuborib bo‘lmadi. Internetni tekshirib, qayta urinib ko‘ring.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Eco challenge’lar"
        title={
          <>
            {content.title} <span className="text-gradient-anim italic">{content.accent}</span>
          </>
        }
        text={content.text}
        emoji="🎯"
      >
        {user && !loading && (
          <div className="flex flex-wrap gap-3">
            <span className="chip bg-surface px-4 py-2 text-sm text-accent ring-1 ring-line">
              ✅ {doneCount} ta bajarildi
            </span>
            <span className="chip bg-surface px-4 py-2 text-sm text-sand-400 ring-1 ring-line">
              ⏳ {pendingCount} ta tekshiruvda
            </span>
            <span className="chip bg-surface px-4 py-2 text-sm text-muted ring-1 ring-line">
              🎯 {challenges.length} ta jami
            </span>
          </div>
        )}
      </PageHero>

      <div className="container-page pb-20">
        {!sessionLoading && !user ? (
          <LoginRequired text="Challenge’larda qatnashish va ball to‘plash uchun akkauntingizga kiring." />
        ) : (
          <>
            <div className="space-y-3">
              {error && <Alert tone="error">{error}</Alert>}
              {message && (
                <Alert tone="success" onClose={() => setMessage("")}>
                  {message}
                </Alert>
              )}
            </div>

            {categories.length > 1 && (
              <div className="mb-6 mt-2 flex gap-2 overflow-x-auto pb-1">
                {["all", ...categories].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilter(cat)}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                      filter === cat
                        ? "bg-glow text-forest-950"
                        : "border border-line bg-surface text-muted hover:text-ink"
                    }`}
                  >
                    {cat === "all" ? "Hammasi" : cat}
                  </button>
                ))}
              </div>
            )}

            <section className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {loading || sessionLoading ? (
                <CardsSkeleton count={6} className="h-72" />
              ) : visible.length === 0 ? (
                <div className="md:col-span-2 xl:col-span-3">
                  <EmptyState
                    icon="🎯"
                    title="Hozircha challenge’lar yo‘q"
                    text="Tez orada yangi ekologik vazifalar qo‘shiladi. Telegram kanalimizni kuzatib boring!"
                  />
                </div>
              ) : (
                visible.map((challenge, idx) => {
                  const submission = submissions.find((s) => s.challenge_id === challenge.id);
                  const style = categoryStyle(challenge.category ?? "");
                  return (
                    <Reveal key={challenge.id} delay={(idx % 3) * 90}>
                    <TiltCard max={6} className="glow-border h-full rounded-[1.5rem]">
                    <article className="hover-bounce card flex h-full flex-col p-6 sm:p-7">
                      <div className="flex items-start justify-between gap-3">
                        <div className={`bounce-target grid h-14 w-14 place-items-center rounded-2xl text-3xl ${style.tint}`}>
                          {style.icon}
                        </div>
                        <span className="rounded-2xl bg-glow px-3 py-2 text-center leading-none text-forest-950">
                          <span className="block font-display text-xl font-semibold">+{challenge.points}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">ball</span>
                        </span>
                      </div>

                      {challenge.category && (
                        <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.15em] text-accent">
                          {challenge.category}
                        </p>
                      )}
                      <h2 className="mt-2 text-2xl font-semibold leading-tight">{challenge.title}</h2>
                      <p className="mt-3 flex-1 text-sm leading-6 text-muted">{challenge.description}</p>

                      {challenge.end_date && (
                        <p className="mt-4 text-xs font-bold text-muted">
                          ⏰ Muddat: {formatDate(challenge.end_date)}
                        </p>
                      )}

                      <div className="mt-6 border-t border-line pt-5">
                        {submission ? (
                          <div className="flex items-center justify-between">
                            <StatusBadge status={submission.status} />
                            {submission.status === "rejected" && (
                              <span className="text-xs text-muted">Eco Team bilan bog‘laning</span>
                            )}
                          </div>
                        ) : (
                          <button onClick={() => openModal(challenge)} className="btn btn-primary w-full">
                            Men bajardim ✓
                          </button>
                        )}
                      </div>
                    </article>
                    </TiltCard>
                    </Reveal>
                  );
                })
              )}
            </section>
          </>
        )}
      </div>

      <Modal
        open={!!selected}
        onClose={() => !sending && setSelected(null)}
        title="Challenge topshirish"
        subtitle={selected?.title}
      >
        <div className="space-y-5">
          <div>
            <label className="label" htmlFor="proof-text">Qanday bajardingiz?</label>
            <textarea
              id="proof-text"
              value={proofText}
              onChange={(e) => setProofText(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Masalan: Bir hafta davomida suvni o‘z idishimda olib yurdim…"
              className="input resize-none"
            />
            <p className="hint text-right">{proofText.length}/2000</p>
          </div>

          <div>
            <p className="label">Rasm dalili <span className="font-semibold text-muted">(ixtiyoriy)</span></p>
            <label
              htmlFor="proof-file"
              className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-leaf-300 bg-leaf-100/50 p-5 text-center transition hover:bg-leaf-100"
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Tanlangan rasm" className="max-h-48 rounded-xl object-contain" />
              ) : (
                <>
                  <span className="text-3xl transition-transform group-hover:scale-110">📸</span>
                  <span className="mt-2 text-sm font-bold text-accent">Rasm tanlang yoki suratga oling</span>
                  <span className="mt-1 text-xs text-muted">JPG, PNG, WebP · {MAX_UPLOAD_MB} MB gacha</span>
                </>
              )}
            </label>
            <input
              id="proof-file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => pickFile(e.target.files?.[0] || null)}
              className="sr-only"
            />
            {proofFile && (
              <button onClick={() => setProofFile(null)} className="mt-2 text-xs font-bold text-coral-500 hover:underline">
                Rasmni olib tashlash
              </button>
            )}
          </div>

          {formError && <Alert tone="error">{formError}</Alert>}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button onClick={() => setSelected(null)} disabled={sending} className="btn btn-ghost">
              Bekor qilish
            </button>
            <button onClick={submitChallenge} disabled={sending} className="btn btn-primary">
              {sending && <Spinner />}
              {sending ? "Yuborilmoqda..." : "Yuborish"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
