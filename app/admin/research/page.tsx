"use client";

import { confetti } from "@/components/effects";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatDate, initials, useSession } from "@/lib/session";
import { RESEARCH_MAX_POINTS, RESEARCH_RUBRIC, type Research } from "@/lib/research";
import { AdminTitle, useAdmin } from "@/components/admin/AdminShell";
import { Alert, CardsSkeleton, ConfirmDialog, EmptyState, Modal, Spinner, StatusBadge, Tabs } from "@/components/ui";

type Row = Research & { author?: { full_name: string | null; class_name: string | null } | null };
type Filter = "pending" | "published" | "rejected" | "all";
type Scores = Record<(typeof RESEARCH_RUBRIC)[number]["key"], number>;
type Student = { id: string; full_name: string | null; class_name: string | null };

const EMPTY_SCORES = Object.fromEntries(RESEARCH_RUBRIC.map((r) => [r.key, 0])) as Scores;
const SELECT: string =
  "id, student_id, title, summary, content, sources, status, awarded_points, reviewer_feedback, submitted_at, team_name, team_members";
const SELECT_FALLBACK: string =
  "id, student_id, title, summary, content, sources, status, awarded_points, reviewer_feedback, submitted_at";

const EMPTY_FORM = { team_name: "", team_members: "", title: "", summary: "", content: "", sources: "", student_id: "", points: 0 };

export default function AdminResearchPage() {
  const { user } = useSession();
  const { refreshCounts } = useAdmin();
  const [supabase] = useState(() => createClient());
  const [items, setItems] = useState<Row[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("pending");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  // Tekshiruv
  const [active, setActive] = useState<Row | null>(null);
  const [scores, setScores] = useState<Scores>(EMPTY_SCORES);
  const [feedback, setFeedback] = useState("");
  const [confirm, setConfirm] = useState<"published" | "rejected" | null>(null);
  const [busy, setBusy] = useState(false);

  // Qo'shish / tahrirlash
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Row | null>(null);

  const load = useCallback(async () => {
    let res = await supabase.from("eco_research").select(SELECT).order("submitted_at", { ascending: false });
    if (res.error) res = await supabase.from("eco_research").select(SELECT_FALLBACK).order("submitted_at", { ascending: false });
    if (res.error) {
      console.error(res.error);
      setMessage({ text: "Tadqiqotlarni yuklab bo‘lmadi.", error: true });
      setLoading(false);
      return;
    }
    const rows = (res.data || []) as unknown as Row[];
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, class_name").order("full_name");
    const list = (profiles || []) as Student[];
    setStudents(list);
    const map = Object.fromEntries(list.map((p) => [p.id, { full_name: p.full_name, class_name: p.class_name }]));
    setItems(rows.map((r) => ({ ...r, author: map[r.student_id] ?? null })));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  /* ───── Tekshirish ───── */
  function openReview(item: Row) {
    setActive(item);
    setScores(EMPTY_SCORES);
    setFeedback(item.reviewer_feedback ?? "");
  }
  const total = Object.values(scores).reduce((a, b) => a + b, 0);

  async function submitReview() {
    if (!active || !confirm) return;
    setBusy(true);
    const points = confirm === "published" ? Math.max(0, Math.min(RESEARCH_MAX_POINTS, total)) : 0;
    const { data, error } = await supabase
      .from("eco_research")
      .update({ status: confirm, awarded_points: points, reviewer_feedback: feedback.trim().slice(0, 1000) || null })
      .eq("id", active.id)
      .eq("status", "pending")
      .select("id");

    if (error) {
      console.error(error);
      setMessage({
        text: /check|constraint/i.test(error.message ?? "")
          ? "Baza 40 balldan ortig‘ini qabul qilmayapti — supabase/migrations dagi SQL’ni ishga tushiring."
          : "Saqlab bo‘lmadi. Qayta urinib ko‘ring.",
        error: true,
      });
    } else if (!data?.length) {
      setMessage({ text: "Bu tadqiqot allaqachon ko‘rib chiqilgan.", error: true });
    } else {
      if (confirm === "published") confetti();
      setMessage({
        text: confirm === "published" ? `✓ “${active.title}” nashr qilindi — ${points} ball berildi.` : "Tadqiqot rad etildi.",
        error: false,
      });
      setActive(null);
      await load();
      refreshCounts();
    }
    setBusy(false);
    setConfirm(null);
  }

  /* ───── Qo'shish / tahrirlash ───── */
  function openNew() {
    setForm({ ...EMPTY_FORM, student_id: user?.id ?? "" });
    setFormError("");
    setEditing("new");
  }
  function openEdit(item: Row) {
    setForm({
      team_name: item.team_name ?? "",
      team_members: item.team_members ?? "",
      title: item.title,
      summary: item.summary,
      content: item.content,
      sources: item.sources ?? "",
      student_id: item.student_id,
      points: item.awarded_points,
    });
    setFormError("");
    setEditing(item);
  }
  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: k === "points" ? Number(e.target.value) : e.target.value }));

  async function saveForm(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.team_name.trim()) return setFormError("Jamoa nomini kiriting.");
    if (form.title.trim().length < 5) return setFormError("Sarlavha kamida 5 ta belgi bo‘lsin.");
    if (form.summary.trim().length < 10) return setFormError("Qisqacha mazmunni kiriting.");
    if (!form.student_id) return setFormError("Jamoa sardorini tanlang.");

    setSaving(true);
    const payload = {
      team_name: form.team_name.trim().slice(0, 120),
      team_members: form.team_members.trim().slice(0, 500) || null,
      title: form.title.trim().slice(0, 200),
      summary: form.summary.trim().slice(0, 1000),
      content: form.content.trim().slice(0, 20000) || form.summary.trim(),
      sources: form.sources.trim().slice(0, 3000) || null,
    };
    const points = Math.max(0, Math.min(RESEARCH_MAX_POINTS, Number(form.points) || 0));

    const { error } =
      editing === "new"
        ? await supabase.from("eco_research").insert({
            ...payload,
            student_id: form.student_id,
            status: "published",
            awarded_points: points,
          })
        : await supabase
            .from("eco_research")
            .update({ ...payload, ...((editing as Row).status === "published" ? { awarded_points: points } : {}) })
            .eq("id", (editing as Row).id);
    setSaving(false);

    if (error) {
      console.error(error);
      setFormError(
        /team_|column/i.test(error.message ?? "")
          ? "Bazada jamoa ustunlari yo‘q — avval supabase/migrations dagi SQL’ni ishga tushiring."
          : "Saqlab bo‘lmadi. Ruxsatlarni (RLS) tekshiring yoki qayta urinib ko‘ring."
      );
      return;
    }
    setMessage({ text: editing === "new" ? "✓ Tadqiqot qo‘shildi va nashr qilindi." : "✓ O‘zgarishlar saqlandi.", error: false });
    setEditing(null);
    load();
  }

  async function deleteResearch() {
    if (!toDelete) return;
    setBusy(true);
    const { data, error } = await supabase.from("eco_research").delete().eq("id", toDelete.id).select("id");
    setBusy(false);
    if (error || !data?.length) {
      console.error(error);
      setMessage({ text: "O‘chirib bo‘lmadi (ruxsat yo‘q bo‘lishi mumkin).", error: true });
    } else {
      setItems((p) => p.filter((r) => r.id !== toDelete.id));
      setMessage({ text: "Tadqiqot o‘chirildi.", error: false });
      refreshCounts();
    }
    setToDelete(null);
  }

  const visible = items.filter((i) => filter === "all" || i.status === filter);
  const count = (s: Filter) => (s === "all" ? items.length : items.filter((i) => i.status === s).length);

  return (
    <>
      <AdminTitle
        title="Tadqiqotlar"
        text={`Jamoalar tadqiqotlarini ${RESEARCH_MAX_POINTS} ballgacha baholang, nashr qiling yoki o‘zingiz qo‘shing.`}
        action={<button onClick={openNew} className="btn btn-primary">+ Tadqiqot qo‘shish</button>}
      />

      <div className="mb-5">
        <Tabs
          value={filter}
          onChange={setFilter}
          items={[
            { value: "pending", label: "Kutilmoqda", count: count("pending") },
            { value: "published", label: "Nashr qilingan", count: count("published") },
            { value: "rejected", label: "Rad etilgan", count: count("rejected") },
            { value: "all", label: "Hammasi", count: count("all") },
          ]}
        />
      </div>

      {message && (
        <div className="mb-5">
          <Alert tone={message.error ? "error" : "success"} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {loading ? (
          <CardsSkeleton count={4} className="h-52" />
        ) : visible.length === 0 ? (
          <div className="lg:col-span-2">
            <EmptyState
              icon={filter === "pending" ? "🎉" : "🗂️"}
              title={filter === "pending" ? "Tekshiruv navbati bo‘sh!" : "Hech narsa topilmadi"}
              action={<button onClick={openNew} className="btn btn-primary">+ Tadqiqot qo‘shish</button>}
            />
          </div>
        ) : (
          visible.map((item) => (
            <article key={item.id} className="card flex flex-col p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sky-100 text-sm font-black text-sky-500">
                  {item.team_name ? "👥" : initials(item.author?.full_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-extrabold">{item.team_name || item.author?.full_name || "Noma’lum muallif"}</p>
                  <p className="truncate text-xs text-muted">
                    {item.team_name ? `Sardor: ${item.author?.full_name || "—"}` : item.author?.class_name || "—"} · {formatDate(item.submitted_at)}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <h3 className="mt-4 text-xl font-semibold leading-snug">{item.title}</h3>
              <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-muted">{item.summary}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                {item.status === "published" && (
                  <span className="chip mr-auto bg-leaf-100 text-accent">⭐ {item.awarded_points}/{RESEARCH_MAX_POINTS}</span>
                )}
                {item.status === "pending" ? (
                  <button onClick={() => openReview(item)} className="btn btn-primary btn-sm ml-auto">Baholash →</button>
                ) : (
                  <button onClick={() => openReview(item)} className="btn btn-ghost btn-sm ml-auto">Ochish</button>
                )}
                <button onClick={() => openEdit(item)} className="btn btn-ghost btn-sm" aria-label="Tahrirlash">✏️</button>
                <button onClick={() => setToDelete(item)} className="btn btn-danger btn-sm" aria-label="O‘chirish">🗑</button>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Baholash */}
      <Modal open={!!active} onClose={() => !busy && setActive(null)} title={active?.title ?? ""}
        subtitle={active?.team_name ? `Jamoa: ${active.team_name}` : active?.author?.full_name ?? undefined} size="lg">
        {active && (
          <div>
            {active.team_members && <p className="mb-3 text-sm text-muted">👥 {active.team_members}</p>}
            <p className="rounded-2xl bg-leaf-100 p-4 text-sm font-semibold leading-6 text-accent">{active.summary}</p>
            <div className="mt-4 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-line p-4 text-sm leading-7">
              {active.content}
            </div>
            {active.sources && (
              <div className="mt-4 rounded-2xl bg-sky-100 p-4">
                <p className="text-sm font-extrabold text-sky-500">Manbalar</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-sky-500">{active.sources}</p>
              </div>
            )}

            {active.status === "pending" ? (
              <div className="mt-6 rounded-2xl bg-ink/[0.04] p-5 ring-1 ring-line">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-extrabold">Baholash</h4>
                  <span className="font-display text-3xl font-semibold text-accent">
                    {total}<span className="text-base text-muted">/{RESEARCH_MAX_POINTS}</span>
                  </span>
                </div>
                <div className="mt-4 space-y-4">
                  {RESEARCH_RUBRIC.map((r) => (
                    <div key={r.key}>
                      <div className="flex justify-between text-sm font-bold">
                        <label htmlFor={`s-${r.key}`}>{r.label}</label>
                        <span className="text-accent">{scores[r.key]}/{r.max}</span>
                      </div>
                      <input id={`s-${r.key}`} type="range" min={0} max={r.max} value={scores[r.key]}
                        onChange={(e) => setScores((s) => ({ ...s, [r.key]: Number(e.target.value) }))}
                        className="mt-1 w-full accent-[var(--color-leaf-400)]" />
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setScores(Object.fromEntries(RESEARCH_RUBRIC.map((r) => [r.key, r.max])) as Scores)}
                  className="mt-3 text-xs font-bold text-accent hover:underline">
                  To‘liq ball ({RESEARCH_MAX_POINTS})
                </button>
                <label className="label mt-5" htmlFor="fb">Jamoaga izoh</label>
                <textarea id="fb" value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3} maxLength={1000}
                  placeholder="Yaxshi tomonlari va nimani yaxshilash mumkin…" className="input resize-none" />
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button onClick={() => setConfirm("rejected")} className="btn btn-danger">✕ Rad etish</button>
                  <button onClick={() => setConfirm("published")} className="btn btn-primary">✓ Nashr qilish</button>
                </div>
              </div>
            ) : (
              active.reviewer_feedback && (
                <div className="mt-4 rounded-2xl bg-sand-100 p-4 text-sm text-sand-400">
                  <strong>Izoh:</strong> {active.reviewer_feedback}
                </div>
              )
            )}
          </div>
        )}
      </Modal>

      {/* Qo'shish / tahrirlash */}
      <Modal open={!!editing} onClose={() => !saving && setEditing(null)} size="lg"
        title={editing === "new" ? "Yangi tadqiqot" : "Tadqiqotni tahrirlash"}
        subtitle={editing === "new" ? "Maktabda o‘tkazilgan tadqiqotni qo‘shing — u darhol nashr qilinadi." : undefined}>
        <form onSubmit={saveForm} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="f-team">Jamoa nomi</label>
              <input id="f-team" value={form.team_name} onChange={set("team_name")} maxLength={120} className="input" placeholder="Yashil Avlod" />
            </div>
            <div>
              <label className="label" htmlFor="f-lead">Jamoa sardori</label>
              <select id="f-lead" value={form.student_id} onChange={set("student_id")} disabled={editing !== "new"} className="input">
                <option value="">Tanlang…</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name || "Nomsiz"} {s.class_name ? `· ${s.class_name}` : ""}
                  </option>
                ))}
              </select>
              <p className="hint">Ballar shu o‘quvchi hisobiga yoziladi.</p>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="f-members">A’zolar</label>
            <input id="f-members" value={form.team_members} onChange={set("team_members")} maxLength={500} className="input" placeholder="Ism Familiya, Ism Familiya…" />
          </div>
          <div>
            <label className="label" htmlFor="f-title">Sarlavha</label>
            <input id="f-title" value={form.title} onChange={set("title")} maxLength={200} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="f-summary">Qisqacha mazmun</label>
            <textarea id="f-summary" value={form.summary} onChange={set("summary")} rows={3} maxLength={1000} className="input resize-none" />
          </div>
          <div>
            <label className="label" htmlFor="f-content">To‘liq matn</label>
            <textarea id="f-content" value={form.content} onChange={set("content")} rows={6} maxLength={20000} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="f-sources">Manbalar</label>
            <textarea id="f-sources" value={form.sources} onChange={set("sources")} rows={2} maxLength={3000} className="input resize-none" />
          </div>
          {(editing === "new" || (editing && editing.status === "published")) && (
            <div>
              <div className="flex justify-between">
                <label className="label" htmlFor="f-points">Ball</label>
                <span className="font-display text-xl font-semibold text-accent">{form.points}/{RESEARCH_MAX_POINTS}</span>
              </div>
              <input id="f-points" type="range" min={0} max={RESEARCH_MAX_POINTS} step={5} value={form.points} onChange={set("points")}
                className="w-full accent-[var(--color-leaf-400)]" />
            </div>
          )}
          {formError && <Alert tone="error">{formError}</Alert>}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setEditing(null)} disabled={saving} className="btn btn-ghost">Bekor qilish</button>
            <button type="submit" disabled={saving} className="btn btn-primary">{saving && <Spinner />} Saqlash</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        busy={busy}
        tone={confirm === "rejected" ? "danger" : "primary"}
        title={confirm === "published" ? `${total} ball bilan nashr qilasizmi?` : "Tadqiqotni rad etasizmi?"}
        text={confirm === "published" ? "Tadqiqot barcha o‘quvchilarga ko‘rinadi." : "Jamoa izohingizni ko‘radi."}
        confirmLabel={confirm === "published" ? "Ha, nashr qilish" : "Ha, rad etish"}
        onConfirm={submitReview}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={!!toDelete}
        busy={busy}
        tone="danger"
        title="Tadqiqotni o‘chirasizmi?"
        text={toDelete ? `“${toDelete.title}” butunlay o‘chiriladi. Berilgan ballar avtomatik qaytarilmasligi mumkin.` : undefined}
        confirmLabel="Ha, o‘chirish"
        onConfirm={deleteResearch}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
