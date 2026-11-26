"use client";

import { Reveal, confetti } from "@/components/effects";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatDate, formatNumber } from "@/lib/session";
import { POINTS_PER_KG } from "@/lib/eco";
import { BATCH_FIELDS, BATCH_STAGES, formatSum, safeUrl, type Batch } from "@/lib/batches";
import { Alert, EmptyState, Skeleton } from "@/components/ui";

export const PRICE_KEYS = { paper: "recycling.price_paper", plastic: "recycling.price_plastic" } as const;
export const DEFAULT_PRICES = { paper: 1000, plastic: 2000 };

/** Admin kiritgan narxlar (site_content), bo'lmasa — standart */
export function usePrices() {
  const [prices, setPrices] = useState(DEFAULT_PRICES);
  useEffect(() => {
    createClient()
      .from("site_content")
      .select("key, value")
      .in("key", [PRICE_KEYS.paper, PRICE_KEYS.plastic])
      .then(({ data }) => {
        const map = Object.fromEntries(((data as { key: string; value: string }[]) || []).map((r) => [r.key, Number(r.value)]));
        setPrices({
          paper: map[PRICE_KEYS.paper] > 0 ? map[PRICE_KEYS.paper] : DEFAULT_PRICES.paper,
          plastic: map[PRICE_KEYS.plastic] > 0 ? map[PRICE_KEYS.plastic] : DEFAULT_PRICES.plastic,
        });
      });
  }, []);
  return prices;
}

/* ───────────── Kalkulyator ───────────── */
export function RecyclingCalculator() {
  const prices = usePrices();
  const [paper, setPaper] = useState(5);
  const [plastic, setPlastic] = useState(3);
  const total = paper + plastic;
  const coins = Math.round(total * POINTS_PER_KG);
  const income = paper * prices.paper + plastic * prices.plastic;

  return (
    <section className="card p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Recycling kalkulyatori</h2>
          <p className="mt-1 text-sm text-muted">Sinfingiz qancha yig‘sa, qancha ball va tushum bo‘lishini hisoblang.</p>
        </div>
      </div>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          {[
            { key: "paper", icon: "📄", label: "Qog‘oz", value: paper, set: setPaper, price: prices.paper },
            { key: "plastic", icon: "🧴", label: "Plastik", value: plastic, set: setPlastic, price: prices.plastic },
          ].map((m) => (
            <div key={m.key}>
              <div className="flex items-center justify-between">
                <label htmlFor={`calc-${m.key}`} className="font-extrabold">{m.icon} {m.label}</label>
                <span className="font-display text-xl font-semibold">{m.value} kg</span>
              </div>
              <input
                id={`calc-${m.key}`}
                type="range"
                min="0"
                max="100"
                step="0.5"
                value={m.value}
                onChange={(e) => m.set(Number(e.target.value))}
                className="mt-2 h-11 w-full accent-[#b4f07f]"
              />
              <p className="text-xs text-muted">Narx: {formatSum(m.price)} / kg</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 self-start">
          <div className="rounded-2xl bg-ink/[0.04] p-4 ring-1 ring-line">
            <p className="text-xs font-bold text-muted">Jami chiqindi</p>
            <p className="mt-1 font-display text-3xl font-semibold">{formatNumber(total, 1)} kg</p>
          </div>
          <div className="rounded-2xl bg-leaf-100 p-4 ring-1 ring-forest-500/40">
            <p className="text-xs font-bold text-muted">Sinfga XP / EcoCoin</p>
            <p className="mt-1 font-display text-3xl font-semibold text-accent">+{formatNumber(coins)}</p>
          </div>
          <div className="col-span-2 rounded-2xl bg-sand-100 p-4 ring-1 ring-sand-400/40">
            <p className="text-xs font-bold text-muted">Recyclingdan taxminiy tushum (Eco Fund’ga)</p>
            <p className="mt-1 font-display text-3xl font-semibold text-sand-400">{formatSum(income)}</p>
          </div>
          <p className="col-span-2 text-[11px] leading-relaxed text-muted">Narxlar korxona bilan kelishilganiga qarab administrator tomonidan o‘zgartiriladi.</p>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Partiyalarni kuzatish ───────────── */
export function BatchTracker({ onTotal }: { onTotal?: (income: number) => void }) {
  const [supabase] = useState(() => createClient());
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("recycling_batches")
      .select(BATCH_FIELDS)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (error) console.error(error);
        const list = ((data as Batch[]) || []).map((b) => ({ ...b, paper_kg: Number(b.paper_kg), plastic_kg: Number(b.plastic_kg), income: Number(b.income) }));
        setBatches(list);
        if (list[0]) setOpen(list[0].id);
        onTotal?.(list.reduce((s, b) => s + b.income, 0));
        setLoading(false);
      });
  }, [supabase, onTotal]);

  return (
    <section className="card p-6 sm:p-8">
      <h2 className="text-2xl font-semibold">Partiyalar qayerda?</h2>
      <p className="mt-1 text-sm text-muted">Yig‘ilgan har bir chiqindi partiyasining yo‘li — qabul qilinganidan natija e’lon qilinguncha.</p>
      <div className="mt-6 space-y-3">
        {loading ? (
          <Skeleton className="h-24" />
        ) : batches.length === 0 ? (
          <EmptyState icon="🚚" title="Hali partiya yo‘q" text="Birinchi partiya to‘planganda shu yerda kuzatasiz." />
        ) : (
          batches.map((b) => {
            const expanded = open === b.id;
            const receipt = safeUrl(b.receipt_url);
            return (
              <div key={b.id} className="rounded-2xl bg-ink/[0.03] ring-1 ring-line">
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : b.id)}
                  aria-expanded={expanded}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-leaf-100 text-xl">{BATCH_STAGES[b.stage - 1]?.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-extrabold">{b.title}</span>
                    <span className="block text-xs text-muted">
                      📄 {formatNumber(b.paper_kg, 1)} kg · 🧴 {formatNumber(b.plastic_kg, 1)} kg · {b.stage}/6 · {BATCH_STAGES[b.stage - 1]?.title}
                    </span>
                  </span>
                  <span className={`text-muted transition ${expanded ? "rotate-180" : ""}`}>⌄</span>
                </button>
                <div className="px-4 pb-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
                    <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${(b.stage / 6) * 100}%` }} />
                  </div>
                </div>
                {expanded && (
                  <div className="p-4 pt-3">
                    <ol className="space-y-0">
                      {BATCH_STAGES.map((s) => {
                        const done = b.stage >= s.n;
                        const at = b.history?.find((h) => h.stage === s.n)?.at;
                        return (
                          <li key={s.n} className="flex gap-3">
                            <span className="flex flex-col items-center">
                              <span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-black ${done ? "bg-glow text-forest-950" : "bg-ink/[0.06] text-muted"}`}>
                                {done ? "✓" : s.n}
                              </span>
                              {s.n < 6 && <span className={`w-0.5 flex-1 ${b.stage > s.n ? "bg-leaf-400" : "bg-ink/10"}`} style={{ minHeight: 14 }} />}
                            </span>
                            <span className={`pb-3 ${done ? "" : "opacity-55"}`}>
                              <span className="block text-sm font-extrabold">{s.icon} {s.title}</span>
                              <span className="block text-xs text-muted">{s.text}{at ? ` · ${formatDate(at)}` : ""}</span>
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                      {b.income > 0 && <span className="chip bg-sand-100 text-sand-400">💰 {formatSum(b.income)}</span>}
                      {receipt && (
                        <a href={receipt} target="_blank" rel="noopener noreferrer" className="chip bg-ink/[0.06] font-bold text-accent hover:underline">
                          🧾 Kvitansiyani ko‘rish
                        </a>
                      )}
                      {b.note && <span className="text-xs text-muted">{b.note}</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

/* ───────────── Eco Fund ───────────── */
type FundRow = { project_id: number; title: string; description: string | null; votes: number; mine: boolean };

export function EcoFund({ income }: { income: number | null }) {
  const [supabase] = useState(() => createClient());
  const [rows, setRows] = useState<FundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.rpc("get_fund_summary");
    if (err) console.error(err);
    setRows(((data as FundRow[]) || []).map((r) => ({ ...r, votes: Number(r.votes) })));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function vote(id: number) {
    setVoting(id);
    setError("");
    const { error: err } = await supabase.rpc("vote_fund_project", { p_project: id });
    setVoting(null);
    if (err) setError("Ovoz berib bo‘lmadi. Qayta urinib ko‘ring.");
    else {
      confetti({ count: 50 });
      load();
    }
  }

  const total = rows.reduce((s, r) => s + r.votes, 0);

  return (
    <section className="card overflow-hidden p-0">
      <div className="bg-sand-100 p-6 sm:p-8">
        <p className="text-xs font-extrabold uppercase tracking-wider text-muted">Eco Fund · maktab ekologik jamg‘armasi</p>
        <p className="mt-2 font-display text-4xl font-semibold text-sand-400">{income === null ? "…" : formatSum(income)}</p>
        <p className="mt-1 text-sm text-muted">Recycling partiyalaridan tushgan mablag‘. Qayerga sarflanishini o‘zingiz tanlaysiz.</p>
      </div>
      <div className="p-6 sm:p-8">
        <h3 className="text-lg font-extrabold">Navbatdagi loyiha uchun ovoz bering</h3>
        {error && <div className="mt-3"><Alert tone="error">{error}</Alert></div>}
        <div className="mt-4 space-y-3">
          {loading ? (
            <Skeleton className="h-16" />
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted">Ovoz berish hozircha ochilmagan.</p>
          ) : (
            rows.map((r) => {
              const pct = total ? Math.round((r.votes / total) * 100) : 0;
              return (
                <Reveal key={r.project_id}>
                  <div className={`rounded-2xl p-4 ring-1 ${r.mine ? "bg-leaf-100/60 ring-forest-500" : "bg-ink/[0.03] ring-line"}`}>
                    <div className="flex items-center gap-3">
                      <span className="min-w-0 flex-1">
                        <span className="block font-extrabold">{r.title}</span>
                        {r.description && <span className="block text-xs text-muted">{r.description}</span>}
                      </span>
                      <span className="font-display text-xl font-semibold">{pct}%</span>
                    </div>
                    <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-ink/[0.06]">
                      <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-muted">{r.votes} ovoz</span>
                      {r.mine ? (
                        <span className="chip bg-glow text-forest-950">✓ Sizning ovozingiz</span>
                      ) : (
                        <button onClick={() => vote(r.project_id)} disabled={voting !== null} className="btn btn-ghost btn-sm">
                          {voting === r.project_id ? "…" : "Ovoz berish"}
                        </button>
                      )}
                    </div>
                  </div>
                </Reveal>
              );
            })
          )}
        </div>
        <p className="mt-3 text-[11px] text-muted">Har bir o‘quvchining bitta ovozi bor — fikringizni o‘zgartirsangiz, ovoz boshqa loyihaga o‘tadi.</p>
      </div>
    </section>
  );
}
