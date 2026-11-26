"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatDate, formatNumber } from "@/lib/session";
import { BATCH_STAGES, BATCH_FIELDS, formatSum, safeUrl, type Batch } from "@/lib/batches";
import { GF_STEPS, TASK_STATUS, goalPct, goalValue, loadGreenFlag, stepState, type GreenFlagData } from "@/lib/greenflag";
import { AdminTitle } from "@/components/admin/AdminShell";
import { Emblem } from "@/components/Emblem";
import { formatHours } from "@/lib/volunteer";
import { Alert, CardsSkeleton } from "@/components/ui";

type Impact = { paper_kg: number; plastic_kg: number; recycling_kg: number; approved_challenges: number; total_points: number; active_students: number };
type Research = { id: number; title: string; team_name: string | null; submitted_at: string };
type EventRow = { id: number; title: string; start_date: string; event_type: string };

type Report = {
  gf: GreenFlagData;
  impact: Impact | null;
  batches: Batch[];
  research: Research[];
  events: EventRow[];
  school: string;
  volunteers: { n: number; hours: number };
};

function H({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="mb-3 mt-8 flex items-center gap-2 border-b-2 border-[#1d7438] pb-1.5 text-lg font-extrabold text-[#173b26] first:mt-0">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-[#1d7438] text-xs text-white">{n}</span>
      {children}
    </h2>
  );
}

const th = "border border-[#cfe3c6] bg-[#eef7e9] px-2 py-1.5 text-left font-bold";
const td = "border border-[#cfe3c6] px-2 py-1.5 align-top";

export default function AdminReportPage() {
  const [supabase] = useState(() => createClient());
  const [r, setR] = useState<Report | null>(null);

  useEffect(() => {
    (async () => {
      const [gf, imp, b, res, ev, sc, vol] = await Promise.all([
        loadGreenFlag(supabase),
        supabase.rpc("get_school_overall_impact"),
        supabase.from("recycling_batches").select(BATCH_FIELDS).order("created_at"),
        supabase.from("eco_research").select("id, title, team_name, submitted_at").eq("status", "published").order("submitted_at"),
        supabase.from("eco_events").select("id, title, start_date, event_type").order("start_date"),
        supabase.from("schools").select("name").limit(1).maybeSingle(),
        supabase.rpc("get_volunteer_board"),
      ]);
      const volRows = ((vol.data as { hours: number }[]) || []);
      const impRow = (Array.isArray(imp.data) ? imp.data[0] : imp.data) as Impact | undefined;
      setR({
        gf,
        impact: impRow ?? null,
        batches: ((b.data as Batch[]) || []).map((x) => ({ ...x, paper_kg: Number(x.paper_kg), plastic_kg: Number(x.plastic_kg), income: Number(x.income) })),
        research: (res.data as Research[]) || [],
        events: (ev.data as EventRow[]) || [],
        school: (sc.data as { name: string } | null)?.name || "Maktab",
        volunteers: { n: volRows.length, hours: volRows.reduce((a, v) => a + Number(v.hours), 0) },
      });
    })();
  }, [supabase]);

  const today = new Date();

  return (
    <>
      <div className="no-print">
        <AdminTitle
          icon="📄"
          title="Green Flag hisoboti"
          text="Eco-Schools portfoliosi: barcha ma’lumotlar saytdan avtomatik yig‘iladi. Chop eting yoki PDF qilib saqlang."
          action={
            <button onClick={() => window.print()} disabled={!r} className="btn btn-lime">🖨️ Chop etish / PDF</button>
          }
        />
        {r && !r.gf.ready && (
          <div className="mb-5">
            <Alert tone="error">Avval Supabase’da <b>20261126_eco_platform.sql</b> faylini ishga tushiring — aks holda hisobotning bir qismi bo‘sh chiqadi.</Alert>
          </div>
        )}
      </div>

      <style>{`@media print { @page { size: A4; margin: 14mm; } .report { box-shadow: none !important; padding: 0 !important; border-radius: 0 !important; } }`}</style>

      {!r ? (
        <CardsSkeleton count={4} className="h-32" />
      ) : (
        <article className="report print-area mx-auto max-w-4xl overflow-x-auto rounded-2xl bg-white p-6 text-[13px] leading-relaxed text-[#1f2d24] shadow-2xl sm:p-10">
          {/* Muqova */}
          <header className="flex items-center gap-5 border-b-4 border-[#1d7438] pb-5">
            <Emblem className="h-20 w-20 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[#1d7438]">Eco-Schools · Green Flag Portfolio</p>
              <h1 className="mt-1 font-display text-2xl font-semibold leading-tight text-[#173b26] sm:text-3xl">{r.school}</h1>
              <p className="text-[#4b6b57]">ECO SCHOOL · Eco Future Andijan · {formatDate(today.toISOString())}</p>
            </div>
          </header>

          {/* Qisqa natija */}
          <section className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { v: `${GF_STEPS.filter((s) => stepState(s.key, r.gf) === 2).length}/7`, l: "Qadam bajarildi" },
              { v: `${formatNumber(r.impact?.recycling_kg ?? 0, 1)} kg`, l: "Recycling" },
              { v: String(r.research.length), l: "Tadqiqot" },
              { v: String(r.impact?.active_students ?? 0), l: "Faol o‘quvchi" },
            ].map((s) => (
              <div key={s.l} className="rounded-xl bg-[#eef7e9] p-3 text-center">
                <p className="text-xl font-extrabold text-[#173b26]">{s.v}</p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#4b6b57]">{s.l}</p>
              </div>
            ))}
          </section>

          <div className="mt-8">
            <H n={1}>Eco Committee</H>
            {r.gf.members.length === 0 ? (
              <p className="text-[#6b7f72]">A’zolar kiritilmagan.</p>
            ) : (
              <table className="w-full border-collapse">
                <thead><tr><th className={th}>#</th><th className={th}>Ism-familiya</th><th className={th}>Vazifasi</th><th className={th}>Sinf</th></tr></thead>
                <tbody>
                  {r.gf.members.map((m, i) => (
                    <tr key={m.id}><td className={td}>{i + 1}</td><td className={td}>{m.full_name}</td><td className={td}>{m.role_title || "A’zo"}</td><td className={td}>{m.class_name || "—"}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="mt-3 font-bold">Yig‘ilishlar ({r.gf.meetings.length})</p>
            {r.gf.meetings.length === 0 ? (
              <p className="text-[#6b7f72]">Yig‘ilishlar yozilmagan.</p>
            ) : (
              <ul className="mt-1 space-y-2">
                {[...r.gf.meetings].reverse().map((m) => (
                  <li key={m.id} className="break-inside-avoid rounded-lg border border-[#cfe3c6] p-2.5">
                    <b>{formatDate(m.meet_date)} — {m.title}</b>
                    {m.decisions && <p className="whitespace-pre-line"><i>Qarorlar:</i> {m.decisions}</p>}
                    {m.minutes && <p className="whitespace-pre-line text-[#4b6b57]">{m.minutes}</p>}
                  </li>
                ))}
              </ul>
            )}

            <H n={2}>Maqsadlar va monitoring</H>
            <table className="w-full border-collapse">
              <thead><tr><th className={th}>Maqsad</th><th className={th}>Natija</th><th className={th}>Reja</th><th className={th}>%</th></tr></thead>
              <tbody>
                {r.gf.goals.map((g) => (
                  <tr key={g.id} className="break-inside-avoid">
                    <td className={td}>{g.title}</td>
                    <td className={td}>{formatNumber(goalValue(g, r.gf.auto), 1)} {g.unit}</td>
                    <td className={td}>{formatNumber(g.target)} {g.unit}</td>
                    <td className={`${td} font-bold ${goalPct(g, r.gf.auto) >= 100 ? "text-[#1d7438]" : ""}`}>{Math.round(goalPct(g, r.gf.auto))}%</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <H n={3}>Action Plan</H>
            {r.gf.tasks.length === 0 ? (
              <p className="text-[#6b7f72]">Vazifalar kiritilmagan.</p>
            ) : (
              <table className="w-full border-collapse">
                <thead><tr><th className={th}>Qadam</th><th className={th}>Vazifa</th><th className={th}>Mas’ul</th><th className={th}>Muddat</th><th className={th}>Holati</th></tr></thead>
                <tbody>
                  {r.gf.tasks.map((t) => (
                    <tr key={t.id} className="break-inside-avoid">
                      <td className={td}>{GF_STEPS.find((s) => s.key === t.step)?.n}. {GF_STEPS.find((s) => s.key === t.step)?.title}</td>
                      <td className={td}>{t.title}</td>
                      <td className={td}>{t.owner_name || "—"}</td>
                      <td className={td}>{t.deadline ? formatDate(t.deadline) : "—"}</td>
                      <td className={td}>{TASK_STATUS[t.status].label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <H n={4}>Recycling partiyalari</H>
            <p className="mb-2">
              Tasdiqlangan: qog‘oz <b>{formatNumber(r.impact?.paper_kg ?? 0, 1)} kg</b>, plastik <b>{formatNumber(r.impact?.plastic_kg ?? 0, 1)} kg</b>. Eco Fund:{" "}
              <b>{formatSum(r.batches.reduce((s, b) => s + b.income, 0))}</b>.
            </p>
            {r.batches.length > 0 && (
              <table className="w-full border-collapse">
                <thead><tr><th className={th}>Partiya</th><th className={th}>Qog‘oz</th><th className={th}>Plastik</th><th className={th}>Bosqich</th><th className={th}>Tushum</th><th className={th}>Kvitansiya</th></tr></thead>
                <tbody>
                  {r.batches.map((b) => (
                    <tr key={b.id} className="break-inside-avoid">
                      <td className={td}>{b.title}<br /><span className="text-[11px] text-[#6b7f72]">{formatDate(b.created_at)}</span></td>
                      <td className={td}>{formatNumber(b.paper_kg, 1)} kg</td>
                      <td className={td}>{formatNumber(b.plastic_kg, 1)} kg</td>
                      <td className={td}>{BATCH_STAGES[b.stage - 1]?.title}</td>
                      <td className={td}>{formatSum(b.income)}</td>
                      <td className={td}>{safeUrl(b.receipt_url) ? <a href={safeUrl(b.receipt_url)!} className="text-[#1d7438] underline">bor</a> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <H n={5}>Tadqiqotlar va tadbirlar</H>
            <p className="font-bold">Nashr qilingan tadqiqotlar ({r.research.length})</p>
            {r.research.length === 0 ? <p className="text-[#6b7f72]">—</p> : (
              <ol className="ml-5 list-decimal">
                {r.research.map((x) => <li key={x.id}>{x.title}{x.team_name ? ` — ${x.team_name}` : ""} <span className="text-[#6b7f72]">({formatDate(x.submitted_at)})</span></li>)}
              </ol>
            )}
            <p className="mt-3 font-bold">Tadbirlar va eko-kunlar ({r.events.length})</p>
            {r.events.length === 0 ? <p className="text-[#6b7f72]">—</p> : (
              <ul className="ml-5 list-disc">
                {r.events.map((e) => <li key={e.id}>{formatDate(e.start_date)} — {e.title}</li>)}
              </ul>
            )}
            <p className="mt-2">Volontyorlar: <b>{r.volunteers.n}</b> kishi, jami tasdiqlangan <b>{formatHours(r.volunteers.hours)}</b> ko‘ngillilik faoliyati.</p>
            <p className="mt-2">Tasdiqlangan challenge topshiriqlari: <b>{r.impact?.approved_challenges ?? 0}</b>. Jami eco ballar: <b>{formatNumber(r.impact?.total_points ?? 0)}</b>.</p>

            <H n={6}>Eco-Code</H>
            {r.gf.ecocode ? (
              <blockquote className="whitespace-pre-line rounded-xl border-l-4 border-[#1d7438] bg-[#eef7e9] p-4 font-display text-base leading-7 text-[#173b26]">{r.gf.ecocode}</blockquote>
            ) : (
              <p className="text-[#6b7f72]">Eco-Code hali yozilmagan.</p>
            )}

            <H n={7}>7 qadam holati</H>
            <table className="w-full border-collapse">
              <tbody>
                {GF_STEPS.map((s) => {
                  const st = stepState(s.key, r.gf);
                  return (
                    <tr key={s.key}>
                      <td className={td}>{s.n}. {s.title}</td>
                      <td className={`${td} font-bold ${st === 2 ? "text-[#1d7438]" : st === 1 ? "text-[#a07514]" : "text-[#8a948e]"}`}>
                        {st === 2 ? "✓ Bajarildi" : st === 1 ? "Jarayonda" : "Boshlanmagan"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <footer className="mt-10 flex justify-between text-[12px] text-[#4b6b57]">
              <span>Tayyorlandi: ECO SCHOOL platformasi</span>
              <span>Imzo: ____________________</span>
            </footer>
          </div>
        </article>
      )}
    </>
  );
}
