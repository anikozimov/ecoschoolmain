"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { initials, useSession } from "@/lib/session";
import { AdminTitle } from "@/components/admin/AdminShell";
import { ROLE_LABEL } from "@/lib/login";
import { Alert, ConfirmDialog, EmptyState, Modal, Skeleton, Spinner } from "@/components/ui";

type Student = {
  id: string;
  full_name: string | null;
  class_name: string | null;
  points: number | null;
  role: string | null;
  school_id?: string | number | null;
  username?: string | null;
  is_owner?: boolean | null;
};

const ROLES = ["student", "volunteer", "admin"] as const;
const ROLE_TEXT: Record<string, string> = {
  student: "Oddiy foydalanuvchi: topshiriq yuboradi, ball to‘playdi.",
  mentor: "Topshiriqlarni tekshiradi (eski rol).",
  volunteer: "Qilgan ishini va necha soat ishlaganini yuboradi, admin tekshiradi. O‘quvchilar reytingida qatnashmaydi.",
  admin: "Hamma narsani boshqaradi: topshiriqlar, sahifalar, maktablar, foydalanuvchilar.",
};

export default function AdminStudentsPage() {
  const { user, isOwner } = useSession();
  const [supabase] = useState(() => createClient());
  const [rows, setRows] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [query, setQuery] = useState("");
  const [cls, setCls] = useState("all");
  const [sort, setSort] = useState<"points" | "name">("points");

  const [editing, setEditing] = useState<Student | null>(null);
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [roleChange, setRoleChange] = useState<{ s: Student; next: string } | null>(null);
  const [roleFilter, setRoleFilter] = useState("all");
  const [newPassword, setNewPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ text: string; error: boolean } | null>(null);
  // Maktab sinflari ro'yxati (Maktab va sinflar bo'limi sozlangan bo'lsa)
  const [schoolClasses, setSchoolClasses] = useState<string[] | null>(null);

  const load = useCallback(async () => {
    const base = "id, full_name, class_name, points, role, school_id";
    let { data, error } = await supabase.from("profiles").select(`${base}, username, is_owner`);
    if (error) ({ data, error } = await supabase.from("profiles").select(base));
    if (error) {
      console.error(error);
      setMessage({ text: "O‘quvchilar ro‘yxatini yuklab bo‘lmadi (admin o‘qish ruxsatini tekshiring).", error: true });
    } else setRows((data as Student[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const classes = useMemo(
    () => Array.from(new Set(rows.map((r) => r.class_name).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, "uz", { numeric: true })),
    [rows]
  );

  const q = query.trim().toLowerCase();
  const visible = rows
    .filter((r) => cls === "all" || r.class_name === cls)
    .filter((r) => roleFilter === "all" || (r.role ?? "student") === roleFilter)
    .filter((r) => !q || r.full_name?.toLowerCase().includes(q) || r.username?.toLowerCase().includes(q))
    .sort((a, b) => (sort === "points" ? (b.points ?? 0) - (a.points ?? 0) : (a.full_name ?? "").localeCompare(b.full_name ?? "")));

  const totalPoints = rows.reduce((s, r) => s + (r.points ?? 0), 0);
  const admins = rows.filter((r) => r.role === "admin").length;

  async function openEdit(s: Student) {
    setEditing(s);
    setName(s.full_name ?? "");
    setClassName(s.class_name ?? "");
    setFormError("");
    setNewPassword("");
    setPwMsg(null);
    setSchoolClasses(null);
    if (s.school_id != null) {
      const { data, error } = await supabase.rpc("admin_list_classes", { p_school_id: String(s.school_id) });
      if (!error && Array.isArray(data) && data.length) {
        setSchoolClasses((data as { class_name: string }[]).map((c) => c.class_name));
      }
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (name.trim().length < 3) return setFormError("Ism-familiyani to‘liq kiriting.");
    setSaving(true);
    const { data, error } = await supabase
      .from("profiles")
      .update({ full_name: name.trim().slice(0, 80), class_name: className.trim().slice(0, 20) || null })
      .eq("id", editing.id)
      .select("id");
    setSaving(false);
    if (error || !data?.length) {
      console.error(error);
      setFormError("Saqlab bo‘lmadi. Adminga profillarni tahrirlash ruxsati berilganini tekshiring.");
      return;
    }
    setRows((p) => p.map((r) => (r.id === editing.id ? { ...r, full_name: name.trim(), class_name: className.trim() || null } : r)));
    setMessage({ text: "✓ Ma’lumotlar yangilandi.", error: false });
    setEditing(null);
  }

  // Kim kimning rolini o'zgartira oladi (baza ham xuddi shuni tekshiradi)
  function canChangeRole(t: Student) {
    if (t.is_owner || t.id === user?.id) return false;
    if (t.role === "admin" && !isOwner) return false;
    return true;
  }
  function canResetPassword(t: Student) {
    if (t.id === user?.id) return false;
    if (t.is_owner) return false;
    if (t.role === "admin" && !isOwner) return false;
    return true;
  }

  async function changeRole() {
    if (!roleChange) return;
    const { s: target, next } = roleChange;
    setSaving(true);
    const { data, error } = await supabase.from("profiles").update({ role: next }).eq("id", target.id).select("id, role");
    setSaving(false);
    if (error || !data?.length || (data[0] as { role: string }).role !== next) {
      console.error(error);
      setMessage({ text: error?.message?.includes("Bosh admin") || error?.message?.includes("faqat bosh admin") ? error.message : "Rolni o‘zgartirib bo‘lmadi.", error: true });
    } else {
      setRows((p) => p.map((r) => (r.id === target.id ? { ...r, role: next } : r)));
      setMessage({ text: `✓ ${target.full_name} endi: ${ROLE_LABEL[next]}.`, error: false });
    }
    setRoleChange(null);
  }

  async function resetPassword() {
    if (!editing) return;
    if (newPassword.length < 8) return setPwMsg({ text: "Parol kamida 8 ta belgi bo‘lsin.", error: true });
    setPwBusy(true);
    const { error } = await supabase.rpc("admin_set_password", { p_user: editing.id, p_password: newPassword });
    setPwBusy(false);
    if (error) {
      console.error(error);
      setPwMsg({
        text: error.code === "PGRST202" ? "Avval Supabase’da yangi SQL migratsiyani ishga tushiring." : error.message || "Parolni o‘zgartirib bo‘lmadi.",
        error: true,
      });
    } else {
      setPwMsg({ text: `✓ Yangi parol o‘rnatildi. Uni ${editing.full_name}ga ayting: ${newPassword}`, error: false });
      setNewPassword("");
    }
  }

  return (
    <>
      <AdminTitle
        title="Foydalanuvchilar"
        text="O‘quvchilar va adminlar. Ism, sinf, rol va parolni shu yerda boshqarasiz."
        action={
          <div className="flex gap-3">
            <div className="card px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Jami</p>
              <p className="font-display text-2xl font-semibold">{rows.length}</p>
            </div>
            <div className="card px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Ballar</p>
              <p className="font-display text-2xl font-semibold text-accent">{totalPoints.toLocaleString("uz-UZ")}</p>
            </div>
          </div>
        }
      />

      <div className="mb-5 flex flex-col gap-3 md:flex-row">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔍 Ism yoki login" className="input py-2.5 md:max-w-xs" />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input py-2.5 md:max-w-[180px]" aria-label="Rol">
          <option value="all">Barcha rollar</option>
          <option value="student">O‘quvchilar</option>
          <option value="volunteer">Volontyorlar</option>
          <option value="admin">Adminlar</option>
        </select>
        <select value={cls} onChange={(e) => setCls(e.target.value)} className="input py-2.5 md:max-w-[180px]" aria-label="Sinf">
          <option value="all">Barcha sinflar</option>
          {classes.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as "points" | "name")} className="input py-2.5 md:max-w-[200px]" aria-label="Tartib">
          <option value="points">Ball bo‘yicha</option>
          <option value="name">Ism bo‘yicha</option>
        </select>
      </div>

      {message && (
        <div className="mb-5">
          <Alert tone={message.error ? "error" : "success"} onClose={() => setMessage(null)}>{message.text}</Alert>
        </div>
      )}

      {loading ? (
        <Skeleton className="h-96" />
      ) : visible.length === 0 ? (
        <EmptyState icon="👥" title="Hech kim topilmadi" />
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-line">
            {visible.map((s, i) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <span className="hidden w-6 text-center text-sm font-bold text-muted sm:block">{i + 1}</span>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-leaf-200 text-xs font-black text-accent">
                  {initials(s.full_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-extrabold">
                    {s.full_name || "Nomsiz"}
                    {s.is_owner ? (
                      <span className="chip ml-2 bg-amber-300 align-middle text-forest-950">👑 Bosh admin</span>
                    ) : s.role === "admin" ? (
                      <span className="chip ml-2 bg-glow align-middle text-forest-950">Admin</span>
                    ) : s.role === "volunteer" ? (
                      <span className="chip ml-2 bg-[#fbf1da] align-middle text-forest-950">🤝 Volontyor</span>
                    ) : s.role === "mentor" ? (
                      <span className="chip ml-2 bg-sky-300 align-middle text-forest-950">Tekshiruvchi</span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {s.username && <span className="font-bold text-ink/70">@{s.username} · </span>}
                    {s.class_name || "Sinf ko‘rsatilmagan"}
                  </p>
                </div>
                <span className="font-display text-lg font-semibold text-accent">{(s.points ?? 0).toLocaleString("uz-UZ")}</span>
                <button onClick={() => openEdit(s)} className="btn btn-ghost btn-sm" aria-label="Tahrirlash">✏️</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-3 text-xs text-muted">
        Adminlar: {admins}. Ballar faqat tasdiqlangan topshiriqlar orqali o‘zgaradi.
        {!isOwner && " Adminlarni faqat bosh admin tayinlaydi."}
      </p>

      <Modal open={!!editing} onClose={() => !saving && setEditing(null)} title="Foydalanuvchini tahrirlash" subtitle={editing?.full_name ?? undefined}>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label" htmlFor="s-name">Ism va familiya</label>
            <input id="s-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="s-class">Sinf</label>
            {schoolClasses ? (
              <>
                <select id="s-class" value={className} onChange={(e) => setClassName(e.target.value)} className="input">
                  {!schoolClasses.includes(className) && <option value={className}>{className || "— tanlang —"}</option>}
                  {schoolClasses.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <p className="hint">Ro‘yxatda yo‘q sinfni “Maktab va sinflar” bo‘limida qo‘shing.</p>
              </>
            ) : (
              <>
                <input id="s-class" value={className} onChange={(e) => setClassName(e.target.value)} maxLength={20} className="input" placeholder="Masalan: 9-A" list="class-list" />
                <datalist id="class-list">
                  {classes.map((c) => <option key={c} value={c} />)}
                </datalist>
              </>
            )}
          </div>
          {formError && <Alert tone="error">{formError}</Alert>}

          {editing && (
            <div className="rounded-2xl border border-line bg-ink/[0.03] p-4">
              <p className="label mb-2">Rol</p>
              {editing.is_owner ? (
                <p className="text-sm text-muted">👑 Bosh admin. Uning roli faqat Supabase’dan o‘zgartiriladi.</p>
              ) : !canChangeRole(editing) ? (
                <p className="text-sm text-muted">
                  {ROLE_LABEL[editing.role ?? "student"]}.{" "}
                  {editing.id === user?.id ? "O‘z rolingizni o‘zgartira olmaysiz." : "Admin rolini faqat bosh admin o‘zgartiradi."}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {ROLES.filter((r) => r !== "admin" || isOwner).map((r) => {
                    const current = (editing.role ?? "student") === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        disabled={current}
                        onClick={() => { setRoleChange({ s: editing, next: r }); setEditing(null); }}
                        className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
                          current ? "border-forest-600 bg-glow text-forest-950" : "border-line bg-surface hover:border-forest-500/50"
                        }`}
                      >
                        {ROLE_LABEL[r]}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {editing && canResetPassword(editing) && (
            <div className="rounded-2xl border border-line bg-ink/[0.03] p-4">
              <label className="label" htmlFor="s-pw">Parolni tiklash</label>
              <div className="flex gap-2">
                <input
                  id="s-pw"
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Yangi parol (8+ belgi)"
                  autoComplete="new-password"
                  maxLength={72}
                  className="input"
                />
                <button type="button" onClick={resetPassword} disabled={pwBusy || newPassword.length < 8} className="btn btn-lime shrink-0 rounded-2xl">
                  {pwBusy ? <Spinner /> : "O‘rnatish"}
                </button>
              </div>
              <p className="hint">O‘quvchi parolini unutsa, yangisini shu yerda qo‘yib, unga ayting.</p>
              {pwMsg && <div className="mt-3"><Alert tone={pwMsg.error ? "error" : "success"}>{pwMsg.text}</Alert></div>}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-end">
            <button type="button" onClick={() => setEditing(null)} disabled={saving} className="btn btn-ghost">Bekor qilish</button>
            <button type="submit" disabled={saving} className="btn btn-primary">{saving && <Spinner />} Saqlash</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!roleChange}
        busy={saving}
        tone={roleChange?.next === "student" ? "danger" : "primary"}
        title={roleChange ? `${roleChange.s.full_name || "Foydalanuvchi"} — ${ROLE_LABEL[roleChange.next]}?` : ""}
        text={roleChange ? ROLE_TEXT[roleChange.next] : ""}
        confirmLabel="Ha, tasdiqlayman"
        onConfirm={changeRole}
        onCancel={() => setRoleChange(null)}
      />
    </>
  );
}
