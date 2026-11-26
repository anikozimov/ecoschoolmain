import Link from "next/link";

export type PodiumItem = { key: string; title: string; subtitle: string; points: number; highlight?: boolean };

const medals = ["🥇", "🥈", "🥉"];
const heights = ["h-36 sm:h-44", "h-28 sm:h-32", "h-20 sm:h-24"];
const colors = [
  "bg-gradient-to-b from-[#f6d98a] to-[#e9b949] text-forest-950",
  "bg-gradient-to-b from-[#e3e7e1] to-[#c9cfc7] text-forest-950",
  "bg-gradient-to-b from-[#f0c9a6] to-[#d9a47a] text-forest-950",
];

export function Podium({ items, initialsOf }: { items: PodiumItem[]; initialsOf?: (t: string) => string }) {
  // Tartib: 2-o‘rin, 1-o‘rin, 3-o‘rin
  const order = [1, 0, 2].filter((i) => items[i]);
  return (
    <div className="mx-auto grid max-w-2xl grid-cols-3 items-end gap-2 sm:gap-4">
      {order.map((i) => {
        const item = items[i];
        return (
          <div key={item.key} className="flex flex-col items-center text-center animate-rise" style={{ animationDelay: `${i * 120}ms` }}>
            <div className={`relative grid place-items-center rounded-full bg-surface font-display font-semibold shadow-[var(--shadow-lift)] ring-4 ${
              i === 0 ? "h-20 w-20 text-2xl ring-sand-400 sm:h-24 sm:w-24" : "h-16 w-16 text-xl ring-white sm:h-20 sm:w-20"
            } ${item.highlight ? "ring-leaf-400" : ""}`}>
              {initialsOf ? initialsOf(item.title) : item.title}
              <span className="absolute -bottom-2 text-2xl">{medals[i]}</span>
            </div>
            <p className="mt-4 line-clamp-1 w-full px-1 text-sm font-extrabold sm:text-base">{item.title}</p>
            <p className="line-clamp-1 text-xs text-muted">{item.subtitle}</p>
            <div className={`mt-3 flex w-full flex-col items-center justify-start rounded-t-2xl pt-3 ${heights[i]} ${colors[i]}`}>
              <span className="font-display text-xl font-semibold sm:text-2xl">{item.points.toLocaleString("uz-UZ")}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">ball</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function LeaderboardSwitch({ active }: { active: "students" | "classes" }) {
  return (
    <div className="inline-flex rounded-full border border-line bg-surface p-1">
      <Link
        href="/leaderboard"
        className={`rounded-full px-4 py-2 text-sm font-bold transition ${
          active === "students" ? "bg-glow text-forest-950" : "text-muted hover:text-ink"
        }`}
      >
        👤 O‘quvchilar
      </Link>
      <Link
        href="/class-leaderboard"
        className={`rounded-full px-4 py-2 text-sm font-bold transition ${
          active === "classes" ? "bg-glow text-forest-950" : "text-muted hover:text-ink"
        }`}
      >
        🏫 Sinflar
      </Link>
    </div>
  );
}
