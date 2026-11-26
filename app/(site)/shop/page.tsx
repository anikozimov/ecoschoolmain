"use client";

import { Reveal, confetti } from "@/components/effects";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatDate, useSession } from "@/lib/session";
import { levelOf, loadWallet, type Wallet } from "@/lib/eco";
import { Alert, ConfirmDialog, EmptyState, LoginRequired, PageHero, Skeleton } from "@/components/ui";

type Item = { id: number; title: string; description: string | null; icon: string; price: number; stock: number | null; for_class: boolean };
type Order = { id: number; item_title: string; price: number; status: "pending" | "delivered" | "rejected"; created_at: string };

const ORDER_STATUS: Record<Order["status"], { label: string; cls: string }> = {
  pending: { label: "Kutilmoqda", cls: "bg-sand-200 text-sand-400" },
  delivered: { label: "Topshirildi", cls: "bg-leaf-100 text-accent" },
  rejected: { label: "Rad etildi · tanga qaytdi", cls: "bg-coral-100 text-coral-500" },
};

export default function ShopPage() {
  const { user, profile, loading: sessionLoading } = useSession();
  const [supabase] = useState(() => createClient());
  const [items, setItems] = useState<Item[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [ready, setReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [w, it, or] = await Promise.all([
      loadWallet(supabase, profile?.points ?? 0),
      supabase.from("shop_items").select("id, title, description, icon, price, stock, for_class").eq("active", true).order("sort_order").order("price"),
      supabase.from("shop_orders").select("id, item_title, price, status, created_at").eq("student_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]);
    setWallet(w.wallet);
    setReady(w.ready && !it.error);
    setItems((it.data as Item[]) || []);
    setOrders((or.data as Order[]) || []);
    setLoading(false);
  }, [supabase, user, profile?.points]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) setLoading(false);
    else load();
  }, [sessionLoading, user, load]);

  async function buy() {
    if (!buying) return;
    setBusy(true);
    const { error } = await supabase.rpc("buy_shop_item", { p_item: buying.id });
    setBusy(false);
    if (error) {
      const m = error.message || "";
      setMessage({
        text: m.includes("yetarli emas") ? "EcoCoin yetarli emas." : m.includes("tugagan") ? "Afsus, bu mahsulot tugadi." : "Xarid qilib bo‘lmadi. Qayta urinib ko‘ring.",
        error: true,
      });
    } else {
      confetti({ count: 90 });
      setMessage({ text: `✓ “${buying.title}” buyurtma qilindi! Eco Team mukofotni sizga topshiradi.`, error: false });
    }
    setBuying(null);
    load();
  }

  const xp = wallet?.xp ?? profile?.points ?? 0;
  const lvl = levelOf(xp);

  return (
    <>
      <PageHero
        eyebrow="EcoShop"
        tone="sand"
        title={
          <>
            Ballaringizni <span className="text-gradient-anim italic">mukofotga</span> almashtiring
          </>
        }
        text="Har bir tasdiqlangan ish EcoCoin beradi. Tangalarni sarflasangiz ham darajangiz (XP) kamaymaydi."
        emoji="🪙"
      />

      <div className="container-page pb-20">
        {!sessionLoading && !user ? (
          <LoginRequired text="Do‘kondan foydalanish uchun akkauntingizga kiring." />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="relative overflow-hidden rounded-[16px] bg-[#fbf1da] p-5 text-forest-950 ring-1 ring-[#ead6a4]">
                <p className="text-xs font-bold uppercase tracking-wider text-forest-950/60">EcoCoin balansi</p>
                <p className="mt-2 font-display text-4xl font-semibold">🪙 {wallet ? wallet.balance : "…"}</p>
              </div>
              <div className="card p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">Daraja</p>
                <p className="mt-2 text-xl font-extrabold">{lvl.level.icon} {lvl.level.name}</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/[0.06]">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${lvl.progress}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-muted">{xp} XP{lvl.next ? ` · keyingisigacha ${lvl.toNext}` : ""}</p>
              </div>
              <div className="card p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">Qanday topiladi?</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  <Link href="/challenges" className="font-bold text-accent">Challenge</Link>, <Link href="/research" className="font-bold text-accent">tadqiqot</Link> va recycling uchun berilgan har bir ball = 1 EcoCoin.
                </p>
              </div>
            </div>

            {message && (
              <div className="mt-5">
                <Alert tone={message.error ? "error" : "success"} onClose={() => setMessage(null)}>{message.text}</Alert>
              </div>
            )}
            {!loading && !ready && (
              <div className="mt-5">
                <Alert tone="error">Do‘kon hali sozlanmagan. Administrator Supabase’da yangi SQL faylni ishga tushirishi kerak.</Alert>
              </div>
            )}

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {loading ? (
                [0, 1, 2].map((i) => <Skeleton key={i} className="h-48" />)
              ) : items.length === 0 ? (
                <div className="sm:col-span-2 lg:col-span-3"><EmptyState icon="🛍️" title="Do‘kon hozircha bo‘sh" text="Tez orada mukofotlar qo‘shiladi." /></div>
              ) : (
                items.map((it, i) => {
                  const soldOut = it.stock !== null && it.stock <= 0;
                  const afford = (wallet?.balance ?? 0) >= it.price;
                  return (
                    <Reveal key={it.id} delay={Math.min(i, 6) * 60}>
                      <div className="card card-hover flex h-full flex-col p-5">
                        <div className="flex items-start justify-between gap-3">
                          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-sand-100 text-4xl">{it.icon}</span>
                          <div className="flex flex-col items-end gap-1">
                            {it.for_class && <span className="chip bg-sky-100 text-sky-500">Sinf uchun</span>}
                            {it.stock !== null && <span className="text-[11px] font-bold text-muted">{soldOut ? "Tugagan" : `${it.stock} ta qoldi`}</span>}
                          </div>
                        </div>
                        <h3 className="mt-4 text-lg font-extrabold">{it.title}</h3>
                        {it.description && <p className="mt-1 text-sm text-muted">{it.description}</p>}
                        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                          <span className="font-display text-2xl font-semibold text-sand-400">🪙 {it.price}</span>
                          <button
                            onClick={() => setBuying(it)}
                            disabled={soldOut || !afford}
                            className="btn btn-primary btn-sm"
                            title={!afford ? `Yana ${it.price - (wallet?.balance ?? 0)} EcoCoin kerak` : undefined}
                          >
                            {soldOut ? "Tugagan" : afford ? "Olish" : `Yana ${it.price - (wallet?.balance ?? 0)}`}
                          </button>
                        </div>
                      </div>
                    </Reveal>
                  );
                })
              )}
            </div>

            {orders.length > 0 && (
              <section className="card mt-8 p-5 sm:p-7">
                <h2 className="text-xl font-semibold">Buyurtmalarim</h2>
                <div className="mt-4 space-y-2">
                  {orders.map((o) => (
                    <div key={o.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-ink/[0.03] p-3 ring-1 ring-line">
                      <span className="min-w-0 flex-1">
                        <span className="block font-extrabold">{o.item_title}</span>
                        <span className="block text-xs text-muted">{formatDate(o.created_at)} · 🪙 {o.price}</span>
                      </span>
                      <span className={`chip ${ORDER_STATUS[o.status].cls}`}>{ORDER_STATUS[o.status].label}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!buying}
        busy={busy}
        title={buying ? `${buying.icon} ${buying.title}` : ""}
        text={buying ? `${buying.price} EcoCoin sarflanadi. Balansingizda ${(wallet?.balance ?? 0) - buying.price} qoladi. Darajangiz kamaymaydi.` : ""}
        confirmLabel="Ha, olaman"
        onConfirm={buy}
        onCancel={() => setBuying(null)}
      />
    </>
  );
}
