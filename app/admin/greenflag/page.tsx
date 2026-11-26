"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createClient } from "@/lib/supabase";
import { formatDate, formatNumber } from "@/lib/session";
import {
  AUTO_LABEL,
  ECOCODE_KEY,
  GF_STEPS,
  TASK_STATUS,
  goalPct,
  goalValue,
  loadGreenFlag,
  type GreenFlagData,
  type StepKey,
  type Task,
} from "@/lib/greenflag";
import { AdminTitle } from "@/components/admin/AdminShell";
import { Alert, CardsSkeleton, Spinner, Tabs } from "@/components/ui";

type Tab = "goals" | "committee" | "meetings" | "plan" | "ecocode";

const today = () => new Date().toISOString().slice(0, 10);

export default function AdminGreenFlagPage() {
  const [supabase] = useState(() => createClient());
  const [tab, setTab] = useState<Tab>("goals");
  const [data, setData] = useState<GreenFlagData | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [goalEdits, setGoalEdits] = useState<Record<number, { target: string; current: string }>>({});
  const [member, setMember] = useState({ full_name: "", role_title: "", class_name: "" });
  const [meeting, setMeeting] = useState({ meet_date: today(), title: "", decisions: "", minutes: "" });
  const [task, setTask] = useState<{ title: string; step: StepKey; owner_name: string; deadline: string }>({ title: "", step: "action", owner_name: "", deadline: "" });
  const [ecocode, setEcocode] = useState("");

  const load = useCallback(async () => {
    const d = await loadGreenFlag(supabase);
    setData(d);
    setEcocode(d.ecocode);
    setGoalEdits(Object.fromEntries(d.goals.map((g) => [g.id, { target: String(g.target), current: String(g.current) }])));
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  function done(error: unknown, ok: string) {
    if (error) {
      console.error(error);
      setMessage({ text: "Saqlab bo‘lmadi. Qayta urinib ko‘ring.", error: true });
    } else setMessage({ text: ok, error: false });
    load();
  }

  async function saveGoals() {
    if (!data) return;
    setBusy(true);
    const changed = data.goals.filter((g) => {
      const e = goalEdits[g.id];
      return e && (Number(e.target) !== g.target || (!g.auto && Number(e.current) !== g.current));
    });
    const results = await Promise.all(
      changed.map((g) => {
        const e = goalEdits[g.id];
        const row: { target: number; current?: number } = { target: Math.max(0, Number(e.target) || 0) };
        if (!g.auto) row.current = Math.max(0, Number(e.current) || 0);
        return supabase.from("eco_goals").update(row).eq("id", g.id);
      })
    );
    setBusy(false);
    done(results.find((r) => r.error)?.error, changed.length ? `✓ ${changed.length} ta maqsad yangilandi.` : "O‘zgarish yo‘q.");
  }

  async function addMember(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (member.full_name.trim().length < 2) return;
    const { error } = await supabase.from("committee_members").insert({
      full_name: member.full_name.trim(),
      role_title: member.role_title.trim() || null,
      class_name: member.class_name.trim().toUpperCase() || null,
      sort_order: (data?.members.length ?? 0) + 1,
    });
    if (!error) setMember({ full_name: "", role_title: "", class_name: "" });
    done(error, "✓ A’zo qo‘shildi.");
  }

  async function addMeeting(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (meeting.title.trim().length < 2) return;
    const { error } = await supabase.from("committee_meetings").insert({
      meet_date: meeting.meet_date,
      title: meeting.title.trim(),
      decisions: meeting.decisions.trim() || null,
      minutes: meeting.minutes.trim() || null,
    });
    if (!error) setMeeting({ meet_date: today(), title: "", decisions: "", minutes: "" });
    done(error, "✓ Yig‘ilish bayonnomasi saqlandi.");
  }

  async function addTask(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (task.title.trim().length < 2) return;
    const { error } = await supabase.from("action_tasks").insert({
      title: task.title.trim(),
      step: task.step,
      owner_name: task.owner_name.trim() || null,
      deadline: task.deadline || null,
    });
    if (!error) setTask({ ...task, title: "", owner_name: "", deadline: "" });
    done(error, "✓ Vazifa qo‘shildi.");
  }

  async function setTaskStatus(t: Task, status: Task["status"]) {
    const { error } = await supabase.from("action_tasks").update({ status }).eq("id", t.id);
    done(error, `“${t.title}” — ${TASK_STATUS[status].label.toLowerCase()}.`);
  }

  async function remove(table: "committee_members" | "committee_meetings" | "action_tasks", id: number) {
    const { error } = await supabase.from(table).delete().eq("id", id);
    done(error, "O‘chirildi.");
  }

  async function saveEcocode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("site_content").upsert({ key: ECOCODE_KEY, value: ecocode.trim() });
    setBusy(false);
    done(error, "✓ Eco-Code saqlandi — Green Flag sahifasida ko‘rinadi.");
  }

  if (data && !data.ready) {
    return (
      <>
        <AdminTitle icon="🏳️" title="Green Flag" text="Eco-Schools 7 qadami" />
        <Alert tone="error">Avval Supabase’da <b>20261126_eco_platform.sql</b> faylini ishga tushiring, so‘ng sahifani yangilang.</Alert>
      </>
    );
  }

  return (
    <>
      <AdminTitle
        icon="🏳️"
        title="Green Flag"
        text="Eco-Schools dasturining 7 qadami: maqsadlar, Eco Committee, yig‘ilishlar, Action Plan va Eco-Code. Hammasi saytdagi Green Flag sahifasida ko‘rinadi."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/green-flag" className="btn bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20">Saytda ko‘rish</Link>
            <Link href="/admin/report" className="btn btn-lime">📄 Hisobot</Link>
          </div>
        }
      />
      {message && <div className="mb-5"><Alert tone={message.error ? "error" : "success"} onClose={() => setMessage(null)}>{message.text}</Alert></div>}

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        items={[
          { value: "goals", label: "Maqsadlar", count: data?.goals.length },
          { value: "committee", label: "Eco Committee", count: data?.members.length },
          { value: "meetings", label: "Yig‘ilishlar", count: data?.meetings.length },
          { value: "plan", label: "Action Plan", count: data?.tasks.filter((t) => t.status !== "done").length },
          { value: "ecocode", label: "Eco-Code" },
        ]}
      />

      <div className="mt-5">
        {!data ? (
          <CardsSkeleton count={3} className="h-20" />
        ) : tab === "goals" ? (
          <div className="card p-5 sm:p-6">
            <div className="space-y-3">
              {data.goals.map((g) => {
                const e = goalEdits[g.id] ?? { target: "", current: "" };
                const pct = goalPct(g, data.auto);
                return (
                  <div key={g.id} className="grid items-center gap-3 rounded-2xl bg-ink/[0.03] p-3.5 ring-1 ring-line md:grid-cols-[1fr_130px_130px_120px]">
                    <span>
                      <span className="block font-extrabold">{g.title}</span>
                      <span className="block text-[11px] text-muted">{g.auto ? `Avto: ${AUTO_LABEL[g.auto]}` : "Qo‘lda kiritiladi"}</span>
                    </span>
                    <label className="text-xs font-bold text-muted">
                      Hozir ({g.unit})
                      {g.auto ? (
                        <span className="input mt-1 block py-2 font-extrabold text-ink">{formatNumber(goalValue(g, data.auto), 1)}</span>
                      ) : (
                        <input type="number" min="0" step="any" value={e.current} onChange={(ev) => setGoalEdits({ ...goalEdits, [g.id]: { ...e, current: ev.target.value } })} className="input mt-1 py-2" />
                      )}
                    </label>
                    <label className="text-xs font-bold text-muted">
                      Maqsad ({g.unit})
                      <input type="number" min="0" step="any" value={e.target} onChange={(ev) => setGoalEdits({ ...goalEdits, [g.id]: { ...e, target: ev.target.value } })} className="input mt-1 py-2" />
                    </label>
                    <span>
                      <span className="block text-right text-sm font-extrabold">{Math.round(pct)}%</span>
                      <span className="mt-1 block h-2 overflow-hidden rounded-full bg-ink/[0.06]">
                        <span className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
            <button onClick={saveGoals} disabled={busy} className="btn btn-primary mt-5">{busy && <Spinner />}Saqlash</button>
          </div>
        ) : tab === "committee" ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="space-y-2">
              {data.members.length === 0 && <p className="text-sm text-muted">Hali a’zo yo‘q. Eco Committee — o‘quvchilar, o‘qituvchilar va ota-onalardan iborat guruh.</p>}
              {data.members.map((m) => (
                <div key={m.id} className="card flex items-center gap-3 p-3.5">
                  <span className="min-w-0 flex-1">
                    <span className="block font-extrabold">{m.full_name}</span>
                    <span className="block text-xs text-muted">{[m.role_title, m.class_name].filter(Boolean).join(" · ") || "A’zo"}</span>
                  </span>
                  <button onClick={() => remove("committee_members", m.id)} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-coral-500" aria-label="O‘chirish">🗑</button>
                </div>
              ))}
            </div>
            <form onSubmit={addMember} className="card h-fit space-y-3 p-5">
              <h3 className="font-extrabold">Yangi a’zo</h3>
              <input value={member.full_name} onChange={(e) => setMember({ ...member, full_name: e.target.value })} maxLength={80} placeholder="Ism-familiya" className="input" aria-label="Ism-familiya" required />
              <input value={member.role_title} onChange={(e) => setMember({ ...member, role_title: e.target.value })} maxLength={80} placeholder="Vazifasi (Rais, kotib, o‘qituvchi…)" className="input" aria-label="Vazifasi" />
              <input value={member.class_name} onChange={(e) => setMember({ ...member, class_name: e.target.value })} maxLength={20} placeholder="Sinf (ixtiyoriy)" className="input" aria-label="Sinf" />
              <button type="submit" className="btn btn-primary w-full">+ Qo‘shish</button>
            </form>
          </div>
        ) : tab === "meetings" ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <div className="space-y-2">
              {data.meetings.length === 0 && <p className="text-sm text-muted">Hali yig‘ilish yozilmagan.</p>}
              {data.meetings.map((m) => (
                <div key={m.id} className="card p-4">
                  <div className="flex items-center gap-3">
                    <span className="min-w-0 flex-1">
                      <span className="block font-extrabold">{m.title}</span>
                      <span className="block text-xs text-muted">{formatDate(m.meet_date)}</span>
                    </span>
                    <button onClick={() => remove("committee_meetings", m.id)} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-coral-500" aria-label="O‘chirish">🗑</button>
                  </div>
                  {m.decisions && <p className="mt-2 whitespace-pre-line text-sm"><b>Qarorlar:</b> {m.decisions}</p>}
                </div>
              ))}
            </div>
            <form onSubmit={addMeeting} className="card h-fit space-y-3 p-5">
              <h3 className="font-extrabold">Yig‘ilish bayonnomasi</h3>
              <input type="date" value={meeting.meet_date} onChange={(e) => setMeeting({ ...meeting, meet_date: e.target.value })} className="input" aria-label="Sana" required />
              <input value={meeting.title} onChange={(e) => setMeeting({ ...meeting, title: e.target.value })} maxLength={160} placeholder="Mavzu" className="input" aria-label="Mavzu" required />
              <textarea value={meeting.decisions} onChange={(e) => setMeeting({ ...meeting, decisions: e.target.value })} maxLength={3000} rows={3} placeholder="Qabul qilingan qarorlar" className="input" aria-label="Qarorlar" />
              <textarea value={meeting.minutes} onChange={(e) => setMeeting({ ...meeting, minutes: e.target.value })} maxLength={5000} rows={4} placeholder="Bayonnoma (kim qatnashdi, nima muhokama qilindi)" className="input" aria-label="Bayonnoma" />
              <button type="submit" className="btn btn-primary w-full">Saqlash</button>
            </form>
          </div>
        ) : tab === "plan" ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-2">
              {data.tasks.length === 0 && <p className="text-sm text-muted">Reja bo‘sh. Har bir qadam uchun vazifa qo‘shing.</p>}
              {data.tasks.map((t) => (
                <div key={t.id} className="card flex flex-wrap items-center gap-3 p-3.5">
                  <span className="text-xl">{GF_STEPS.find((s) => s.key === t.step)?.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className={`block font-extrabold ${t.status === "done" ? "line-through opacity-60" : ""}`}>{t.title}</span>
                    <span className="block text-xs text-muted">
                      {[t.owner_name && `👤 ${t.owner_name}`, t.deadline && `📅 ${formatDate(t.deadline)}`].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </span>
                  <select value={t.status} onChange={(e) => setTaskStatus(t, e.target.value as Task["status"])} className="input w-auto py-2 text-sm" aria-label="Holati">
                    {(Object.keys(TASK_STATUS) as Task["status"][]).map((s) => (
                      <option key={s} value={s}>{TASK_STATUS[s].label}</option>
                    ))}
                  </select>
                  <button onClick={() => remove("action_tasks", t.id)} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-coral-500" aria-label="O‘chirish">🗑</button>
                </div>
              ))}
            </div>
            <form onSubmit={addTask} className="card h-fit space-y-3 p-5">
              <h3 className="font-extrabold">Yangi vazifa</h3>
              <input value={task.title} onChange={(e) => setTask({ ...task, title: e.target.value })} maxLength={200} placeholder="Masalan: Har sinfga saralash qutisi" className="input" aria-label="Vazifa" required />
              <select value={task.step} onChange={(e) => setTask({ ...task, step: e.target.value as StepKey })} className="input" aria-label="Qadam">
                {GF_STEPS.map((s) => (
                  <option key={s.key} value={s.key}>{s.n}. {s.title}</option>
                ))}
              </select>
              <input value={task.owner_name} onChange={(e) => setTask({ ...task, owner_name: e.target.value })} maxLength={80} placeholder="Mas’ul" className="input" aria-label="Mas’ul" />
              <input type="date" value={task.deadline} onChange={(e) => setTask({ ...task, deadline: e.target.value })} className="input" aria-label="Muddat" />
              <button type="submit" className="btn btn-primary w-full">+ Qo‘shish</button>
            </form>
          </div>
        ) : (
          <form onSubmit={saveEcocode} className="card max-w-3xl space-y-4 p-6">
            <p className="text-sm text-muted">Eco-Code — o‘quvchilar bilan birga yozilgan qisqa ekologik nizom (5–10 qator). Har bir qatorni yangi qatordan yozing.</p>
            <textarea
              value={ecocode}
              onChange={(e) => setEcocode(e.target.value)}
              rows={10}
              maxLength={3000}
              placeholder={"Biz chiroqni o‘chirib chiqamiz.\nBiz suvni tejaymiz.\nBiz chiqindini saralaymiz.\n…"}
              className="input font-display text-lg leading-8"
              aria-label="Eco-Code matni"
            />
            <button type="submit" disabled={busy} className="btn btn-primary">{busy && <Spinner />}Saqlash</button>
          </form>
        )}
      </div>
    </>
  );
}
