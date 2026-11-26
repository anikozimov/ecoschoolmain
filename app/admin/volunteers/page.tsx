"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createClient } from "@/lib/supabase";
import { formatDate, initials } from "@/lib/session";
import { VOLUNTEER_BUCKET, VOL_FIELDS, formatHours, suggestPoints, volBadge, type VolunteerLog, type VolunteerRow } from "@/lib/volunteer";
import { AdminTitle, useAdmin } from "@/components/admin/AdminShell";
import { confetti } from "@/components/effects";
import { Alert, CardsSkeleton, EmptyState, Modal, Spinner, StatusBadge, Tabs } from "@/components/ui";

type Filter = "pending" | "approved" | "rejected" | "board";

export default function AdminVolunteersPage() {
  const [supabase] = useState(() => createClient());
  const { refreshCounts } = useAdmin();
  const [filter, setFilter] = useState<Filter>("pending");
  const [items, setItems] = useState<VolunteerLog[]>([]);
  const [board, setBoard] = useState<VolunteerRow[]>([]);
  const [images, setImages] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [review, setReview] = useState<{ item: VolunteerLog; status: "approved" | "rejected"; hours: string; points: string; feedback: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [l, b] = await Promise.all([
      supabase.from("volunteer_logs").select(`${VOL_FIELDS}, profiles!volunteer_logs_student_id_fkey (full_name)`).order("submitted_at", { ascending: false }),
      supabase.rpc("get_volunteer_board"),
    ]);
    if (l.error) {
      console.error(l.error);
      setMissing(true);
      setLoading(false);
      return;
    }
    const list = ((l.data as unknown as VolunteerLog[]) || []).map((x) => ({
      ...x,
      hours: Number(x.hours),
      approved_hours: x.approved_hours == null ? null : Number(x.approved_hours),
    }));
    setItems(list);
    setBoard(((b.data as VolunteerRow[]) || []).map((r) => ({ ...r, hours: Number(r.hours), entries: Number(r.entries), points: Number(r.points) })));
    setLoading(false);

    const withProof = list.filter((i) => i.proof_url);
    if (withProof.length) {
      const { data: signed } = await supabase.storage
        .from(VOLUNTEER_BUCKET)
        .createSignedUrls(withProof.map((i) => i.proof_url as string), 60 * 10);
      const urls: Record<number, string> = {};
      signed?.forEach((s: { signedUrl?: string | null }, idx: number) => {
        if (s.signedUrl) urls[withProof[idx].id] = s.signedUrl;
      });
      setImages(urls);
    }
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  function openReview(item: VolunteerLog, status: "approved" | "rejected") {
    setReview({ item, status, hours: String(item.hours), points: String(suggestPoints(item.hours)), feedback: "" });
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!review) return;
    const { item, status } = review;
    const hours = Number(review.hours);
    const points = Math.round(Number(review.points || 0));
    if (status === "approved" && (!(hours > 0) || hours > item.hours)) return setMessage({ text: `Soat 0 dan katta va ${item.hours} dan oshmasin.`, error: true });
    if (status === "approved" && (points < 0 || points > 100)) return setMessage({ text: "Ball 0–100 oralig‘ida bo‘lsin.", error: true });
    setBusy(true);
    const row =
      status === "approved"
        ? { status, approved_hours: hours, awarded_points: points, reviewer_feedback: review.feedback.trim() || null }
        : { status, reviewer_feedback: review.feedback.trim() || null };
    const { data, error } = await supabase.from("volunteer_logs").update(row).eq("id", item.id).eq("status", "pending").select("id");
    setBusy(false);
    setReview(null);
    if (error) {
      console.error(error);
      setMessage({ text: "Saqlab bo‘lmadi. Qayta urinib ko‘ring.", error: true });
    } else if (!data?.length) {
      setMessage({ text: "Bu yozuv allaqachon ko‘rib chiqilgan.", error: true });
    } else {
      setMessage({
        text:
          status === "approved"
            ? `✓ ${item.profiles?.full_name || "Volontyor"}ga ${formatHours(hours)} hisoblandi${points ? `, +${points} ball` : ""}.`
            : "Yozuv rad etildi.",
        error: false,
      });
      if (status === "approved") confetti({ count: 70 });
      refreshCounts();
      load();
    }
  }

  async function reopen(item: VolunteerLog) {
    const { error } = await supabase.from("volunteer_logs").update({ status: "pending" }).eq("id", item.id);
    setMessage(error ? { text: "O‘zgartirib bo‘lmadi.", error: true } : { text: "Yozuv qayta tekshiruvga qaytarildi (ball olib tashlandi).", error: false });
    refreshCounts();
    load();
  }

  const count = (s: Filter) => items.filter((i) => i.status === s).length;
  const visible = items.filter((i) => i.status === filter);
  const totalHours = board.reduce((s, r) => s + r.hours, 0);

  if (missing) {
    return (
      <>
        <AdminTitle icon="🤝" title="Volontyorlar" text="Ish soatlarini tekshirish" />
        <Alert tone="error">Avval Supabase’da <b>20261127_volunteers_game.sql</b> faylini ishga tushiring, so‘ng sahifani yangilang.</Alert>
      </>
    );
  }

  return (
    <>
      <AdminTitle
        icon="🤝"
        title="Volontyorlar"
        text="Volontyorlar yuborgan ish va soatlarni tekshiring. Soatni kamaytirishingiz va ball berishingiz mumkin (1 soat ≈ 10 ball, ko‘pi bilan 100). Volontyor rolini “Foydalanuvchilar” bo‘limida berasiz."
        action={
          <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/55">Jami tasdiqlangan</p>
            <p className="whitespace-nowrap font-display text-2xl font-semibold text-[#f3c969]">{formatHours(totalHours)}</p>
          </div>
        }
      />
      {message && <div className="mb-5"><Alert tone={message.error ? "error" : "success"} onClose={() => setMessage(null)}>{message.text}</Alert></div>}

      <Tabs<Filter>
        value={filter}
        onChange={setFilter}
        items={[
          { value: "pending", label: "Kutilmoqda", count: count("pending") },
          { value: "approved", label: "Tasdiqlangan", count: count("approved") },
          { value: "rejected", label: "Rad etilgan", count: count("rejected") },
          { value: "board", label: "Volontyorlar", count: board.length },
        ]}
      />

      <div className="mt-5">
        {loading ? (
          <CardsSkeleton count={4} className="h-48" />
        ) : filter === "board" ? (
          board.length === 0 ? (
            <EmptyState icon="🤝" title="Hali volontyor yo‘q" text="“Foydalanuvchilar” bo‘limida kerakli odamga “Volontyor” rolini bering." />
          ) : (
            <div className="card overflow-hidden">
              <ul className="divide-y divide-line">
                {board.map((r, i) => {
                  const b = volBadge(r.hours);
                  return (
                    <li key={r.student_id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                      <span className="w-6 text-center text-sm font-bold text-muted">{i + 1}</span>
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sand-200 text-xs font-black text-sand-400">{initials(r.full_name)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-extrabold">{r.full_name || "Volontyor"}</span>
                        <span className="block text-xs text-muted">{b.icon} {b.name} · {r.entries} ta ish · {r.points} ball</span>
                      </span>
                      <span className="whitespace-nowrap font-display text-lg font-semibold text-accent">{formatHours(r.hours)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )
        ) : visible.length === 0 ? (
          <EmptyState icon={filter === "pending" ? "🎉" : "🗂️"} title={filter === "pending" ? "Hammasi tekshirilgan!" : "Hech narsa yo‘q"} />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {visible.map((item) => (
              <article key={item.id} className="card flex flex-col p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#e2a63a] to-forest-500 text-sm font-black text-white">
                    {initials(item.profiles?.full_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold">{item.profiles?.full_name || "Volontyor"}</p>
                    <p className="text-xs text-muted">Ish kuni: {formatDate(item.work_date)} · yuborildi {formatDate(item.submitted_at, true)}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-sand-100 px-4 py-3">
                  <p className="font-extrabold">🤝 {item.title}</p>
                  <span className="shrink-0 text-sm font-black text-sand-400">⏱ {formatHours(item.hours)}</span>
                </div>
                <div className="mt-4 flex flex-1 gap-4">
                  {images[item.id] && (
                    <button onClick={() => setLightbox(images[item.id])} className="shrink-0 overflow-hidden rounded-2xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={images[item.id]} alt="Ish rasmi" className="h-28 w-28 object-cover transition hover:scale-105" />
                    </button>
                  )}
                  <p className="whitespace-pre-wrap text-sm leading-6 text-ink/80">{item.description || <span className="italic text-muted">Izoh yo‘q</span>}</p>
                </div>
                {item.status === "approved" && (
                  <p className="mt-3 text-sm font-bold text-accent">✓ {formatHours(item.approved_hours ?? 0)} hisoblandi{item.awarded_points ? ` · +${item.awarded_points} ball` : ""}</p>
                )}
                {item.reviewer_feedback && <p className="mt-2 text-sm text-muted">💬 {item.reviewer_feedback}</p>}
                {item.status === "pending" ? (
                  <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4">
                    <button onClick={() => openReview(item, "rejected")} className="btn btn-danger">✕ Rad etish</button>
                    <button onClick={() => openReview(item, "approved")} className="btn btn-primary">✓ Tasdiqlash</button>
                  </div>
                ) : (
                  <button onClick={() => reopen(item)} className="btn btn-ghost btn-sm mt-4 self-start">↩ Qayta tekshirish</button>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!review} onClose={() => !busy && setReview(null)} title={review?.status === "approved" ? "Tasdiqlash" : "Rad etish"} subtitle={review?.item.title}>
        {review && (
          <form onSubmit={save} className="space-y-4">
            {review.status === "approved" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="r-hours">Hisoblanadigan soat</label>
                  <input id="r-hours" type="number" min="0.25" max={review.item.hours} step="0.25" value={review.hours} onChange={(e) => setReview({ ...review, hours: e.target.value })} className="input" />
                  <p className="hint">Yuborilgan: {formatHours(review.item.hours)}</p>
                </div>
                <div>
                  <label className="label" htmlFor="r-points">Ball (0–100)</label>
                  <input id="r-points" type="number" min="0" max="100" value={review.points} onChange={(e) => setReview({ ...review, points: e.target.value })} className="input" />
                  <p className="hint">Taklif: {suggestPoints(Number(review.hours))}</p>
                </div>
              </div>
            )}
            <div>
              <label className="label" htmlFor="r-fb">Izoh <span className="font-normal text-muted">(volontyor ko‘radi)</span></label>
              <textarea id="r-fb" rows={3} maxLength={1000} value={review.feedback} onChange={(e) => setReview({ ...review, feedback: e.target.value })} placeholder={review.status === "approved" ? "Rahmat, zo‘r ish!" : "Sababi: rasm yo‘q / soat juda ko‘p…"} className="input" />
            </div>
            <div className="flex justify-end gap-3 border-t border-line pt-4">
              <button type="button" onClick={() => setReview(null)} className="btn btn-ghost">Bekor qilish</button>
              <button type="submit" disabled={busy} className={`btn ${review.status === "approved" ? "btn-primary" : "btn-danger"}`}>{busy && <Spinner />}{review.status === "approved" ? "Tasdiqlash" : "Rad etish"}</button>
            </div>
          </form>
        )}
      </Modal>

      {lightbox && (
        <button onClick={() => setLightbox(null)} className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-4" aria-label="Yopish">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Ish rasmi" className="max-h-full max-w-full rounded-2xl" />
        </button>
      )}
    </>
  );
}
