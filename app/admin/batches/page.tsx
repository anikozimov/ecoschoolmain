"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createClient } from "@/lib/supabase";
import { ALLOWED_IMAGE_TYPES, formatDate, formatNumber } from "@/lib/session";
import { BATCH_FIELDS, BATCH_STAGES, RECEIPT_BUCKET, formatSum, safeUrl, type Batch } from "@/lib/batches";
import { DEFAULT_PRICES, PRICE_KEYS, usePrices } from "@/components/RecyclingExtras";
import { AdminTitle } from "@/components/admin/AdminShell";
import { Alert, CardsSkeleton, ConfirmDialog, EmptyState, Modal, Spinner, Tabs } from "@/components/ui";

type Tab = "batches" | "fund" | "prices";
type Project = { id: number; title: string; description: string | null; active: boolean };
type Draft = { id?: number; title: string; paper_kg: string; plastic_kg: string; stage: number; income: string; note: string; receipt_url: string | null };

const EMPTY: Draft = { title: "", paper_kg: "", plastic_kg: "", stage: 1, income: "", note: "", receipt_url: null };

export default function AdminBatchesPage() {
  const [supabase] = useState(() => createClient());
  const prices = usePrices();
  const [tab, setTab] = useState<Tab>("batches");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [votes, setVotes] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Batch | null>(null);
  const [busy, setBusy] = useState(false);
  const [newProject, setNewProject] = useState({ title: "", description: "" });
  const [resetOpen, setResetOpen] = useState(false);
  const [priceDraft, setPriceDraft] = useState({ paper: "", plastic: "" });

  const load = useCallback(async () => {
    const [b, p, v] = await Promise.all([
      supabase.from("recycling_batches").select(BATCH_FIELDS).order("created_at", { ascending: false }),
      supabase.from("fund_projects").select("id, title, description, active").order("id"),
      supabase.rpc("get_fund_summary"),
    ]);
    if (b.error) {
      console.error(b.error);
      setMissing(true);
      setLoading(false);
      return;
    }
    setMissing(false);
    setBatches(((b.data as Batch[]) || []).map((x) => ({ ...x, paper_kg: Number(x.paper_kg), plastic_kg: Number(x.plastic_kg), income: Number(x.income) })));
    setProjects((p.data as Project[]) || []);
    setVotes(Object.fromEntries(((v.data as { project_id: number; votes: number }[]) || []).map((r) => [r.project_id, Number(r.votes)])));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => setPriceDraft({ paper: String(prices.paper), plastic: String(prices.plastic) }), [prices]);

  function open(b?: Batch) {
    setFormError("");
    setFile(null);
    setEditing(
      b
        ? { id: b.id, title: b.title, paper_kg: String(b.paper_kg), plastic_kg: String(b.plastic_kg), stage: b.stage, income: b.income ? String(b.income) : "", note: b.note ?? "", receipt_url: b.receipt_url }
        : { ...EMPTY, title: `${batches.length + 1}-partiya` }
    );
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const paper = Number(editing.paper_kg || 0);
    const plastic = Number(editing.plastic_kg || 0);
    const income = Math.round(Number(editing.income || 0));
    if (editing.title.trim().length < 2) return setFormError("Partiya nomini kiriting.");
    if (paper < 0 || plastic < 0 || !Number.isFinite(paper + plastic)) return setFormError("Vaznni to‘g‘ri kiriting.");
    if (income < 0 || !Number.isFinite(income)) return setFormError("Tushumni to‘g‘ri kiriting.");
    if (file && !ALLOWED_IMAGE_TYPES[file.type]) return setFormError("Kvitansiya JPG, PNG yoki WEBP rasm bo‘lsin.");
    if (file && file.size > 5 * 1024 * 1024) return setFormError("Rasm 5 MB dan oshmasin.");
    setSaving(true);
    setFormError("");

    let receipt = editing.receipt_url;
    if (file) {
      const path = `${Date.now()}-${crypto.randomUUID()}.${ALLOWED_IMAGE_TYPES[file.type]}`;
      const up = await supabase.storage.from(RECEIPT_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) {
        setSaving(false);
        return setFormError("Kvitansiyani yuklab bo‘lmadi.");
      }
      receipt = supabase.storage.from(RECEIPT_BUCKET).getPublicUrl(path).data.publicUrl;
    }
    // Kvitansiya yuklansa — kamida 5-bosqich
    const stage = receipt && editing.stage < 5 && file ? 5 : editing.stage;
    const row = { title: editing.title.trim(), paper_kg: paper, plastic_kg: plastic, stage, income, note: editing.note.trim() || null, receipt_url: receipt };
    const { error } = editing.id
      ? await supabase.from("recycling_batches").update(row).eq("id", editing.id)
      : await supabase.from("recycling_batches").insert(row);
    setSaving(false);
    if (error) {
      console.error(error);
      return setFormError("Saqlab bo‘lmadi.");
    }
    setMessage({ text: `✓ “${row.title}” saqlandi — o‘quvchilar holatini Recycling sahifasida ko‘radi.`, error: false });
    setEditing(null);
    load();
  }

  async function quickStage(b: Batch, stage: number) {
    const { error } = await supabase.from("recycling_batches").update({ stage }).eq("id", b.id);
    if (error) setMessage({ text: "Bosqichni o‘zgartirib bo‘lmadi.", error: true });
    load();
  }

  async function removeBatch() {
    if (!toDelete) return;
    setBusy(true);
    const { error } = await supabase.from("recycling_batches").delete().eq("id", toDelete.id);
    setBusy(false);
    setMessage(error ? { text: "O‘chirib bo‘lmadi.", error: true } : { text: "Partiya o‘chirildi.", error: false });
    setToDelete(null);
    load();
  }

  async function addProject(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (newProject.title.trim().length < 2) return;
    const { error } = await supabase.from("fund_projects").insert({ title: newProject.title.trim(), description: newProject.description.trim() || null });
    if (error) setMessage({ text: "Loyihani qo‘shib bo‘lmadi.", error: true });
    else setNewProject({ title: "", description: "" });
    load();
  }

  async function toggleProject(p: Project) {
    await supabase.from("fund_projects").update({ active: !p.active }).eq("id", p.id);
    load();
  }

  async function deleteProject(p: Project) {
    await supabase.from("fund_projects").delete().eq("id", p.id);
    load();
  }

  async function resetVotes() {
    setBusy(true);
    const { error } = await supabase.rpc("admin_reset_fund_votes");
    setBusy(false);
    setResetOpen(false);
    setMessage(error ? { text: "Ovozlarni tozalab bo‘lmadi.", error: true } : { text: "Yangi ovoz berish boshlandi — barcha ovozlar tozalandi.", error: false });
    load();
  }

  async function savePrices(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const paper = Math.round(Number(priceDraft.paper));
    const plastic = Math.round(Number(priceDraft.plastic));
    if (!(paper > 0) || !(plastic > 0)) return setMessage({ text: "Narxlar musbat son bo‘lsin.", error: true });
    const { error } = await supabase.from("site_content").upsert([
      { key: PRICE_KEYS.paper, value: String(paper) },
      { key: PRICE_KEYS.plastic, value: String(plastic) },
    ]);
    setMessage(error ? { text: "Saqlab bo‘lmadi.", error: true } : { text: "✓ Narxlar saqlandi — kalkulyatorda darhol ko‘rinadi.", error: false });
  }

  const totalIncome = batches.reduce((s, b) => s + b.income, 0);
  const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);

  if (missing) {
    return (
      <>
        <AdminTitle icon="🚚" title="Partiyalar va Eco Fund" text="Recycling partiyalari va jamg‘arma" />
        <Alert tone="error">Avval Supabase’da <b>20261126_eco_platform.sql</b> faylini ishga tushiring, so‘ng sahifani yangilang.</Alert>
      </>
    );
  }

  return (
    <>
      <AdminTitle
        icon="🚚"
        title="Partiyalar va Eco Fund"
        text="Yig‘ilgan chiqindi partiyasining 6 bosqichini belgilang, kvitansiyani yuklang. Tushum Eco Fund’ga qo‘shiladi, o‘quvchilar sarflash uchun ovoz beradi."
        action={
          <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/55">Eco Fund</p>
            <p className="whitespace-nowrap font-display text-2xl font-semibold text-[#f3c969]">{formatSum(totalIncome)}</p>
          </div>
        }
      />
      {message && <div className="mb-5"><Alert tone={message.error ? "error" : "success"} onClose={() => setMessage(null)}>{message.text}</Alert></div>}

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        items={[
          { value: "batches", label: "Partiyalar", count: batches.length },
          { value: "fund", label: "Ovoz berish", count: projects.filter((p) => p.active).length },
          { value: "prices", label: "Narxlar" },
        ]}
      />

      <div className="mt-5">
        {loading ? (
          <CardsSkeleton count={3} className="h-24" />
        ) : tab === "batches" ? (
          <>
            <button onClick={() => open()} className="btn btn-primary mb-4">+ Yangi partiya</button>
            {batches.length === 0 ? (
              <EmptyState icon="🚚" title="Hali partiya yo‘q" text="Sinflardan qabul qilingan chiqindini partiya qilib qo‘shing." />
            ) : (
              <div className="space-y-3">
                {batches.map((b) => (
                  <div key={b.id} className="card p-4 sm:p-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-leaf-100 text-xl">{BATCH_STAGES[b.stage - 1]?.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-extrabold">{b.title}</span>
                        <span className="block text-xs text-muted">
                          📄 {formatNumber(b.paper_kg, 1)} kg · 🧴 {formatNumber(b.plastic_kg, 1)} kg · {formatSum(b.income)} · {formatDate(b.created_at)}
                        </span>
                      </span>
                      {safeUrl(b.receipt_url) && (
                        <a href={safeUrl(b.receipt_url)!} target="_blank" rel="noopener noreferrer" className="chip bg-ink/[0.06] text-accent">🧾 Kvitansiya</a>
                      )}
                      <button onClick={() => open(b)} className="grid h-9 w-9 place-items-center rounded-lg border border-line" aria-label="Tahrirlash">✏️</button>
                      <button onClick={() => setToDelete(b)} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-coral-500" aria-label="O‘chirish">🗑</button>
                    </div>
                    <div className="mt-3 grid grid-cols-6 gap-1.5">
                      {BATCH_STAGES.map((s) => (
                        <button
                          key={s.n}
                          type="button"
                          onClick={() => quickStage(b, s.n)}
                          title={s.title}
                          aria-label={`${s.n}-bosqich: ${s.title}`}
                          className={`rounded-lg py-2 text-xs font-extrabold transition ${b.stage >= s.n ? "bg-glow text-forest-950" : "bg-ink/[0.05] text-muted hover:bg-ink/10"}`}
                        >
                          {s.icon}<span className="hidden sm:inline"> {s.n}</span>
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted">Hozir: {BATCH_STAGES[b.stage - 1]?.title}. Bosqichni o‘zgartirish uchun tugmani bosing.</p>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : tab === "fund" ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-3">
              {projects.length === 0 ? (
                <EmptyState icon="🗳️" title="Loyiha yo‘q" text="O‘quvchilar ovoz beradigan loyihalarni qo‘shing." />
              ) : (
                projects.map((p) => {
                  const n = votes[p.id] ?? 0;
                  const pct = totalVotes ? Math.round((n / totalVotes) * 100) : 0;
                  return (
                    <div key={p.id} className={`card p-4 ${p.active ? "" : "opacity-55"}`}>
                      <div className="flex items-center gap-3">
                        <span className="min-w-0 flex-1">
                          <span className="block font-extrabold">{p.title}</span>
                          {p.description && <span className="block text-xs text-muted">{p.description}</span>}
                        </span>
                        <span className="text-sm font-extrabold">{p.active ? `${n} ovoz · ${pct}%` : "yopiq"}</span>
                        <button onClick={() => toggleProject(p)} className="btn btn-ghost btn-sm">{p.active ? "Yopish" : "Ochish"}</button>
                        <button onClick={() => deleteProject(p)} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-coral-500" aria-label="O‘chirish">🗑</button>
                      </div>
                      {p.active && (
                        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-ink/[0.06]">
                          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              {totalVotes > 0 && (
                <button onClick={() => setResetOpen(true)} className="btn btn-ghost btn-sm">🔄 Yangi ovoz berishni boshlash</button>
              )}
            </div>
            <form onSubmit={addProject} className="card h-fit space-y-3 p-5">
              <h3 className="font-extrabold">Yangi loyiha</h3>
              <input value={newProject.title} onChange={(e) => setNewProject({ ...newProject, title: e.target.value })} maxLength={120} placeholder="Masalan: Maktabda yashil bog‘" className="input" aria-label="Loyiha nomi" required />
              <input value={newProject.description} onChange={(e) => setNewProject({ ...newProject, description: e.target.value })} maxLength={400} placeholder="Qisqacha (ixtiyoriy)" className="input" aria-label="Loyiha izohi" />
              <button type="submit" className="btn btn-primary w-full">+ Qo‘shish</button>
            </form>
          </div>
        ) : (
          <form onSubmit={savePrices} className="card max-w-lg space-y-4 p-6">
            <p className="text-sm text-muted">Qayta ishlash korxonasi bilan kelishilgan narxlar. Ular Recycling kalkulyatorida ishlatiladi.</p>
            <div>
              <label className="label" htmlFor="pr-paper">Qog‘oz (so‘m/kg)</label>
              <input id="pr-paper" type="number" min="1" value={priceDraft.paper} onChange={(e) => setPriceDraft({ ...priceDraft, paper: e.target.value })} placeholder={String(DEFAULT_PRICES.paper)} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="pr-plastic">Plastik (so‘m/kg)</label>
              <input id="pr-plastic" type="number" min="1" value={priceDraft.plastic} onChange={(e) => setPriceDraft({ ...priceDraft, plastic: e.target.value })} placeholder={String(DEFAULT_PRICES.plastic)} className="input" />
            </div>
            <button type="submit" className="btn btn-primary">Saqlash</button>
          </form>
        )}
      </div>

      <Modal open={!!editing} onClose={() => !saving && setEditing(null)} title={editing?.id ? "Partiyani tahrirlash" : "Yangi partiya"} size="lg">
        {editing && (
          <form onSubmit={save} className="space-y-4">
            <div>
              <label className="label" htmlFor="b-title">Nomi</label>
              <input id="b-title" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} maxLength={120} className="input" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="b-paper">Qog‘oz (kg)</label>
                <input id="b-paper" type="number" min="0" step="0.1" value={editing.paper_kg} onChange={(e) => setEditing({ ...editing, paper_kg: e.target.value })} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="b-plastic">Plastik (kg)</label>
                <input id="b-plastic" type="number" min="0" step="0.1" value={editing.plastic_kg} onChange={(e) => setEditing({ ...editing, plastic_kg: e.target.value })} className="input" />
              </div>
            </div>
            <div>
              <p className="label">Bosqich</p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {BATCH_STAGES.map((s) => (
                  <button
                    key={s.n}
                    type="button"
                    onClick={() => setEditing({ ...editing, stage: s.n })}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold ring-1 ${editing.stage === s.n ? "bg-glow text-forest-950 ring-transparent" : "bg-surface ring-line"}`}
                  >
                    <span>{s.icon}</span> {s.n}. {s.title}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="b-income">Tushum (so‘m)</label>
                <input id="b-income" type="number" min="0" step="1000" value={editing.income} onChange={(e) => setEditing({ ...editing, income: e.target.value })} placeholder="0" className="input" />
              </div>
              <div>
                <label className="label" htmlFor="b-receipt">Kvitansiya rasmi</label>
                <input id="b-receipt" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} className="input py-2.5 text-sm" />
                {editing.receipt_url && !file && <p className="hint">Yuklangan. Yangisini tanlasangiz almashadi.</p>}
              </div>
            </div>
            <div>
              <label className="label" htmlFor="b-note">Izoh <span className="font-normal text-muted">(ixtiyoriy)</span></label>
              <input id="b-note" value={editing.note} onChange={(e) => setEditing({ ...editing, note: e.target.value })} maxLength={500} placeholder="Masalan: “Toza Hudud” korxonasiga" className="input" />
            </div>
            {formError && <Alert tone="error">{formError}</Alert>}
            <div className="flex justify-end gap-3 border-t border-line pt-4">
              <button type="button" onClick={() => setEditing(null)} className="btn btn-ghost">Bekor qilish</button>
              <button type="submit" disabled={saving} className="btn btn-primary">{saving && <Spinner />}Saqlash</button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        busy={busy}
        tone="danger"
        title="Partiyani o‘chirasizmi?"
        text={toDelete ? `“${toDelete.title}” va uning tushumi Eco Fund’dan olib tashlanadi.` : ""}
        confirmLabel="Ha, o‘chirish"
        onConfirm={removeBatch}
        onCancel={() => setToDelete(null)}
      />
      <ConfirmDialog
        open={resetOpen}
        busy={busy}
        tone="danger"
        title="Yangi ovoz berish?"
        text="Hozirgi barcha ovozlar o‘chadi. Natijani oldin yozib oling."
        confirmLabel="Ha, boshlash"
        onConfirm={resetVotes}
        onCancel={() => setResetOpen(false)}
      />
    </>
  );
}
