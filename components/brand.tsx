export const NAV = [
  { href: "/challenges", label: "Challenge'lar", icon: "🎯" },
  { href: "/recycling", label: "Recycling", icon: "♻️" },
  { href: "/research", label: "Tadqiqotlar", icon: "📚" },
  { href: "/leaderboard", label: "Reyting", icon: "🏆" },
  { href: "/impact", label: "Natijalar", icon: "🌍" },
  { href: "/calendar", label: "Taqvim", icon: "📅" },
];

export const TELEGRAM_URL = "https://t.me/ecofutureandijan";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="group/logo flex items-center gap-2.5">
      <span className="relative grid h-10 w-10 place-items-center rounded-2xl bg-forest-700 text-lg shadow-[0_6px_14px_-6px_rgb(31_95_62/0.8)]">
        <span className="absolute -right-1 -top-1 h-3.5 w-3.5 animate-pulse rounded-full border-2 border-cream bg-leaf-400" />
        <span className="inline-block origin-bottom transition-transform duration-500 group-hover/logo:rotate-[-14deg] group-hover/logo:scale-110">🌱</span>
      </span>
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

