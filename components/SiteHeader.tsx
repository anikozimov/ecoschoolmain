"use client";

import Link from "next/link";
import { useAppPathname } from "@/lib/nav";
import { useEffect, useState } from "react";
import { initials, useSession } from "@/lib/session";
import { Logo, NAV, TELEGRAM_URL } from "./brand";
import Portal from "./Portal";

export default function SiteHeader() {
  const pathname = useAppPathname();
  const { user, profile, isAdmin, isStaff, loading } = useSession();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? "border-b border-line/80 bg-cream/85 backdrop-blur-xl" : "bg-transparent"
      }`}
    >
      <div className="container-page flex h-[72px] items-center justify-between gap-4">
        <Link href="/" aria-label="ECO SCHOOL bosh sahifa">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-line/80 bg-white/[0.06] p-1 backdrop-blur lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-3.5 py-2 text-sm font-bold transition ${
                isActive(item.href)
                  ? "bg-glow text-forest-950"
                  : "text-muted hover:bg-leaf-100 hover:text-accent"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isStaff && (
            <Link href="/admin" className="btn btn-lime btn-sm hidden sm:inline-flex">
              ⚙️ {isAdmin ? "Admin" : "Mentor"}
            </Link>
          )}
          {loading ? (
            <span className="h-10 w-24 animate-pulse rounded-full bg-line/70" />
          ) : user ? (
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-sm font-bold transition hover:border-forest-500/40"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-leaf-300 text-xs font-black text-forest-950">
                {initials(profile?.full_name)}
              </span>
              <span className="hidden sm:inline">{profile?.points ?? 0} ball</span>
            </Link>
          ) : (
            <Link href="/login" className="btn btn-primary btn-sm">
              Kirish
            </Link>
          )}

          <button
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface lg:hidden"
            aria-label="Menyu"
            aria-expanded={open}
          >
            <span className="relative block h-3 w-4">
              <span className={`absolute left-0 h-0.5 w-4 rounded bg-ink transition ${open ? "top-1.5 rotate-45" : "top-0"}`} />
              <span className={`absolute left-0 top-1.5 h-0.5 w-4 rounded bg-ink transition ${open ? "opacity-0" : ""}`} />
              <span className={`absolute left-0 h-0.5 w-4 rounded bg-ink transition ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
            </span>
          </button>
        </div>
      </div>

      {/* Mobil menyu */}
      {open && (
<Portal>
        <div className="fixed inset-x-0 bottom-0 top-[72px] z-[60] overflow-y-auto bg-cream px-5 pb-10 pt-4 lg:hidden animate-rise">
          <div className="grid grid-cols-2 gap-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`card flex flex-col gap-3 p-4 ${isActive(item.href) ? "ring-2 ring-forest-500" : ""}`}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="font-bold">{item.label}</span>
              </Link>
            ))}
            <Link href="/class-leaderboard" className="card flex flex-col gap-3 p-4">
              <span className="text-2xl">🏫</span>
              <span className="font-bold">Sinflar bellashuvi</span>
            </Link>
            <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="card flex flex-col gap-3 p-4">
              <span className="text-2xl">✈️</span>
              <span className="font-bold">Telegram</span>
            </a>
          </div>
          {isStaff && (
            <Link href="/admin" className="btn btn-lime mt-4 w-full">
              ⚙️ {isAdmin ? "Admin panel" : "Mentor paneli"}
            </Link>
          )}
        </div>
        </Portal>
      )}
    </header>
  );
}
