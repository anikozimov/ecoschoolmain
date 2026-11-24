"use client";

/**
 * DEMO REJIM uchun bitta sahifali ilova: claude.ai havolasida sahifalar
 * `#/yo'l` orqali almashadi. Haqiqiy saytda ishlatilmaydi.
 */
import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { hashPath, navigate } from "@/lib/nav";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { ScrollProgress } from "@/components/effects";
import AdminShell from "@/components/admin/AdminShell";

import Home from "@/app/(site)/page";
import Challenges from "@/app/(site)/challenges/page";
import Recycling from "@/app/(site)/recycling/page";
import Research from "@/app/(site)/research/page";
import Leaderboard from "@/app/(site)/leaderboard/page";
import ClassLeaderboard from "@/app/(site)/class-leaderboard/page";
import Impact from "@/app/(site)/impact/page";
import Calendar from "@/app/(site)/calendar/page";
import Profile from "@/app/(site)/profile/page";
import Login from "@/app/login/page";
import AdminHome from "@/app/admin/page";
import AdminChallenges from "@/app/admin/challenges/page";
import AdminRecycling from "@/app/admin/recycling/page";
import AdminResearch from "@/app/admin/research/page";
import AdminEvents from "@/app/admin/events/page";
import AdminChallengeList from "@/app/admin/challenge-list/page";
import AdminStudents from "@/app/admin/students/page";
import AdminContent from "@/app/admin/content/page";
import AdminSchools from "@/app/admin/schools/page";

const SITE: Record<string, ComponentType> = {
  "/": Home,
  "/challenges": Challenges,
  "/recycling": Recycling,
  "/research": Research,
  "/leaderboard": Leaderboard,
  "/class-leaderboard": ClassLeaderboard,
  "/impact": Impact,
  "/calendar": Calendar,
  "/profile": Profile,
};
const ADMIN: Record<string, ComponentType> = {
  "/admin": AdminHome,
  "/admin/challenges": AdminChallenges,
  "/admin/recycling": AdminRecycling,
  "/recycling-admin": AdminRecycling,
  "/admin/research": AdminResearch,
  "/admin/events": AdminEvents,
  "/admin/challenge-list": AdminChallengeList,
  "/admin/students": AdminStudents,
  "/admin/content": AdminContent,
  "/admin/schools": AdminSchools,
};

export default function DemoApp() {
  const [path, setPath] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setPath(hashPath().replace(/\/+$/, "") || "/");
    update();
    window.addEventListener("hashchange", update);

    // Ichki havolalarni (/challenges) hash navigatsiyaga aylantiramiz
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      const href = a?.getAttribute("href");
      if (!a || !href || a.target === "_blank" || !href.startsWith("/")) return;
      e.preventDefault();
      e.stopPropagation();
      navigate(href);
    };
    window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("hashchange", update);
      window.removeEventListener("click", onClick, true);
    };
  }, []);

  if (path === null) return <div className="min-h-screen" />;

  if (path === "/login") return <Login key={path} />;

  const AdminPage = ADMIN[path];
  if (AdminPage) {
    return (
      <AdminShell>
        <div className="page-enter" key={path}>
          <AdminPage />
        </div>
      </AdminShell>
    );
  }

  const Page = SITE[path] ?? Home;
  return (
    <>
      <ScrollProgress />
      <SiteHeader />
      <main className="flex-1">
        <div className="page-enter" key={path}>
          <Page />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
