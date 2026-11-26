"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { useAppPathname } from "@/lib/nav";
import { useSession } from "@/lib/session";
import { NAV, TELEGRAM_URL } from "./brand";
import { NavIcon } from "./NavIcon";
import Portal from "./Portal";
import EffectsToggle from "./EffectsToggle";

/**
 * Pastki suzuvchi menyu (ilovalardagidek).
 *  - Kompyuter: barcha bo'limlar, sichqoncha ustida "magnit" kattalashish (Dock effekti)
 *  - Telefon: 4 asosiy bo'lim + "Ko'proq" varag'i; pastga aylantirganda yashirinadi
 *  - Faol bo'lim ostida sirpanuvchi yorug' belgi, bosilganda to'lqin
 */
const HOME = { href: "/", label: "Bosh sahifa", short: "Bosh", icon: "🏠" };
const MOBILE_MAIN = ["/challenges", "/timo", "/leaderboard"];
const SHORT: Record<string, string> = {
  "/challenges": "Challenge",
  "/recycling": "Recycling",
  "/research": "Tadqiqot",
  "/leaderboard": "Reyting",
  "/impact": "Natijalar",
  "/calendar": "Taqvim",
  "/mentors": "Mentorlar",
  "/league": "Liga",
  "/shop": "Do‘kon",
  "/green-flag": "Green Flag",
  "/game": "O‘yin",
  "/timo": "Timo",
  "/volunteer": "Volontyor",
};

function shortLabel(href: string, label: string) {
  return href === "/" ? HOME.short : SHORT[href] ?? label;
}

function ripple(e: MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const dot = document.createElement("span");
  dot.className = "dock-ripple";
  dot.style.left = `${e.clientX - r.left}px`;
  dot.style.top = `${e.clientY - r.top}px`;
  el.appendChild(dot);
  window.setTimeout(() => dot.remove(), 600);
}

export default function BottomDock() {
  const pathname = useAppPathname();
  const { isAdmin, isStaff } = useSession();
  const [more, setMore] = useState(false);
  const [hidden, setHidden] = useState(false);
  const deskRef = useRef<HTMLDivElement>(null);
  const mobRef = useRef<HTMLDivElement>(null);

  const isActive = useCallback(
    (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/")),
    [pathname]
  );

  useEffect(() => setMore(false), [pathname]);

  // Pastga aylantirganda yashirish, yuqoriga — ko'rsatish (kadrga bir marta)
  useEffect(() => {
    let lastY = window.scrollY;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        const nearEnd = window.innerHeight + y > document.documentElement.scrollHeight - 80;
        if (Math.abs(y - lastY) > 6) setHidden(y > lastY && y > 160 && !nearEnd);
        lastY = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = more ? "hidden" : "";
    if (!more) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMore(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [more]);

  // Sirpanuvchi belgini faol tugma ostiga joylash
  useLayoutEffect(() => {
    const place = () => {
      for (const box of [deskRef.current, mobRef.current]) {
        if (!box) continue;
        const active = box.querySelector<HTMLElement>("[data-active='true']");
        if (!active) {
          box.style.setProperty("--ind-o", "0");
          continue;
        }
        box.style.setProperty("--ind-x", `${active.offsetLeft}px`);
        box.style.setProperty("--ind-w", `${active.offsetWidth}px`);
        box.style.setProperty("--ind-o", "1");
      }
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [pathname, more]);

  const mobileMain = [HOME, ...NAV.filter((n) => MOBILE_MAIN.includes(n.href))];
  const mobileRest = NAV.filter((n) => !MOBILE_MAIN.includes(n.href));
  const moreActive = mobileRest.some((n) => isActive(n.href)) || pathname.startsWith("/class-leaderboard");

  return (
    <>
      {/* ── Kompyuter: Dock ── */}
      <nav
        aria-label="Asosiy menyu"
        className={`dock-wrap fixed bottom-5 left-1/2 z-50 hidden -translate-x-1/2 transition-transform duration-500 lg:block ${
          hidden ? "translate-y-[140%]" : ""
        }`}
      >
        <div ref={deskRef} className="dock relative flex items-end gap-1 rounded-[1.6rem] p-1.5">
          <span className="dock-indicator" aria-hidden />
          {[HOME, ...NAV].map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={ripple}
                data-active={active}
                aria-current={active ? "page" : undefined}
                className="dock-item group relative flex flex-col items-center gap-0.5 rounded-2xl px-3 pb-1.5 pt-2"
              >
                <span className="dock-icon leading-none"><NavIcon href={item.href} className="h-[21px] w-[21px]" /></span>
                <span className={`whitespace-nowrap text-[11px] font-semibold ${active ? "text-white" : "text-ink/70 group-hover:text-ink"}`}>
                  {shortLabel(item.href, item.label)}
                </span>
                <span className="dock-tip">{item.label}</span>
              </Link>
            );
          })}
          {isStaff && (
            <>
              <span className="mx-1 mb-2 h-8 w-px self-center bg-ink/15" aria-hidden />
              <Link href="/admin" onClick={ripple} className="dock-item group relative flex flex-col items-center gap-0.5 rounded-2xl px-3 pb-1.5 pt-2">
                <span className="dock-icon leading-none text-accent"><NavIcon href="admin" className="h-[21px] w-[21px]" /></span>
                <span className="text-[11px] font-semibold text-accent">{isAdmin ? "Admin" : "Panel"}</span>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Telefon: tab bar ── */}
      <nav
        aria-label="Asosiy menyu"
        className={`fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 transition-transform duration-500 lg:hidden ${
          hidden && !more ? "translate-y-[150%]" : ""
        }`}
      >
        <div ref={mobRef} className="dock relative grid grid-cols-5 rounded-[1.6rem] p-1.5">
          <span className="dock-indicator" aria-hidden />
          {mobileMain.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={ripple}
                data-active={active}
                aria-current={active ? "page" : undefined}
                className="tab-item relative flex flex-col items-center gap-0.5 overflow-hidden rounded-2xl py-2"
              >
                <span className={`tab-icon leading-none ${active ? "text-white" : "text-ink/75"}`}><NavIcon href={item.href} className="h-[22px] w-[22px]" /></span>
                <span className={`text-[10.5px] font-semibold ${active ? "text-white" : "text-ink/65"}`}>
                  {shortLabel(item.href, item.label)}
                </span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={(e) => {
              ripple(e);
              setMore((v) => !v);
            }}
            data-active={moreActive && !more}
            aria-expanded={more}
            aria-label="Boshqa bo‘limlar"
            className="tab-item relative flex flex-col items-center gap-0.5 overflow-hidden rounded-2xl py-2"
          >
            <span className={`tab-icon grid h-[22px] place-items-center transition-transform duration-300 ${moreActive && !more ? "text-white" : "text-ink/75"} ${more ? "rotate-45" : ""}`}>
              <span className="relative block h-4 w-4">
                <span className="absolute left-0 top-[7px] h-0.5 w-4 rounded bg-current" />
                <span className="absolute left-[7px] top-0 h-4 w-0.5 rounded bg-current" />
              </span>
            </span>
            <span className={`text-[10.5px] font-semibold ${moreActive && !more ? "text-white" : "text-ink/65"}`}>Ko‘proq</span>
          </button>
        </div>
      </nav>

      {/* Telefon: "Ko'proq" varag'i */}
      {more && (
        <Portal>
          <div className="fixed inset-0 z-[45] lg:hidden" onClick={() => setMore(false)}>
            <div className="absolute inset-0 bg-[#0c1f1b]/35 animate-[fade-in_0.25s_ease]" />
            <div
              className="sheet absolute inset-x-3 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+5.25rem)] rounded-[1.75rem] p-4"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="Boshqa bo‘limlar"
            >
              <div className="grid grid-cols-3 gap-2.5">
                {[...mobileRest, { href: "/class-leaderboard", label: "Sinflar bellashuvi", icon: "🏫" }].map((item, i) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={ripple}
                      style={{ animationDelay: `${i * 35}ms` }}
                      className={`sheet-item relative flex flex-col items-center gap-1.5 overflow-hidden rounded-2xl px-2 py-3.5 text-center ${
                        active ? "bg-accent text-white" : "bg-cream ring-1 ring-line"
                      }`}
                    >
                      <NavIcon href={item.href} className="h-6 w-6" />
                      <span className="text-xs font-semibold leading-tight">{SHORT[item.href] ?? item.label}</span>
                    </Link>
                  );
                })}
                <a
                  href={TELEGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ animationDelay: `${(mobileRest.length + 1) * 35}ms` }}
                  className="sheet-item flex flex-col items-center gap-1.5 rounded-2xl bg-cream px-2 py-3.5 text-center ring-1 ring-line"
                >
                  <NavIcon href="telegram" className="h-6 w-6" />
                  <span className="text-xs font-semibold">Telegram</span>
                </a>
              </div>
              <EffectsToggle variant="row" className="mt-3" />
              {isStaff && (
                <Link href="/admin" className="btn btn-lime mt-3 w-full">
                  <NavIcon href="admin" className="h-4 w-4" /> {isAdmin ? "Admin panel" : "Tekshiruv paneli"}
                </Link>
              )}
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
