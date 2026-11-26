"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { AdminTitle } from "@/components/admin/AdminShell";
import { Alert, ConfirmDialog, EmptyState, Modal, Skeleton, Spinner } from "@/components/ui";

type School = { id: string; name: string; code: string; students: number; classes: number };
type SchoolClass = { id: string; class_name: string; students: number };

const MIGRATION_FILE = "supabase/migrations/20261118_schools_classes.sql";

/** Bazadan kelgan xato: migratsiya qilinmagan bo'lsa — tushunarli matn */
function explain(error: { message?: string; code?: string } | null): string {
  const msg = error?.message ?? "";
  if (/could not find the function|does not exist|PGRST202|schema cache/i.test(msg + (error?.code ?? ""))) {
    return `Bu bo‘lim uchun Supabase’da ${MIGRATION_FILE} faylini ishga tushirish kerak.`;
  }
  // Funksiyalarimiz o'zbekcha tushunarli xato qaytaradi
  if (msg && !/^(new row|null value|duplicate key|violates)/i.test(msg)) return msg;
  return "Amalni bajarib bo‘lmadi. Qayta urinib ko‘ring.";
}

export default function AdminSchoolsPage() {
  const [supabase] = useState(() => createClient());
  const [schools, setSchools] = useState<School[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [classesLoading, setClassesLoading] = useState(false);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  // Maktab formasi
  const [schoolForm, setSchoolForm] = useState<{ id: string | null; name: string; code: string } | null>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Sinflar
  const [newClasses, setNewClasses] = useState("");
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState<SchoolClass | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [toDelete, setToDelete] = useState<{ kind: "school"; item: School } | { kind: "class"; item: SchoolClass } | null>(null);
  const [busy, setBusy] = useState(false);

  const loadSchools = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_list_schools");
    if (error) {
      console.error(error);
      const text = explain(error);
      if (text.includes(MIGRATION_FILE)) setNeedsMigration(true);
      else setMessage({ text, error: true });
    } else {
      const list = ((data as School[]) || []).map((s) => ({ ...s, students: Number(s.students), classes: Number(s.classes) }));
      setSchools(list);
      setSelected((cur) => cur ?? list[0]?.id ?? null);
    }
    setLoading(false);
  }, [supabase]);

  const loadClasses = useCallback(
    async (schoolId: string) => {
      setClassesLoading(true);
      const { data, error } = await supabase.rpc("admin_list_classes", { p_school_id: schoolId });
      if (error) {
        console.error(error);
        setMessage({ text: explain(error), error: true });
        setClasses([]);
      } else {
        setClasses(((data as SchoolClass[]) || []).map((c) => ({ ...c, students: Number(c.students) })));
      }
      setClassesLoading(false);
    },
    [supabase]
  );

  useEffect(() => {
    loadSchools();
  }, [loadSchools]);

  useEffect(() => {
    if (selected) loadClasses(selected);
  }, [selected, loadClasses]);

  const current = schools.find((s) => s.id === selected) ?? null;

  /* ───── Maktab ───── */
  async function saveSchool(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolForm) return;
    setFormError("");
    const code = schoolForm.code.trim().toUpperCase();
    if (schoolForm.name.trim().length < 3) return setFormError("Maktab nomini kiriting (kamida 3 belgi).");
    if (!/^[A-Z0-9_-]{3,32}$/.test(code)) return setFormError("Kod 3–32 belgi: lotin harflari, raqamlar, - yoki _.");
    setSaving(true);
    const { data, error } = await supabase.rpc("admin_save_school", {
      p_id: schoolForm.id,
      p_name: schoolForm.name.trim(),
      p_code: code,
    });
    setSaving(false);
    if (error) {
      console.error(error);
      return setFormError(explain(error));
    }
    setMessage({
      text: schoolForm.id ? "✓ Maktab ma’lumotlari yangilandi." : `✓ Maktab qo‘shildi. O‘quvchilar ${code} kodi bilan ro‘yxatdan o‘ta oladi.`,
      error: false,
    });
    setSchoolForm(null);
    if (!schoolForm.id && data) setSelected(String(data));
    loadSchools();
  }

  /* ───── Sinflar ───── */
  async function addClasses(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !newClasses.trim()) return;
    setAdding(true);
    const { data, error } = await supabase.rpc("admin_add_classes", { p_school_id: selected, p_names: newClasses });
    setAdding(false);
    if (error) {
      console.error(error);
      return setMessage({ text: explain(error), error: true });
    }
    const n = Number(data) || 0;
    setMessage({ text: n > 0 ? `✓ ${n} ta sinf qo‘shildi.` : "Bu sinflar allaqachon mavjud.", error: n === 0 });
    setNewClasses("");
    loadClasses(selected);
    loadSchools();
  }

  async function renameClass(e: React.FormEvent) {
    e.preventDefault();
    if (!renaming || !selected) return;
    setBusy(true);
    const { error } = await supabase.rpc("admin_rename_class", { p_id: renaming.id, p_name: renameValue });
    setBusy(false);
    if (error) {
      console.error(error);
      return setMessage({ text: explain(error), error: true });
    }
    setMessage({
      text: `✓ Sinf nomi o‘zgardi${renaming.students ? ` — ${renaming.students} ta o‘quvchining profili ham yangilandi` : ""}.`,
      error: false,
    });
    setRenaming(null);
    loadClasses(selected);
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setBusy(true);
    const { error } =
      toDelete.kind === "school"
        ? await supabase.rpc("admin_delete_school", { p_id: toDelete.item.id })
        : await supabase.rpc("admin_delete_class", { p_id: toDelete.item.id });
    setBusy(false);
    if (error) {
      console.error(error);
      setMessage({ text: explain(error), error: true });
    } else if (toDelete.kind === "school") {
      setMessage({ text: "Maktab o‘chirildi.", error: false });
      setSelected(null);
      loadSchools();
    } else {
      setMessage({ text: "Sinf o‘chirildi.", error: false });
      if (selected) loadClasses(selected);
      loadSchools();
    }
    setToDelete(null);
  }

  if (needsMigration) {
    return (
      <>
        <AdminTitle title="Maktablar va sinflar" text="Maktablarni, ularning kodlarini va sinflarini boshqaring." />
        <div className="card max-w-2xl p-7">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-sand-200 text-3xl">🛠️</div>
          <h2 className="mt-4 text-2xl font-semibold">Bir martalik sozlash kerak</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-muted">
            <li>Supabase → <b className="text-ink">SQL Editor</b> → <b className="text-ink">New query</b>.</li>
            <li>
              Loyihadagi <code className="rounded bg-ink/10 px-1.5 text-accent">{MIGRATION_FILE}</code> faylini to‘liq nusxalab qo‘ying va{" "}
              <b className="text-ink">Run</b> bosing.
            </li>
            <li>Pastda “✓ Tayyor” yozuvi chiqadi. Keyin shu sahifani yangilang.</li>
          </ol>
          <p className="mt-4 text-xs text-muted">
            Skript bazangizni o‘zi tekshiradi; tushunmagan tuzilma bo‘lsa, hech narsani o‘zgartirmasdan to‘xtaydi.
          </p>
          <button onClick={() => location.reload()} className="btn btn-primary mt-6">Sahifani yangilash</button>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminTitle
        title="Maktablar va sinflar"
        text="Maktab qo‘shing, ro‘yxatdan o‘tish kodini bering va sinflarni boshqaring."
        action={
          <button onClick={() => { setFormError(""); setSchoolForm({ id: null, name: "", code: "" }); }} className="btn btn-primary">
            + Yangi maktab
          </button>
        }
      />

      {message && (
        <div className="mb-5">
          <Alert tone={message.error ? "error" : "success"} onClose={() => setMessage(null)}>{message.text}</Alert>
        </div>
      )}

      {loading ? (
        <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      ) : schools.length === 0 ? (
        <EmptyState
          icon="🏫"
          title="Hali maktab qo‘shilmagan"
          text="Birinchi maktabni qo‘shing — o‘quvchilar uning kodi bilan ro‘yxatdan o‘tadi."
          action={<button onClick={() => setSchoolForm({ id: null, name: "", code: "" })} className="btn btn-primary">+ Maktab qo‘shish</button>}
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
          {/* Maktablar ro'yxati */}
          <div className="space-y-3">
            {schools.map((s) => {
              const active = s.id === selected;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelected(s.id)}
                  className={`card w-full p-4 text-left transition ${active ? "ring-2 ring-leaf-400" : "hover:bg-ink/[0.06]"}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl ${active ? "bg-glow" : "bg-ink/[0.06]"}`}>🏫</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-extrabold">{s.name}</span>
                      <span className="mt-0.5 inline-block rounded-md bg-ink/[0.08] px-1.5 py-0.5 font-mono text-xs font-bold text-accent">{s.code}</span>
                    </span>
                  </div>
                  <div className="mt-3 flex gap-4 text-xs font-bold text-muted">
                    <span>👥 {s.students} foydalanuvchi</span>
                    <span>🎓 {s.classes} sinf</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Tanlangan maktab */}
          {current && (
            <div className="card p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-5">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted">Maktab</p>
                  <h2 className="mt-1 text-2xl font-semibold">{current.name}</h2>
                  <p className="mt-1 text-sm text-muted">
                    Ro‘yxatdan o‘tish kodi: <b className="font-mono text-accent">{current.code}</b>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setFormError(""); setSchoolForm({ id: current.id, name: current.name, code: current.code }); }}
                    className="btn btn-ghost btn-sm"
                  >
                    ✏️ Tahrirlash
                  </button>
                  <button onClick={() => setToDelete({ kind: "school", item: current })} className="btn btn-danger btn-sm" aria-label="Maktabni o‘chirish">🗑</button>
                </div>
              </div>

              <form onSubmit={addClasses} className="mt-5">
                <label className="label" htmlFor="new-classes">Sinf qo‘shish</label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    id="new-classes"
                    value={newClasses}
                    onChange={(e) => setNewClasses(e.target.value)}
                    placeholder="Masalan: 9-A, 9-B, 10-A"
                    className="input"
                    maxLength={500}
                  />
                  <button type="submit" disabled={adding || !newClasses.trim()} className="btn btn-primary shrink-0">
                    {adding && <Spinner />} Qo‘shish
                  </button>
                </div>
                <p className="hint">Bir nechta sinfni vergul bilan ajratib yozing. Harflar avtomatik katta qilinadi.</p>
              </form>

              <div className="mt-6">
                <p className="mb-3 text-sm font-extrabold">Sinflar ({classes.length})</p>
                {classesLoading ? (
                  <Skeleton className="h-32" />
                ) : classes.length === 0 ? (
                  <p className="rounded-2xl bg-ink/[0.04] p-6 text-center text-sm text-muted">
                    Hali sinf yo‘q. Yuqoridan qo‘shing — o‘quvchilar ro‘yxatdan o‘tishda shu sinflardan tanlaydi.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                    {classes.map((c) => (
                      <div key={c.id} className="group flex items-center gap-2 rounded-2xl border border-line bg-ink/[0.04] p-3">
                        <span className="min-w-0 flex-1">
                          <span className="block font-display text-xl font-semibold">{c.class_name}</span>
                          <span className="text-xs text-muted">{c.students} o‘quvchi</span>
                        </span>
                        <button
                          onClick={() => { setRenaming(c); setRenameValue(c.class_name); }}
                          className="grid h-8 w-8 place-items-center rounded-lg text-sm text-muted hover:bg-ink/10 hover:text-accent"
                          aria-label={`${c.class_name} nomini o‘zgartirish`}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setToDelete({ kind: "class", item: c })}
                          className="grid h-8 w-8 place-items-center rounded-lg text-sm text-muted hover:bg-coral-100 hover:text-coral-500"
                          aria-label={`${c.class_name} sinfini o‘chirish`}
                        >
                          🗑
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Maktab formasi */}
      <Modal open={!!schoolForm} onClose={() => !saving && setSchoolForm(null)} title={schoolForm?.id ? "Maktabni tahrirlash" : "Yangi maktab"}>
        {schoolForm && (
          <form onSubmit={saveSchool} className="space-y-4">
            <div>
              <label className="label" htmlFor="sch-name">Maktab nomi</label>
              <input id="sch-name" value={schoolForm.name} onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                maxLength={120} placeholder="Masalan: Andijon shahar 21-maktab" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="sch-code">Ro‘yxatdan o‘tish kodi</label>
              <input id="sch-code" value={schoolForm.code} onChange={(e) => setSchoolForm({ ...schoolForm, code: e.target.value.toUpperCase() })}
                maxLength={32} placeholder="Masalan: ECO21" className="input font-mono uppercase tracking-wider" />
              <p className="hint">
                O‘quvchilar ro‘yxatdan o‘tishda shu kodni yozadi. 3–32 belgi: lotin harflari, raqamlar, - yoki _.
                {schoolForm.id && " Kodni o‘zgartirsangiz, yangi o‘quvchilar yangi kod bilan ro‘yxatdan o‘tadi."}
              </p>
            </div>
            {formError && <Alert tone="error">{formError}</Alert>}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setSchoolForm(null)} disabled={saving} className="btn btn-ghost">Bekor qilish</button>
              <button type="submit" disabled={saving} className="btn btn-primary">{saving && <Spinner />} Saqlash</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Sinf nomini o'zgartirish */}
      <Modal open={!!renaming} onClose={() => !busy && setRenaming(null)} title="Sinf nomini o‘zgartirish"
        subtitle={renaming?.students ? `Bu sinfdagi ${renaming.students} ta o‘quvchining profili ham yangilanadi.` : undefined}>
        <form onSubmit={renameClass} className="space-y-4">
          <input value={renameValue} onChange={(e) => setRenameValue(e.target.value.toUpperCase())} maxLength={20}
            className="input font-display text-xl" aria-label="Yangi nom" autoFocus />
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setRenaming(null)} disabled={busy} className="btn btn-ghost">Bekor qilish</button>
            <button type="submit" disabled={busy || !renameValue.trim()} className="btn btn-primary">{busy && <Spinner />} Saqlash</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        busy={busy}
        tone="danger"
        title={toDelete?.kind === "school" ? "Maktabni o‘chirasizmi?" : "Sinfni o‘chirasizmi?"}
        text={
          toDelete?.kind === "school"
            ? `“${toDelete.item.name}” va uning barcha sinflari o‘chiriladi. Maktabda foydalanuvchi bo‘lsa, o‘chirilmaydi.`
            : toDelete
            ? `${(toDelete.item as SchoolClass).class_name} sinfi o‘chiriladi. Sinfda o‘quvchi bo‘lsa, o‘chirilmaydi.`
            : undefined
        }
        confirmLabel="Ha, o‘chirish"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
