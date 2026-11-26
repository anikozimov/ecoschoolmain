import { Emblem } from "./Emblem";

export const NAV = [
  { href: "/challenges", label: "Challenge'lar", icon: "🎯" },
  { href: "/timo", label: "Timo bog‘i", icon: "🐢" },
  { href: "/recycling", label: "Recycling", icon: "♻️" },
  { href: "/research", label: "Tadqiqotlar", icon: "📚" },
  { href: "/leaderboard", label: "Reyting", icon: "🏆" },
  { href: "/league", label: "Eco Liga", icon: "🏅" },
  { href: "/shop", label: "EcoShop", icon: "🛍️" },
  { href: "/impact", label: "Natijalar", icon: "🌍" },
  { href: "/green-flag", label: "Green Flag", icon: "🏳️" },
  { href: "/calendar", label: "Taqvim", icon: "📅" },
  { href: "/volunteer", label: "Volontyorlar", icon: "🤝" },
  { href: "/mentors", label: "Mentorlar", icon: "🎓" },
];

export const TELEGRAM_URL = "https://t.me/ecofutureandijan";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="group/logo flex items-center gap-2.5">
      <Emblem variant="mini" className="h-11 w-11 shrink-0 drop-shadow-[0_6px_14px_rgb(31_95_62/0.55)] transition-transform duration-500 group-hover/logo:rotate-[-8deg] group-hover/logo:scale-105" />
      <span className="leading-none">
        <span className={`block font-display text-lg font-bold tracking-tight ${light ? "text-white" : "text-accent"}`}>
          ECO SCHOOL
        </span>
        <span className={`mt-1 block text-[9px] font-extrabold tracking-[0.22em] ${light ? "text-leaf-300" : "text-accent"}`}>
          MEASURE · ACT · IMPROVE
        </span>
      </span>
    </span>
  );
}

