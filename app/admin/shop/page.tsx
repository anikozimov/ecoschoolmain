"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createClient } from "@/lib/supabase";
import { formatDate } from "@/lib/session";
import { AdminTitle, useAdmin } from "@/components/admin/AdminShell";
import { Alert, CardsSkeleton, ConfirmDialog, EmptyState, Modal, Spinner, Tabs } from "@/components/ui";

type Item = { id: number; title: string; description: string | null; icon: string; price: number; stock: number | null; for_class: boolean; active: boolean; sort_order: number };
type Order = { id: number; item_title: string; price: number; status: "pending" | "delivered" | "rejected"; created_at: string; profiles: { full_name: string; class_name: string | null } | null };
type Tab = "orders" | "items";
type Draft = { id?: number; title: string; description: string; icon: string; price: string; stock: string; for_class: boolean; active: boolean };

const EMPTY: Draft = { title: "", description: "", icon: "🎁", price: "100", stock: "", for_class: false, active: true };
const ICONS = ["🎁", "🏅", "🐢", "📒", "📚", "🌱", "🏆", "🎒", "✏️", "🧢", "👕", "🍎", "🎟️", "🌳"];

export default function AdminShopPage() {
  const [supabase] = useState(() => createClient());
  const [tab, setTab] = useState<Tab>("orders");
  const [items, setItems] = useState<Item[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<{ order: Order; status: "delivered" | "rejected" } | null>(null);
  const [toDelete, setToDelete] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);
  const { refreshCounts } = useAdmin();

  const load = useCallback(async () => {
    const [it, or] = await Promise.all([
      supabase.from("shop_items").select("id, title, description, icon, price, stock, for_class, active, sort_order").order("sort_order").order("price"),
      supabase
        .from("shop_orders")
        .select("id, item_title, price, status, created_at, profiles!shop_orders_student_id_fkey (full_name, class_name)")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    if (it.error) {
      console.error(it.error);
      setMissing(true);
      setLoading(false);
      return;
    }
    setMissing(false);
    setItems((it.data as Item[]) || []);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setOrders(((or.data as any[]) || []).map((o) => ({ ...o, profiles: Array.isArray(o.profiles) ? o.profiles[0] ?? null : o.profiles })));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  function open(it?: Item) {
    setFormError("");
    setEditing(
      it
        ? { id: it.id, title: it.title, description: it.description ?? "", icon: it.icon, price: String(it.price), stock: it.stock === null ? "" : String(it.stock), for_class: it.for_class, active: it.active }
        : { ...EMPTY }
    );
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const price = Math.round(Number(editing.price));
    const stock = editing.stock.trim() === "" ? null : Math.round(Number(editing.stock));
    if (editing.title.trim().length < 2) return setFormError("Nomini kiriting.");
    if (!Number.isFinite(price) || price < 1 || price > 100000) return setFormError("Narx 1 dan 100 000 gacha bo‘lsin.");
    if (stock !== null && (!Number.isFinite(stock) || stock < 0)) return setFormError("Qoldiq 0 yoki undan katta bo‘lsin (cheksiz bo‘lsa bo‘sh qoldiring).");
    setSaving(true);
    const row = { title: editing.title.trim(), description: editing.description.trim() || null, icon: editing.icon, price, stock, for_class: editing.for_class, active: editing.active };
    const { error } = editing.id
      ? await supabase.from("shop_items").update(row).eq("id", editing.id)
      : await supabase.from("shop_items").insert({ ...row, sort_order: items.length + 1 });
    setSaving(false);
    if (error) {
      console.error(error);
      return setFormError("Saqlab bo‘lmadi.");
    }
    setMessage({ text: `✓ “${row.title}” saqlandi.`, error: false });
    setEditing(null);
    load();
  }

  async function handleOrder() {
    if (!action) return;
    setBusy(true);
    const { data, error } = await supabase.from("shop_orders").update({ status: action.status }).eq("id", action.order.id).eq("status", "pending").select("id");
    setBusy(false);
    if (error || !data?.length) setMessage({ text: "Holatni o‘zgartirib bo‘lmadi.", error: true });
    else setMessage({ text: action.status === "delivered" ? "✓ Mukofot topshirildi deb belgilandi." : "Buyurtma rad etildi, tangalar o‘quvchiga qaytdi.", error: false });
    setAction(null);
    load();
    refreshCounts();
  }

  async function removeItem() {
    if (!toDelete) return;
    setBusy(true);
    const { error } = await supabase.from("shop_items").delete().eq("id", toDelete.id);
    setBusy(false);
    setMessage(error ? { text: "O‘chirib bo‘lmadi.", error: true } : { text: "Mahsulot o‘chirildi. Eski buyurtmalar saqlanib qoladi.", error: false });
    setToDelete(null);
    load();
  }

  const pending = orders.filter((o) => o.status === "pending");

  if (missing) {
    return (
      <>
        <AdminTitle icon="🛍️" title="EcoShop" text="Mukofotlar do‘koni" />
        <Alert tone="error">Avval Supabase’da <b>20261126_eco_platform.sql</b> faylini ishga tushiring, so‘ng sahifani yangilang.</Alert>
      </>
    );
  }

  return (
    <>
      <AdminTitle
        icon="🛍️"
        title="EcoShop"
        text="O‘quvchilar EcoCoin evaziga mukofot oladi. Buyurtmani topshirgach “Topshirildi” ni bosing; rad etilsa tanga qaytadi."
        action={<button onClick={() => open()} className="btn btn-lime">+ Mahsulot qo‘shish</button>}
      />
      {message && <div className="mb-5"><Alert tone={message.error ? "error" : "success"} onClose={() => setMessage(null)}>{message.text}</Alert></div>}

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        items={[
          { value: "orders", label: "Buyurtmalar", count: pending.length },
          { value: "items", label: "Mahsulotlar", count: items.length },
        ]}
      />

      <div className="mt-5">
        {loading ? (
          <CardsSkeleton count={3} className="h-20" />
        ) : tab === "orders" ? (
          orders.length === 0 ? (
            <EmptyState icon="🧾" title="Hali buyurtma yo‘q" />
          ) : (
            <div className="space-y-2">
              {orders.map((o) => (
                <div key={o.id} className="card flex flex-wrap items-center gap-3 p-4">
                  <span className="min-w-0 flex-1">
                    <span className="block font-extrabold">{o.item_title} · 🪙 {o.price}</span>
                    <span className="block text-xs text-muted">
                      {o.profiles?.full_name || "O‘quvchi"} · {o.profiles?.class_name || "—"} · {formatDate(o.created_at, true)}
                    </span>
                  </span>
                  {o.status === "pending" ? (
                    <>
                      <button onClick={() => setAction({ order: o, status: "rejected" })} className="btn btn-danger btn-sm">Rad etish</button>
                      <button onClick={() => setAction({ order: o, status: "delivered" })} className="btn btn-primary btn-sm">Topshirildi</button>
                    </>
                  ) : (
                    <span className={`chip ${o.status === "delivered" ? "bg-leaf-100 text-accent" : "bg-coral-100 text-coral-500"}`}>
                      {o.status === "delivered" ? "Topshirilgan" : "Rad etilgan"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )
        ) : items.length === 0 ? (
          <EmptyState icon="🎁" title="Mahsulot yo‘q" action={<button onClick={() => open()} className="btn btn-primary">+ Mahsulot qo‘shish</button>} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((it) => (
              <div key={it.id} className={`card flex items-center gap-4 p-4 ${it.active ? "" : "opacity-55"}`}>
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-sand-100 text-3xl">{it.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-extrabold">{it.title}</span>
                  <span className="block text-xs text-muted">
                    🪙 {it.price} · {it.stock === null ? "cheksiz" : `${it.stock} ta qoldi`}{it.for_class ? " · sinf uchun" : ""}{it.active ? "" : " · yashirin"}
                  </span>
                </span>
                <button onClick={() => open(it)} className="grid h-9 w-9 place-items-center rounded-lg border border-line" aria-label="Tahrirlash">✏️</button>
                <button onClick={() => setToDelete(it)} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-coral-500" aria-label="O‘chirish">🗑</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!editing} onClose={() => !saving && setEditing(null)} title={editing?.id ? "Mahsulotni tahrirlash" : "Yangi mahsulot"}>
        {editing && (
          <form onSubmit={save} className="space-y-4">
            <div>
              <p className="label">Belgi</p>
              <div className="flex flex-wrap gap-2">
                {ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setEditing({ ...editing, icon: ic })}
                    className={`grid h-11 w-11 place-items-center rounded-xl text-2xl ring-1 ${editing.icon === ic ? "bg-glow ring-transparent" : "bg-surface ring-line"}`}
                    aria-label={`Belgi ${ic}`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label" htmlFor="sh-title">Nomi</label>
              <input id="sh-title" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} maxLength={80} className="input" required />
            </div>
            <div>
              <label className="label" htmlFor="sh-desc">Izoh <span className="font-normal text-muted">(ixtiyoriy)</span></label>
              <input id="sh-desc" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} maxLength={300} className="input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="sh-price">Narx (EcoCoin)</label>
                <input id="sh-price" type="number" min="1" max="100000" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} className="input" required />
              </div>
              <div>
                <label className="label" htmlFor="sh-stock">Qoldiq</label>
                <input id="sh-stock" type="number" min="0" value={editing.stock} onChange={(e) => setEditing({ ...editing, stock: e.target.value })} placeholder="Cheksiz" className="input" />
              </div>
            </div>
            <label className="flex items-center gap-3 text-sm font-bold">
              <input type="checkbox" checked={editing.for_class} onChange={(e) => setEditing({ ...editing, for_class: e.target.checked })} className="h-5 w-5 accent-[#b4f07f]" />
              Sinf uchun mukofot
            </label>
            <label className="flex items-center gap-3 text-sm font-bold">
              <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} className="h-5 w-5 accent-[#b4f07f]" />
              Do‘konda ko‘rinsin
            </label>
            {formError && <Alert tone="error">{formError}</Alert>}
            <div className="flex justify-end gap-3 border-t border-line pt-4">
              <button type="button" onClick={() => setEditing(null)} className="btn btn-ghost">Bekor qilish</button>
              <button type="submit" disabled={saving} className="btn btn-primary">{saving && <Spinner />}Saqlash</button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!action}
        busy={busy}
        tone={action?.status === "rejected" ? "danger" : "primary"}
        title={action?.status === "delivered" ? "Mukofot topshirildimi?" : "Buyurtmani rad etasizmi?"}
        text={action ? `${action.order.profiles?.full_name || "O‘quvchi"} · ${action.order.item_title}${action.status === "rejected" ? ` — ${action.order.price} EcoCoin qaytariladi.` : ""}` : ""}
        confirmLabel="Ha"
        onConfirm={handleOrder}
        onCancel={() => setAction(null)}
      />
      <ConfirmDialog
        open={!!toDelete}
        busy={busy}
        tone="danger"
        title="Mahsulotni o‘chirasizmi?"
        text={toDelete ? `“${toDelete.title}” do‘kondan olib tashlanadi. Vaqtincha yashirish uchun “Do‘konda ko‘rinsin” belgisini olib tashlang.` : ""}
        confirmLabel="Ha, o‘chirish"
        onConfirm={removeItem}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
