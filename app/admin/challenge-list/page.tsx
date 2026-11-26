"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatDate } from "@/lib/session";
import { AdminTitle } from "@/components/admin/AdminShell";
import { Alert, CardsSkeleton, ConfirmDialog, EmptyState, Modal, Spinner } from "@/components/ui";

type Challenge = {
  id: number;
  title: string;
  description: string;
  category: string;
  points: number;
  end_date: string | null;
};

const CATEGORIES = ["Chiqindilar", "Energiya", "Resurslar", "Suv", "Yashil hudud", "Transport"];
const EMPTY = { title: "", description: "", category: "Chiqindilar", points: 20, end_date: "" };

export default function AdminChallengeListPage() {
  const [supabase] = useState(() => createClient());
  const [items, setItems] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [editing, setEditing] = useState<Challenge | "new" | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Challenge | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("challenges")
      .select("id, title, description, category, points, end_date")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      setMessage({ text: "Challenge’larni yuklab bo‘lmadi.", error: true });
    } else setItems((data as Challenge[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    setForm(EMPTY);
    setFormError("");
    setEditing("new");
  }
  function openEdit(c: Challenge) {
    setForm({ title: c.title, description: c.description, category: c.category, points: c.points, end_date: c.end_date ?? "" });
    setFormError("");
    setEditing(c);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (form.title.trim().length < 3) return setFormError("Nomini kiriting (kamida 3 belgi).");
    if (form.description.trim().length < 10) return setFormError("Tavsifni kiriting (kamida 10 belgi).");
    const points = Math.round(Number(form.points));
    if (!Number.isFinite(points) || points < 1 || points > 500) return setFormError("Ball 1 dan 500 gacha bo‘lsin.");

    setSaving(true);
    const payload = {
      title: form.title.trim().slice(0, 150),
      description: form.description.trim().slice(0, 1000),
      category: form.category.trim().slice(0, 60) || "Boshqa",
      points,
      end_date: form.end_date || null,
    };
    const { error } =
      editing === "new"
        ? await supabase.from("challenges").insert(payload)
        : await supabase.from("challenges").update(payload).eq("id", (editing as Challenge).id);
    setSaving(false);
    if (error) {
      console.error(error);
      setFormError("Saqlab bo‘lmadi. Adminga challenge’larni o‘zgartirish ruxsati berilganini tekshiring (SQL migratsiya).");
      return;
    }
    setMessage({ text: editing === "new" ? "✓ Yangi challenge qo‘shildi — o‘quvchilar uni darhol ko‘radi." : "✓ Challenge yangilandi.", error: false });
    setEditing(null);
    load();
  }

  async function remove() {
    if (!toDelete) return;
    setDeleting(true);
    const { data, error } = await supabase.from("challenges").delete().eq("id", toDelete.id).select("id");
    setDeleting(false);
    if (error || !data?.length) {
      console.error(error);
      setMessage({
        text: "O‘chirib bo‘lmadi. Bu challenge’ga topshiriqlar bog‘langan bo‘lishi yoki ruxsat yo‘qligi mumkin.",
        error: true,
      });
    } else {
      setItems((p) => p.filter((c) => c.id !== toDelete.id));
      setMessage({ text: "Challenge o‘chirildi.", error: false });
    }
    setToDelete(null);
  }

  return (
    <>
      <AdminTitle
        title="Challenge ro‘yxati"
        text="O‘quvchilar ko‘radigan vazifalarni qo‘shing, tahrirlang yoki o‘chiring."
        action={<button onClick={openNew} className="btn btn-primary">+ Yangi challenge</button>}
      />

      {message && (
        <div className="mb-5">
          <Alert tone={message.error ? "error" : "success"} onClose={() => setMessage(null)}>{message.text}</Alert>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <CardsSkeleton count={6} className="h-48" />
        ) : items.length === 0 ? (
          <div className="md:col-span-2 xl:col-span-3">
            <EmptyState icon="🎯" title="Hali challenge yo‘q" action={<button onClick={openNew} className="btn btn-primary">+ Birinchisini qo‘shish</button>} />
          </div>
        ) : (
          items.map((c) => (
            <article key={c.id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="chip bg-leaf-100 text-accent">{c.category}</span>
                <span className="rounded-xl bg-glow px-2.5 py-1 font-display text-sm font-bold text-forest-950">+{c.points}</span>
              </div>
              <h3 className="mt-3 text-xl font-semibold">{c.title}</h3>
              <p className="mt-1 line-clamp-3 flex-1 text-sm leading-6 text-muted">{c.description}</p>
              {c.end_date && <p className="mt-2 text-xs font-bold text-muted">⏰ {formatDate(c.end_date)} gacha</p>}
              <div className="mt-4 flex gap-2 border-t border-line pt-4">
                <button onClick={() => openEdit(c)} className="btn btn-ghost btn-sm flex-1">✏️ Tahrirlash</button>
                <button onClick={() => setToDelete(c)} className="btn btn-danger btn-sm" aria-label="O‘chirish">🗑</button>
              </div>
            </article>
          ))
        )}
      </div>

      <Modal open={!!editing} onClose={() => !saving && setEditing(null)} title={editing === "new" ? "Yangi challenge" : "Challenge’ni tahrirlash"}>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label" htmlFor="c-title">Nomi</label>
            <input id="c-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={150}
              placeholder="Masalan: Plastiksiz bir hafta" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="c-desc">Tavsif</label>
            <textarea id="c-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3}
              maxLength={1000} className="input resize-none" placeholder="O‘quvchi aynan nima qilishi kerak?" />
          </div>
          <div>
            <p className="label">Turkum</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button type="button" key={cat} onClick={() => setForm({ ...form, category: cat })}
                  className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
                    form.category === cat ? "border-leaf-400 bg-leaf-200 text-accent" : "border-line hover:bg-ink/[0.05]"
                  }`}>
                  {cat}
                </button>
              ))}
            </div>
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} maxLength={60}
              className="input mt-2 py-2.5 text-sm" placeholder="yoki o‘z turkumingiz" aria-label="Turkum" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="c-points">Ball</label>
              <input id="c-points" type="number" min={1} max={500} value={form.points}
                onChange={(e) => setForm({ ...form, points: Number(e.target.value) })} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="c-end">Muddat <span className="font-semibold text-muted">(ixtiyoriy)</span></label>
              <input id="c-end" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="input" />
            </div>
          </div>
          {formError && <Alert tone="error">{formError}</Alert>}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setEditing(null)} disabled={saving} className="btn btn-ghost">Bekor qilish</button>
            <button type="submit" disabled={saving} className="btn btn-primary">{saving && <Spinner />} Saqlash</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        busy={deleting}
        tone="danger"
        title="Challenge’ni o‘chirasizmi?"
        text={toDelete ? `“${toDelete.title}” o‘quvchilar ro‘yxatidan yo‘qoladi.` : undefined}
        confirmLabel="Ha, o‘chirish"
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
