"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { initials, useSession } from "@/lib/session";
import { Logo } from "./brand";

export default function SiteHeader() {
  const { user, profile, loading } = useSession();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

        <div className="flex items-center gap-2">
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
              <span>{profile?.points ?? 0} ball</span>
            </Link>
          ) : (
            <Link href="/login" className="btn btn-primary btn-sm">
              Kirish
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
