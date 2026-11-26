"use client";

import Image from "next/image";
import { NavIcon } from "@/components/NavIcon";
import { Bell, Menu } from "lucide-react";
import timoImg from "@/public/timo.webp";
import Link from "next/link";
import { useAppPathname } from "@/lib/nav";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase";
import { initials, useSession } from "@/lib/session";
import { Logo } from "@/components/brand";
import { Skeleton } from "@/components/ui";
import Portal from "@/components/Portal";
import EffectsToggle from "@/components/EffectsToggle";

type Counts = { challenges: number; recycling: number; research: number; shop: number; volunteers: number };

const AdminContext = createContext<{ counts: Counts; refreshCounts: () => Promise<void> }>({
  counts: { challenges: 0, recycling: 0, research: 0, shop: 0, volunteers: 0 },
  refreshCounts: async () => {},
});

export const useAdmin = () => useContext(AdminContext);

// mentor: true — eski "mentor" rolidagi foydalanuvchi ham ko'radi (faqat tekshiruv)
const NAV = [
  { href: "/admin", label: "Boshqaruv paneli", icon: "📊", key: null, group: null, mentor: true },
  { href: "/admin/challenges", label: "Challenge topshiriqlari", icon: "🎯", key: "challenges", group: "Tekshiruv", mentor: true },
  { href: "/admin/research", label: "Tadqiqotlar", icon: "📚", key: "research", group: null, mentor: true },
  { href: "/admin/volunteers", label: "Volontyor ishlari", icon: "🤝", key: "volunteers", group: null, mentor: false },
  { href: "/admin/recycling", label: "Recycling kiritish", icon: "♻️", key: "recycling", group: "Kiritish", mentor: true },
  { href: "/admin/batches", label: "Partiyalar va Eco Fund", icon: "🚚", key: null, group: null, mentor: false },
  { href: "/admin/shop", label: "EcoShop buyurtmalar", icon: "🛍️", key: "shop", group: null, mentor: false },
  { href: "/admin/greenflag", label: "Green Flag", icon: "🏳️", key: null, group: "Green Flag", mentor: false },
  { href: "/admin/report", label: "Hisobot (PDF)", icon: "📄", key: null, group: null, mentor: false },
  { href: "/admin/challenge-list", label: "Challenge ro‘yxati", icon: "📝", key: null, group: "Sayt", mentor: false },
  { href: "/admin/events", label: "Tadbirlar", icon: "📅", key: null, group: null, mentor: false },
  { href: "/admin/mentors", label: "Mentorlar", icon: "🎓", key: null, group: null, mentor: false },
  { href: "/admin/students", label: "Foydalanuvchilar", icon: "👥", key: null, group: null, mentor: false },
  { href: "/admin/schools", label: "Maktab va sinflar", icon: "🏫", key: null, group: null, mentor: false },
  { href: "/admin/content", label: "Sahifa matnlari", icon: "✍️", key: null, group: null, mentor: false },
] as const;

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = useAppPathname();
  const { user, profile, isAdmin, isStaff, isOwner, loading } = useSession();
  const [supabase] = useState(() => createClient());
  const [counts, setCounts] = useState<Counts>({ challenges: 0, recycling: 0, research: 0, shop: 0, volunteers: 0 });
  const [menuOpen, setMenuOpen] = useState(false);

  const refreshCounts = useCallback(async () => {
    const pending = (table: string) =>
      supabase.from(table).select("id", { count: "exact", head: true }).eq("status", "pending");
    let recyclingQuery = pending("recycling_submissions");
    if (profile?.school_id) recyclingQuery = recyclingQuery.eq("school_id", profile.school_id);
    const [c, r, t, o, v] = await Promise.all([
      pending("challenge_submissions"),
      recyclingQuery,
      pending("eco_research"),
      isAdmin ? pending("shop_orders") : Promise.resolve({ count: 0 }),
      isAdmin ? pending("volunteer_logs") : Promise.resolve({ count: 0 }),
    ]);
    setCounts({ challenges: c.count ?? 0, recycling: r.count ?? 0, research: t.count ?? 0, shop: o.count ?? 0, volunteers: v.count ?? 0 });
  }, [supabase, profile?.school_id, isAdmin]);

  useEffect(() => {
    if (isStaff) refreshCounts();
  }, [isStaff, refreshCounts]);

  useEffect(() => setMenuOpen(false), [pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <div className="hidden w-72 bg-forest-900 lg:block" />
        <div className="flex-1 space-y-4 p-8">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!user || !isStaff) {
    return (
      <div className="grid min-h-screen place-items-center bg-cream p-6">
        <div className="card max-w-md p-10 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-coral-100 text-3xl">🔒</div>
          <h1 className="mt-5 text-3xl font-semibold">Ruxsat yo‘q</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            {user ? "Bu bo‘lim faqat administrator va mentorlar uchun." : "Admin panelga kirish uchun avval tizimga kiring."}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/" className="btn btn-ghost">Bosh sahifa</Link>
            {!user && <Link href="/login" className="btn btn-primary">Kirish</Link>}
          </div>
        </div>
      </div>
    );
  }

  const total = counts.challenges + counts.recycling + counts.research + counts.volunteers;
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  const nav = NAV.filter((item) => isAdmin || item.mentor);
  const roleLabel = isOwner ? "Bosh admin" : isAdmin ? "Administrator" : "Tekshiruvchi";
  // Mentor sayt sozlamalari sahifasini ochsa (havola orqali) — kirishga ruxsat yo'q
  const blocked = !isAdmin && NAV.some((n) => !n.mentor && isActive(n.href));

  const sidebar = (
    <div className="relative flex min-h-full flex-col">
      <Link href="/admin" className="px-2">
        <Logo light />
      </Link>

      <div className="mt-7 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-xs font-bold text-white/70">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf-400 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-leaf-400" />
        </span>
        {roleLabel} rejimi faol
      </div>

      <p className="mt-7 px-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/35">Boshqaruv</p>
      <nav className="mt-3 space-y-1">
        {nav.map((item) => {
          const active = isActive(item.href);
          const count = item.key ? counts[item.key] : 0;
          return (
            <div key={item.href}>
            {item.group && (
              <p className="mb-2 mt-5 px-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/35">{item.group}</p>
            )}
            <Link
              href={item.href}
              className={`group relative flex items-center gap-3 overflow-hidden rounded-2xl px-3 py-2.5 text-sm font-bold transition-all duration-300 ${
                active
                  ? "bg-white text-[#12302a] shadow-sm"
                  : "text-white/70 hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              <span
                className={`grid h-9 w-9 place-items-center rounded-xl ${
                  active ? "bg-[#e3f1e8] text-[#1f7a45]" : "bg-white/[0.07]"
                }`}
              >
                <NavIcon href={item.href} className="h-[18px] w-[18px]" />
              </span>
              <span className="flex-1">{item.label}</span>
              {count > 0 && (
                <span
                  className={`min-w-6 rounded-full px-2 py-0.5 text-center text-[11px] font-black ${
                    active ? "bg-[#12302a] text-white" : "bg-[#e5533a] text-white"
                  }`}
                >
                  {count}
                </span>
              )}
            </Link>
            </div>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 pt-6">
        {/* Timo yordamchi kartasi */}
        <div className="relative overflow-hidden rounded-2xl bg-white/[0.06] p-4 pr-24 ring-1 ring-white/10">
          <p className="relative text-sm font-extrabold text-white">
            {total > 0 ? `${total} ta ish kutmoqda` : "Hammasi joyida!"}
          </p>
          <p className="relative mt-1 text-xs leading-5 text-white/60">
            {total > 0 ? "O‘quvchilar natijangizni kutishyapti 🌱" : "Ajoyib ish, Eco Team! 🎉"}
          </p>
          <Image
            src={timoImg}
            alt=""
            width={120}
            height={117}
            className="absolute -bottom-3 -right-3 w-24 animate-float drop-shadow-xl"
          />
        </div>

        <Link href="/" className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-white/70 transition hover:bg-white/[0.08] hover:text-white">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.08]">🌐</span>
          Saytga qaytish
        </Link>
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-leaf-300 to-leaf-500 text-sm font-black text-forest-950">
            {initials(profile?.full_name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-white">{profile?.full_name || "Admin"}</p>
            <p className="text-xs text-white/45">{roleLabel}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const asideClass =
    "overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:rgb(255_255_255/0.18)_transparent] bg-[linear-gradient(180deg,#16352f_0%,#0e231f_100%)] p-5";
  const current = NAV.find((n) => isActive(n.href));

  return (
    <AdminContext.Provider value={{ counts, refreshCounts }}>
      <div className="flex min-h-screen bg-cream">
        <aside className={`fixed inset-y-0 left-0 z-40 hidden w-72 lg:block ${asideClass}`}>
          {sidebar}
        </aside>

        {menuOpen && (
          <Portal>
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-[#0c1f1b]/40" onClick={() => setMenuOpen(false)} />
            <aside className={`absolute inset-y-0 left-0 w-72 animate-rise ${asideClass}`}>{sidebar}</aside>
          </div>
          </Portal>
        )}

        <div className="relative flex min-w-0 flex-1 flex-col lg:pl-72">
          {/* Fon bezaklari */}

          <header className="sticky top-0 z-30 flex h-[68px] items-center gap-3 border-b border-line bg-white/85 px-4 backdrop-blur-xl sm:px-8">
            <button
              onClick={() => setMenuOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface shadow-sm lg:hidden"
              aria-label="Menyu"
            >
              <Menu className="h-5 w-5" strokeWidth={1.8} />
            </button>
            <div className="hidden items-center gap-2 text-sm font-bold text-muted sm:flex">
              <span>{roleLabel}</span>
              <span className="text-line">/</span>
              <span className="text-ink">{current?.label ?? "Panel"}</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <EffectsToggle />
              <span
                className={`hidden items-center gap-2 rounded-full px-3.5 py-2 text-xs font-extrabold sm:flex ${
                  total > 0 ? "bg-coral-100 text-coral-500" : "bg-leaf-100 text-accent"
                }`}
              >
                {total > 0 ? (
                  <>
                    <span className="h-2 w-2 animate-pulse rounded-full bg-coral-500" />
                    {total} ta tekshiruv kutmoqda
                  </>
                ) : (
                  "✓ Navbat bo‘sh"
                )}
              </span>
              <Link
                href={counts.challenges ? "/admin/challenges" : counts.recycling ? "/admin/recycling" : "/admin/research"}
                className="relative grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-lg shadow-sm transition hover:-translate-y-0.5"
                aria-label="Bildirishnomalar"
              >
                <Bell className="h-[18px] w-[18px] text-ink/70" strokeWidth={1.8} />
                {total > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-coral-500 px-1 text-[10px] font-black text-white ring-2 ring-cream">
                    {total}
                  </span>
                )}
              </Link>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#16352f] text-xs font-bold text-white shadow-sm">
                {initials(profile?.full_name)}
              </span>
            </div>
          </header>
          <main className="relative flex-1 px-4 py-6 sm:px-8 sm:py-8">
            {blocked ? (
              <div className="card mx-auto mt-10 max-w-md p-10 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-coral-100 text-3xl">🔒</div>
                <h1 className="mt-5 text-2xl font-semibold">Bu bo‘lim faqat admin uchun</h1>
                <p className="mt-2 text-sm leading-6 text-muted">Siz faqat topshiriqlarni tekshirishingiz mumkin.</p>
                <Link href="/admin" className="btn btn-primary mt-6">Boshqaruv paneli</Link>
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}

export function AdminTitle({
  title,
  text,
  action,
  icon,
}: {
  title: string;
  text?: string;
  action?: ReactNode;
  icon?: string;
}) {
  return (
    <div className="relative mb-7 overflow-hidden rounded-[18px] bg-gradient-to-br from-[#16352f] to-[#0f2520] p-6 text-white shadow-[var(--shadow-lift)] sm:p-8">
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {icon && (
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/10 text-3xl ring-1 ring-white/15">
              {icon}
            </span>
          )}
          <div>
            <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
            {text && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-white/65">{text}</p>}
          </div>
        </div>
        {action}
      </div>
    </div>
  );
}

export function Lightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [src, onClose]);
  if (!src) return null;
  return (
    <Portal>
    <div className="fixed inset-0 z-[110] grid place-items-center bg-black/85 p-4" onClick={onClose}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Dalil rasmi" className="max-h-[90vh] max-w-full rounded-2xl object-contain" />
      <button className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white" aria-label="Yopish">
        ✕
      </button>
    </div>
    </Portal>
  );
}
