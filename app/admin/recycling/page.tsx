"use client";

import { confetti } from "@/components/effects";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createClient } from "@/lib/supabase";
import { formatDate, formatNumber } from "@/lib/session";
import { AdminTitle, useAdmin } from "@/components/admin/AdminShell";
import { Alert, CardsSkeleton, ConfirmDialog, EmptyState, Spinner, StatusBadge } from "@/components/ui";

type Material = "paper" | "plastic";

type Entry = {
  id: number;
  class_name: string | null;
  student_id: string | null;
  material: Material;
  amount_kg: number;
  verified_amount_kg: number | null;
  status: "pending" | "approved" | "rejected";
  awarded_points: number;
  note: string | null;
  submitted_at: string;
  profiles: { full_name: string; class_name: string | null } | null;
};

type ClassRow = { class_name: string; paper_kg: number; plastic_kg: number; total_kg: number; points: number; entries: number };

const POINTS_PER_KG = 25;
const MATERIALS: Record<Material, { icon: string; label: string; tint: string; ring: string }> = {
  paper: { icon: "📄", label: "Qog‘oz", tint: "bg-sand-100", ring: "ring-sand-500" },
  plastic: { icon: "🧴", label: "Plastik", tint: "bg-sky-100", ring: "ring-sky-500" },
};

function today() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default function AdminRecyclingPage() {
  const { refreshCounts } = useAdmin();
  const [supabase] = useState(() => createClient());

  const [classes, setClasses] = useState<string[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [summary, setSummary] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  // Forma
  const [cls, setCls] = useState("");
  const [material, setMaterial] = useState<Material>("paper");
  const [kg, setKg] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());
  const [saving, setSaving] = useState(false);

  const [classFilter, setClassFilter] = useState("all");
  const [toDelete, setToDelete] = useState<Entry | null>(null);
  const [review, setReview] = useState<{ item: Entry; status: "approved" | "rejected" } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [cRes, eRes, sRes] = await Promise.all([
      supabase.rpc("get_my_school_classes"),
      supabase
        .from("recycling_submissions")
        .select(
          `id, class_name, student_id, material, amount_kg, verified_amount_kg, status, awarded_points, note, submitted_at,
           profiles!recycling_submissions_student_id_fkey (full_name, class_name)`
        )
        .order("submitted_at", { ascending: false })
        .limit(300),
      supabase.rpc("get_class_recycling"),
    ]);

    if (cRes.error || eRes.error) {
      console.error(cRes.error || eRes.error);
      const missing = cRes.error?.code === "PGRST202" || eRes.error?.code === "42703" || eRes.error?.code === "PGRST204";
      setNeedsMigration(missing);
      if (!missing) setMessage({ text: "Ma’lumotlarni yuklab bo‘lmadi. Sahifani yangilang.", error: true });
      setLoading(false);
      return;
    }
    setNeedsMigration(false);
    setClasses(((cRes.data as { class_name: string }[]) || []).map((r) => r.class_name));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list = ((eRes.data as any[]) || []).map((r) => ({
      ...r,
      profiles: Array.isArray(r.profiles) ? r.profiles[0] || null : r.profiles,
    })) as Entry[];
    setEntries(list);
    setSummary(((sRes.data as ClassRow[]) || []).map((r) => ({ ...r, total_kg: Number(r.total_kg), paper_kg: Number(r.paper_kg), plastic_kg: Number(r.plastic_kg) })));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function addEntry(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    const amount = Math.round(Number(kg) * 100) / 100;
    if (!cls) return setMessage({ text: "Sinfni tanlang.", error: true });
    if (!Number.isFinite(amount) || amount <= 0 || amount > 500) {
      return setMessage({ text: "Vaznni to‘g‘ri kiriting (0.01–500 kg).", error: true });
    }
    if (date > today()) return setMessage({ text: "Kelajakdagi sanani tanlab bo‘lmaydi.", error: true });

    setSaving(true);
    const { error } = await supabase.from("recycling_submissions").insert({
      class_name: cls,
      material,
      amount_kg: amount,
      note: note.trim() || null,
      // Bugun tanlansa — hozirgi vaqt, aks holda o'sha kunning tushi (vaqt mintaqasi siljimasin)
      submitted_at: date === today() ? new Date().toISOString() : new Date(`${date}T12:00:00`).toISOString(),
    });
    setSaving(false);

    if (error) {
      console.error(error);
      setMessage({
        text: error.message?.includes("sinf topilmadi")
          ? `“${cls}” sinfi maktabingizda topilmadi. “Maktab va sinflar” bo‘limini tekshiring.`
          : "Saqlab bo‘lmadi. Qayta urinib ko‘ring.",
        error: true,
      });
      return;
    }
    confetti({ count: 70 });
    setMessage({ text: `✓ ${cls} sinfiga ${amount} kg ${MATERIALS[material].label.toLowerCase()} yozildi: +${Math.round(amount * POINTS_PER_KG)} ball.`, error: false });
    setKg("");
    setNote("");
    await load();
  }

  async function removeEntry() {
    if (!toDelete) return;
    setBusy(true);
    const { data, error } = await supabase.from("recycling_submissions").delete().eq("id", toDelete.id).select("id");
    setBusy(false);
    if (error || !data?.length) {
      console.error(error);
      setMessage({ text: "O‘chirib bo‘lmadi.", error: true });
    } else {
      setMessage({ text: "Yozuv o‘chirildi, ballar qayta hisoblandi.", error: false });
      await load();
      refreshCounts();
    }
    setToDelete(null);
  }

  // Eski tizimdan qolgan o'quvchi topshiruvlari
  async function reviewOld() {
    if (!review) return;
    setBusy(true);
    const { item, status } = review;
    const { data, error } = await supabase
      .from("recycling_submissions")
      .update(status === "approved" ? { status, verified_amount_kg: item.amount_kg } : { status })
      .eq("id", item.id)
      .eq("status", "pending")
      .select("id");
    setBusy(false);
    if (error || !data?.length) setMessage({ text: "Saqlab bo‘lmadi.", error: true });
    else {
      await load();
      refreshCounts();
    }
    setReview(null);
  }

  const classEntries = useMemo(() => entries.filter((e) => !e.student_id), [entries]);
  const oldPending = useMemo(() => entries.filter((e) => e.student_id && e.status === "pending"), [entries]);
  const visible = classEntries.filter((e) => classFilter === "all" || e.class_name === classFilter);
  const totalKg = summary.reduce((s, r) => s + r.total_kg, 0);
  const estimate = Math.max(0, Math.round((Number(kg) || 0) * POINTS_PER_KG));
  const maxKg = Math.max(1, ...summary.map((r) => r.total_kg));

  if (needsMigration) {
    return (
      <>
        <AdminTitle icon="♻️" title="Recycling" text="Sinflar topshirgan chiqindini kiriting." />
        <Alert tone="error">
          Yangi recycling tizimi uchun Supabase’da <b>20261124_class_recycling.sql</b> faylini ishga tushiring
          (SQL Editor → New query → Run), so‘ng sahifani yangilang.
        </Alert>
      </>
    );
  }

  return (
    <>
      <AdminTitle
        icon="♻️"
        title="Recycling"
        text="Sinflar topshirgan chiqindini Eco Team tarozida o‘lchaydi va shu yerga kiritadi. Ball sinfga yoziladi: 1 kg = 25 ball."
        action={
          <div className="flex gap-3">
            <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/55">Jami</p>
              <p className="whitespace-nowrap font-display text-2xl font-semibold text-leaf-300">{formatNumber(totalKg, 1)} kg</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/55">Yozuvlar</p>
              <p className="font-display text-2xl font-semibold text-[#f3c969]">{classEntries.length}</p>
            </div>
          </div>
        }
      />

      {message && (
        <div className="mb-5">
          <Alert tone={message.error ? "error" : "success"} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Kiritish formasi */}
        <form onSubmit={addEntry} className="card h-fit p-5 sm:p-7">
          <h2 className="text-xl font-semibold">Yangi yozuv</h2>
          <p className="mt-1 text-sm text-muted">Chiqindini tarozida o‘lchang va natijani kiriting.</p>

          <label className="label mt-6" htmlFor="r-class">Sinf</label>
          {loading ? (
            <div className="input animate-pulse text-muted">Yuklanmoqda…</div>
          ) : classes.length === 0 ? (
            <Alert tone="error">Maktabda sinf yo‘q. Avval “Maktab va sinflar” bo‘limida sinf qo‘shing.</Alert>
          ) : (
            <select id="r-class" value={cls} onChange={(e) => setCls(e.target.value)} className="input" required>
              <option value="">Sinfni tanlang</option>
              {classes.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

          <p className="label mt-5">Chiqindi turi</p>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(MATERIALS) as Material[]).map((key) => {
              const m = MATERIALS[key];
              const active = material === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMaterial(key)}
                  aria-pressed={active}
                  className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition ${
                    active ? `border-transparent ${m.tint} ring-2 ${m.ring}` : "border-line bg-surface hover:border-forest-500/40"
                  }`}
                >
                  <span className="text-2xl">{m.icon}</span>
                  <span className="font-extrabold">{m.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="r-kg">Vazn (kg)</label>
              <div className="relative">
                <input
                  id="r-kg"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  max="500"
                  step="0.01"
                  value={kg}
                  onChange={(e) => setKg(e.target.value)}
                  placeholder="Masalan: 3.5"
                  className="input pr-12 font-bold"
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">kg</span>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="r-date">Sana</label>
              <input id="r-date" type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} className="input" required />
            </div>
          </div>
          {estimate > 0 && <p className="hint font-bold text-accent">= +{estimate} ball {cls ? `${cls} sinfiga` : "sinfga"}</p>}

          <label className="label mt-5" htmlFor="r-note">Izoh <span className="font-normal text-muted">(ixtiyoriy)</span></label>
          <input id="r-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Masalan: 2-chorak aksiyasi" className="input" />

          <button type="submit" disabled={saving || loading || classes.length === 0} className="btn btn-primary mt-6 w-full py-3.5">
            {saving && <Spinner />}
            {saving ? "Saqlanmoqda…" : "Sinfga yozish"}
          </button>
        </form>

        {/* Sinflar natijasi */}
        <div className="card h-fit p-5 sm:p-7">
          <h2 className="text-xl font-semibold">Sinflar bo‘yicha</h2>
          <div className="mt-4 space-y-2.5">
            {loading ? (
              <CardsSkeleton count={4} className="h-12" />
            ) : summary.length === 0 ? (
              <EmptyState icon="⚖️" title="Hali yozuv yo‘q" text="Birinchi o‘lchovni chapdagi formada kiriting." />
            ) : (
              summary.map((r, i) => (
                <button
                  key={r.class_name}
                  type="button"
                  onClick={() => setClassFilter(classFilter === r.class_name ? "all" : r.class_name)}
                  className={`block w-full rounded-2xl border p-3 text-left transition ${
                    classFilter === r.class_name ? "border-forest-500 bg-leaf-100/40" : "border-line bg-ink/[0.02] hover:border-forest-500/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink/[0.06] text-xs font-black">{i + 1}</span>
                    <span className="font-extrabold">{r.class_name}</span>
                    <span className="ml-auto text-sm font-extrabold">{formatNumber(r.total_kg, 1)} kg</span>
                    <span className="w-20 text-right text-sm font-extrabold text-accent">+{r.points}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(r.total_kg / maxKg) * 100}%` }} />
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted">
                    📄 {formatNumber(r.paper_kg, 1)} kg · 🧴 {formatNumber(r.plastic_kg, 1)} kg · {r.entries} ta yozuv
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Yozuvlar tarixi */}
      <div className="card mt-6 p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold">Yozuvlar tarixi</h2>
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="input ml-auto w-auto py-2" aria-label="Sinf bo‘yicha">
            <option value="all">Barcha sinflar</option>
            {classes.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="mt-4 space-y-2">
          {loading ? (
            <CardsSkeleton count={3} className="h-14" />
          ) : visible.length === 0 ? (
            <EmptyState icon="🗂️" title="Yozuv topilmadi" />
          ) : (
            visible.map((e) => {
              const m = MATERIALS[e.material] ?? MATERIALS.paper;
              return (
                <div key={e.id} className="flex items-center gap-3 rounded-2xl bg-ink/[0.03] p-3 ring-1 ring-line">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg ${m.tint}`}>{m.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold">
                      {e.class_name} · {formatNumber(Number(e.verified_amount_kg ?? e.amount_kg), 2)} kg {m.label.toLowerCase()}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {formatDate(e.submitted_at)}
                      {e.note && ` · ${e.note}`}
                    </p>
                  </div>
                  <span className="text-sm font-extrabold text-accent">+{e.awarded_points}</span>
                  <button
                    onClick={() => setToDelete(e)}
                    className="grid h-9 w-9 place-items-center rounded-xl text-coral-500 transition hover:bg-coral-100"
                    aria-label="O‘chirish"
                    title="Xato kiritilgan bo‘lsa o‘chiring"
                  >
                    🗑
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {oldPending.length > 0 && (
        <div className="card mt-6 p-5 sm:p-7">
          <h2 className="text-xl font-semibold">Eski tizimdan qolgan o‘quvchi topshiruvlari</h2>
          <p className="mt-1 text-sm text-muted">O‘quvchilar endi recycling yubormaydi. Qolganlarini tasdiqlang yoki rad eting.</p>
          <div className="mt-4 space-y-2">
            {oldPending.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-ink/[0.03] p-3 ring-1 ring-line">
                <span className="text-xl">{MATERIALS[e.material]?.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold">{e.profiles?.full_name || "O‘quvchi"} · {e.amount_kg} kg</p>
                  <p className="text-xs text-muted">{e.profiles?.class_name || "—"} · {formatDate(e.submitted_at)}</p>
                </div>
                <StatusBadge status={e.status} />
                <button onClick={() => setReview({ item: e, status: "rejected" })} className="btn btn-danger btn-sm">Rad</button>
                <button onClick={() => setReview({ item: e, status: "approved" })} className="btn btn-primary btn-sm">Tasdiqlash</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        busy={busy}
        tone="danger"
        title="Yozuvni o‘chirasizmi?"
        text={toDelete ? `${toDelete.class_name} · ${toDelete.amount_kg} kg. Sinfdan ${toDelete.awarded_points} ball olib tashlanadi.` : ""}
        confirmLabel="Ha, o‘chirish"
        onConfirm={removeEntry}
        onCancel={() => setToDelete(null)}
      />
      <ConfirmDialog
        open={!!review}
        busy={busy}
        tone={review?.status === "rejected" ? "danger" : "primary"}
        title={review?.status === "approved" ? "Tasdiqlaysizmi?" : "Rad etasizmi?"}
        text={review ? `${review.item.profiles?.full_name || "O‘quvchi"} · ${review.item.amount_kg} kg` : ""}
        confirmLabel="Ha"
        onConfirm={reviewOld}
        onCancel={() => setReview(null)}
      />
    </>
  );
}
