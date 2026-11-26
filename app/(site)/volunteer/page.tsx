"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createClient } from "@/lib/supabase";
import { formatDate, initials, useSession } from "@/lib/session";
import { compressImage } from "@/lib/image";
import { VOLUNTEER_BUCKET, VOL_FIELDS, formatHours, volBadge, type VolunteerLog, type VolunteerRow } from "@/lib/volunteer";
import { confetti } from "@/components/effects";
import { Alert, ConfirmDialog, EmptyState, LoginRequired, PageHero, Skeleton, Spinner, StatusBadge } from "@/components/ui";

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY = { title: "", description: "", hours: "", work_date: today() };

export default function VolunteerPage() {
  const { user, isVolunteer, loading: sessionLoading, refresh } = useSession();
  const [supabase] = useState(() => createClient());
  const [logs, setLogs] = useState<VolunteerLog[]>([]);
  const [board, setBoard] = useState<VolunteerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [toDelete, setToDelete] = useState<VolunteerLog | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [b, l] = await Promise.all([
      supabase.rpc("get_volunteer_board"),
      isVolunteer
        ? supabase.from("volunteer_logs").select(VOL_FIELDS).eq("student_id", user.id).order("submitted_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (b.error) {
      console.error(b.error);
      setMissing(true);
    }
    setBoard(((b.data as VolunteerRow[]) || []).map((r) => ({ ...r, hours: Number(r.hours), entries: Number(r.entries), points: Number(r.points) })));
    setLogs(((l.data as VolunteerLog[]) || []).map((x) => ({ ...x, hours: Number(x.hours), approved_hours: x.approved_hours == null ? null : Number(x.approved_hours) })));
    setLoading(false);
  }, [supabase, user, isVolunteer]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) return setLoading(false);
    load();
  }, [sessionLoading, user, load]);

  const myHours = logs.filter((l) => l.status === "approved").reduce((s, l) => s + (l.approved_hours ?? 0), 0);
  const pendingHours = logs.filter((l) => l.status === "pending").reduce((s, l) => s + l.hours, 0);
  const badge = volBadge(myHours);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const hours = Number(form.hours);
    if (form.title.trim().length < 3) return setError("Qanday ish qilganingizni qisqacha yozing.");
    if (!(hours > 0) || hours > 12) return setError("Soat 0 dan katta va 12 dan oshmasin (masalan 1.5).");
    if (form.work_date > today()) return setError("Kelajakdagi sanani tanlab bo‘lmaydi.");
    if (file && file.size > 15 * 1024 * 1024) return setError("Rasm 15 MB dan oshmasin.");
    setSending(true);
    setError("");
    let path: string | null = null;
    try {
      if (file) {
        const blob = await compressImage(file);
        path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.jpg`;
        const up = await supabase.storage.from(VOLUNTEER_BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (up.error) throw up.error;
      }
      const { error: insErr } = await supabase.from("volunteer_logs").insert({
        title: form.title.trim().slice(0, 160),
        description: form.description.trim().slice(0, 2000) || null,
        hours: Math.round(hours * 4) / 4,
        work_date: form.work_date,
        proof_url: path,
      });
      if (insErr) {
        if (path) await supabase.storage.from(VOLUNTEER_BUCKET).remove([path]);
        throw insErr;
      }
      setForm({ ...EMPTY, work_date: today() });
      setFile(null);
      setFileKey((k) => k + 1);
      confetti();
      setMessage(`Rahmat! ${formatHours(hours)} ish yuborildi — admin tekshirgach hisobga olinadi.`);
      load();
    } catch (err) {
      console.error(err);
      setError("Yuborib bo‘lmadi. Internetni tekshirib, qayta urinib ko‘ring.");
    } finally {
      setSending(false);
    }
  }

  async function remove() {
    if (!toDelete) return;
    const { error: delErr } = await supabase.from("volunteer_logs").delete().eq("id", toDelete.id);
    if (!delErr && toDelete.proof_url) await supabase.storage.from(VOLUNTEER_BUCKET).remove([toDelete.proof_url]);
    setToDelete(null);
    load();
    refresh();
  }

  return (
    <>
      <PageHero
        eyebrow="Volontyorlar"
        tone="sand"
        title={
          <>
            Vaqtini tabiatga <span className="text-gradient-anim italic">bag‘ishlaganlar</span>
          </>
        }
        text="Volontyorlar qilgan ishini va unga sarflagan vaqtini yozib boradi. Eco Team tekshiradi — tasdiqlangan har bir soat hisobga olinadi."
        emoji="🤝"
      />

      <div className="container-page pb-20">
        {!sessionLoading && !user ? (
          <LoginRequired text="Volontyorlar bo‘limini ko‘rish uchun akkauntingizga kiring." />
        ) : loading ? (
          <div className="grid gap-6 lg:grid-cols-2"><Skeleton className="h-80" /><Skeleton className="h-80" /></div>
        ) : missing ? (
          <Alert tone="error">Volontyorlar bo‘limi hali sozlanmagan. Administrator Supabase’da yangi SQL faylni ishga tushirishi kerak.</Alert>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="min-w-0 space-y-6">
              {isVolunteer ? (
                <>
                  {/* Mening hisobim */}
                  <section className="grid gap-3 sm:grid-cols-3">
                    <div className="card p-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted">Tasdiqlangan</p>
                      <p className="mt-1 font-display text-3xl font-semibold text-accent">{formatHours(myHours)}</p>
                    </div>
                    <div className="card p-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted">Tekshirilmoqda</p>
                      <p className="mt-1 font-display text-3xl font-semibold">{formatHours(pendingHours)}</p>
                    </div>
                    <div className="card p-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted">Daraja</p>
                      <p className="mt-1 text-lg font-extrabold">{badge.icon} {badge.name}</p>
                      {badge.next && <p className="text-xs text-muted">{badge.next.name}gacha {formatHours(badge.next.min - myHours)}</p>}
                    </div>
                  </section>

                  {/* Yangi yozuv */}
                  <form onSubmit={submit} className="card space-y-4 p-6 sm:p-7">
                    <h2 className="text-2xl font-semibold">✍️ Qilgan ishimni yozish</h2>
                    {message && <Alert tone="success" onClose={() => setMessage("")}>{message}</Alert>}
                    <div>
                      <label className="label" htmlFor="v-title">Nima qildingiz?</label>
                      <input id="v-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={160} placeholder="Masalan: Maktab hovlisini tozaladik" className="input" required />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="label" htmlFor="v-hours">Necha soat?</label>
                        <input id="v-hours" type="number" min="0.25" max="12" step="0.25" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} placeholder="Masalan: 2 yoki 1.5" className="input" required />
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {[0.5, 1, 2, 3, 4].map((h) => (
                            <button key={h} type="button" onClick={() => setForm({ ...form, hours: String(h) })} className={`chip ${Number(form.hours) === h ? "bg-glow text-forest-950" : "bg-ink/[0.06] text-muted"}`}>
                              {formatHours(h)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="label" htmlFor="v-date">Qachon?</label>
                        <input id="v-date" type="date" max={today()} value={form.work_date} onChange={(e) => setForm({ ...form, work_date: e.target.value })} className="input" required />
                      </div>
                    </div>
                    <div>
                      <label className="label" htmlFor="v-desc">Batafsil <span className="font-normal text-muted">(ixtiyoriy)</span></label>
                      <textarea id="v-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={2000} rows={3} placeholder="Kim bilan, qayerda, qanday natija bo‘ldi…" className="input" />
                    </div>
                    <div>
                      <label className="label" htmlFor="v-photo">Rasm <span className="font-normal text-muted">(ixtiyoriy, lekin tavsiya etiladi)</span></label>
                      <input key={fileKey} id="v-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} className="input py-2.5 text-sm" />
                    </div>
                    {error && <Alert tone="error">{error}</Alert>}
                    <button type="submit" disabled={sending} className="btn btn-primary">{sending && <Spinner />}Yuborish</button>
                  </form>

                  {/* Tarix */}
                  <section>
                    <h2 className="mb-3 text-2xl font-semibold">Mening ishlarim</h2>
                    {logs.length === 0 ? (
                      <EmptyState icon="📝" title="Hali yozuv yo‘q" text="Birinchi ishingizni yuqorida yozing." />
                    ) : (
                      <div className="space-y-2">
                        {logs.map((l) => (
                          <div key={l.id} className="card p-4">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sand-100 text-sm font-black text-sand-400">{l.hours}s</span>
                              <span className="min-w-0 flex-1">
                                <span className="block font-extrabold">{l.title}</span>
                                <span className="block text-xs text-muted">
                                  {formatDate(l.work_date)} · {formatHours(l.hours)}
                                  {l.status === "approved" && ` · tasdiqlandi: ${formatHours(l.approved_hours ?? 0)}${l.awarded_points ? ` · +${l.awarded_points} ball` : ""}`}
                                </span>
                              </span>
                              <StatusBadge status={l.status} />
                              {l.status === "pending" && (
                                <button onClick={() => setToDelete(l)} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-coral-500" aria-label="O‘chirish">🗑</button>
                              )}
                            </div>
                            {l.reviewer_feedback && <p className="mt-2 rounded-xl bg-ink/[0.04] p-3 text-sm"><b>Eco Team:</b> {l.reviewer_feedback}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              ) : (
                <section className="card p-7 sm:p-9">
                  <span className="text-5xl">🙋</span>
                  <h2 className="mt-4 text-3xl font-semibold">Volontyor bo‘lmoqchimisiz?</h2>
                  <p className="mt-3 max-w-xl text-muted">
                    Volontyorlar tozalash, daraxt ekish, tadbirlar tashkil qilish va kichiklarga o‘rgatishda yordam beradi. Qilingan ish soatlari hisoblanadi va
                    tasdiqlansa eco ballar ham beriladi.
                  </p>
                  <ol className="mt-5 space-y-2 text-sm">
                    <li>1. Eco Team’ga (adminga) volontyor bo‘lish istagingizni ayting.</li>
                    <li>2. Admin sizga “Volontyor” rolini beradi.</li>
                    <li>3. Shu sahifada ishlaringizni va soatlaringizni yozib borasiz.</li>
                  </ol>
                </section>
              )}
            </div>

            {/* Reyting */}
            <aside className="card h-fit p-6">
              <h2 className="text-xl font-semibold">🏅 Volontyorlar</h2>
              <p className="mt-1 text-xs text-muted">Tasdiqlangan soatlar bo‘yicha</p>
              <div className="mt-4 space-y-2">
                {board.length === 0 ? (
                  <p className="text-sm text-muted">Hali volontyor yo‘q.</p>
                ) : (
                  board.map((r, i) => {
                    const b = volBadge(r.hours);
                    return (
                      <div key={r.student_id} className={`flex items-center gap-3 rounded-2xl p-2.5 ${r.student_id === user?.id ? "bg-leaf-100 ring-1 ring-forest-500/40" : "bg-ink/[0.03]"}`}>
                        <span className="w-5 text-center text-sm font-black text-muted">{i + 1}</span>
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sand-200 text-xs font-black text-sand-400">{initials(r.full_name)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-extrabold">{r.full_name || "Volontyor"}</span>
                          <span className="block text-[11px] text-muted">{b.icon} {b.name} · {r.entries} ta ish</span>
                        </span>
                        <span className="whitespace-nowrap text-sm font-extrabold text-accent">{formatHours(r.hours)}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </aside>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!toDelete}
        tone="danger"
        title="Yozuvni o‘chirasizmi?"
        text={toDelete ? `“${toDelete.title}” hali tekshirilmagan — o‘chirsangiz qaytmaydi.` : ""}
        confirmLabel="Ha, o‘chirish"
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
