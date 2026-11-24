"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createClient } from "@/lib/supabase";
import { ALLOWED_IMAGE_TYPES, initials } from "@/lib/session";
import { MENTOR_FIELDS, MENTOR_PHOTO_BUCKET, MENTOR_PHOTO_MAX_MB, safePhoto, type Mentor } from "@/lib/mentors";
import { AdminTitle } from "@/components/admin/AdminShell";
import { Alert, CardsSkeleton, ConfirmDialog, EmptyState, Modal, Spinner } from "@/components/ui";

type Draft = { id?: number; full_name: string; subject: string; bio: string; photo_url: string | null; sort_order: number };

const EMPTY: Draft = { full_name: "", subject: "", bio: "", photo_url: null, sort_order: 0 };

/** Ochiq havoladan bucket ichidagi yo'lni ajratib oladi (o'chirish uchun) */
function storagePath(url: string | null) {
  if (!url) return null;
  const marker = `/object/public/${MENTOR_PHOTO_BUCKET}/`;
  const i = url.indexOf(marker);
  return i >= 0 ? decodeURIComponent(url.slice(i + marker.length).split("?")[0]) : null;
}

export default function AdminMentorsPage() {
  const [supabase] = useState(() => createClient());
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const [editing, setEditing] = useState<Draft | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Mentor | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("mentors")
      .select(MENTOR_FIELDS)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });
    if (error) {
      console.error(error);
      const missing = error.code === "42P01" || error.code === "PGRST205" || /mentors/.test(error.message || "");
      setNeedsMigration(missing);
      if (!missing) setMessage({ text: "Ro‘yxatni yuklab bo‘lmadi.", error: true });
    } else {
      setNeedsMigration(false);
      setMentors((data as Mentor[]) || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function open(m?: Mentor) {
    setFormError("");
    setFile(null);
    setEditing(
      m
        ? { id: m.id, full_name: m.full_name, subject: m.subject ?? "", bio: m.bio ?? "", photo_url: m.photo_url, sort_order: m.sort_order }
        : { ...EMPTY, sort_order: mentors.length ? Math.max(...mentors.map((x) => x.sort_order)) + 1 : 0 }
    );
  }

  function pickFile(f: File | null) {
    setFormError("");
    if (!f) return setFile(null);
    if (!ALLOWED_IMAGE_TYPES[f.type]) return setFormError("Faqat JPG, PNG yoki WEBP rasm yuklang.");
    if (f.size > MENTOR_PHOTO_MAX_MB * 1024 * 1024) return setFormError(`Rasm ${MENTOR_PHOTO_MAX_MB} MB dan oshmasin.`);
    setFile(f);
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const name = editing.full_name.trim();
    if (name.length < 2) return setFormError("Ism-familiyani kiriting.");
    setSaving(true);
    setFormError("");

    let photo = editing.photo_url;
    let uploaded: string | null = null;
    if (file) {
      const ext = ALLOWED_IMAGE_TYPES[file.type];
      uploaded = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(MENTOR_PHOTO_BUCKET)
        .upload(uploaded, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
      if (upErr) {
        console.error(upErr);
        setSaving(false);
        return setFormError("Rasmni yuklab bo‘lmadi. Supabase’da mentorlar SQL fayli ishga tushirilganini tekshiring.");
      }
      photo = supabase.storage.from(MENTOR_PHOTO_BUCKET).getPublicUrl(uploaded).data.publicUrl;
    }

    const row = {
      full_name: name,
      subject: editing.subject.trim() || null,
      bio: editing.bio.trim() || null,
      photo_url: photo,
      sort_order: Number.isFinite(editing.sort_order) ? Math.round(editing.sort_order) : 0,
    };
    const { error } = editing.id
      ? await supabase.from("mentors").update(row).eq("id", editing.id)
      : await supabase.from("mentors").insert(row);
    setSaving(false);

    if (error) {
      console.error(error);
      if (uploaded) await supabase.storage.from(MENTOR_PHOTO_BUCKET).remove([uploaded]);
      return setFormError("Saqlab bo‘lmadi. Qayta urinib ko‘ring.");
    }
    // Rasm almashtirilgan bo'lsa — eskisini o'chiramiz
    if (uploaded && editing.photo_url) {
      const old = storagePath(editing.photo_url);
      if (old) await supabase.storage.from(MENTOR_PHOTO_BUCKET).remove([old]);
    }
    setMessage({ text: editing.id ? `✓ ${name} ma’lumotlari yangilandi.` : `✓ ${name} mentorlar ro‘yxatiga qo‘shildi.`, error: false });
    setEditing(null);
    await load();
  }

  async function remove() {
    if (!toDelete) return;
    setBusy(true);
    const { data, error } = await supabase.from("mentors").delete().eq("id", toDelete.id).select("id");
    if (error || !data?.length) {
      console.error(error);
      setMessage({ text: "O‘chirib bo‘lmadi.", error: true });
    } else {
      const path = storagePath(toDelete.photo_url);
      if (path) await supabase.storage.from(MENTOR_PHOTO_BUCKET).remove([path]);
      setMessage({ text: `${toDelete.full_name} ro‘yxatdan olib tashlandi.`, error: false });
      await load();
    }
    setBusy(false);
    setToDelete(null);
  }

  async function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= mentors.length) return;
    const next = [...mentors];
    [next[index], next[j]] = [next[j], next[index]];
    const ordered = next.map((m, i) => ({ ...m, sort_order: i }));
    setMentors(ordered);
    const changed = ordered.filter((m, i) => m.sort_order !== mentors[i]?.sort_order || m.id !== mentors[i]?.id);
    const results = await Promise.all(changed.map((m) => supabase.from("mentors").update({ sort_order: m.sort_order }).eq("id", m.id)));
    if (results.some((r) => r.error)) {
      setMessage({ text: "Tartibni saqlab bo‘lmadi.", error: true });
      await load();
    }
  }

  const shownPhoto = preview || safePhoto(editing?.photo_url);

  if (needsMigration) {
    return (
      <>
        <AdminTitle icon="🎓" title="Mentorlar" text="Loyihaga yordam bergan domlalar." />
        <Alert tone="error">
          Avval Supabase’da <b>20261124_mentors.sql</b> faylini ishga tushiring (SQL Editor → New query → Run), so‘ng sahifani yangilang.
        </Alert>
      </>
    );
  }

  return (
    <>
      <AdminTitle
        icon="🎓"
        title="Mentorlar"
        text="Loyihaga yordam bergan domlalar. Ular saytdagi “Mentorlar” sahifasida ko‘rinadi."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/mentors" className="btn bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20">Saytda ko‘rish</Link>
            <button onClick={() => open()} className="btn btn-lime">+ Mentor qo‘shish</button>
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

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2"><CardsSkeleton count={4} className="h-28" /></div>
      ) : mentors.length === 0 ? (
        <EmptyState
          icon="🎓"
          title="Hali mentor qo‘shilmagan"
          text="Loyihaga yordam bergan birinchi domlani qo‘shing."
          action={<button onClick={() => open()} className="btn btn-primary">+ Mentor qo‘shish</button>}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {mentors.map((m, i) => {
            const photo = safePhoto(m.photo_url);
            return (
              <li key={m.id} className="card flex items-center gap-4 p-4">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover" />
                ) : (
                  <span className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-leaf-300 to-forest-500 text-xl font-black text-white">
                    {initials(m.full_name)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-extrabold">{m.full_name}</p>
                  {m.subject && <p className="truncate text-sm text-accent">{m.subject}</p>}
                  {m.bio && <p className="mt-1 line-clamp-2 text-xs text-muted">{m.bio}</p>}
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <div className="flex gap-1">
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-sm disabled:opacity-30" aria-label="Yuqoriga">↑</button>
                    <button onClick={() => move(i, 1)} disabled={i === mentors.length - 1} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-sm disabled:opacity-30" aria-label="Pastga">↓</button>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => open(m)} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-sm hover:border-forest-500/50" aria-label="Tahrirlash">✏️</button>
                    <button onClick={() => setToDelete(m)} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-sm text-coral-500 hover:bg-coral-100" aria-label="O‘chirish">🗑</button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={!!editing} onClose={() => !saving && setEditing(null)} title={editing?.id ? "Mentorni tahrirlash" : "Yangi mentor"} size="lg">
        {editing && (
          <form onSubmit={save} className="space-y-5">
            <div className="flex flex-col gap-5 sm:flex-row">
              <div className="shrink-0">
                <p className="label">Rasm</p>
                <label
                  htmlFor="m-photo"
                  className="group grid h-36 w-36 cursor-pointer place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-leaf-300 bg-leaf-100/30 text-center transition hover:bg-leaf-100/60"
                >
                  {shownPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={shownPhoto} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="px-3 text-xs font-bold text-accent">📷<br />Rasm tanlang</span>
                  )}
                </label>
                <input id="m-photo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pickFile(e.target.files?.[0] || null)} />
                {(file || editing.photo_url) && (
                  <button
                    type="button"
                    onClick={() => { setFile(null); setEditing({ ...editing, photo_url: null }); }}
                    className="mt-2 text-xs font-bold text-coral-500 hover:underline"
                  >
                    Rasmni olib tashlash
                  </button>
                )}
                <p className="hint">{MENTOR_PHOTO_MAX_MB} MB gacha</p>
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <label className="label" htmlFor="m-name">Ism-familiya</label>
                  <input id="m-name" value={editing.full_name} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} maxLength={80} placeholder="Masalan: Gulnora Karimova" className="input" required />
                </div>
                <div>
                  <label className="label" htmlFor="m-subject">Fani yoki lavozimi</label>
                  <input id="m-subject" value={editing.subject} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} maxLength={80} placeholder="Masalan: Biologiya o‘qituvchisi" className="input" />
                </div>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="m-bio">Qisqacha <span className="font-normal text-muted">(loyihaga qanday yordam bergan)</span></label>
              <textarea id="m-bio" value={editing.bio} onChange={(e) => setEditing({ ...editing, bio: e.target.value })} maxLength={500} rows={4} placeholder="Masalan: Tadqiqot ishlarimizga ilmiy rahbarlik qildi." className="input resize-y" />
              <p className="hint text-right">{editing.bio.length}/500</p>
            </div>
            {formError && <Alert tone="error">{formError}</Alert>}
            <div className="flex flex-col-reverse gap-3 border-t border-line pt-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setEditing(null)} disabled={saving} className="btn btn-ghost">Bekor qilish</button>
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving && <Spinner />}
                {saving ? "Saqlanmoqda…" : "Saqlash"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        busy={busy}
        tone="danger"
        title="Mentorni o‘chirasizmi?"
        text={toDelete ? `${toDelete.full_name} saytdagi ro‘yxatdan olib tashlanadi.` : ""}
        confirmLabel="Ha, o‘chirish"
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
