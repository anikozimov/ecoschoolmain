/**
 * O'yin tizimi: Eco Level (XP), EcoCoin (do'kon), yutuqlar.
 *  - XP = to'plangan ball (profiles.points): darajani oshiradi, hech qachon kamaymaydi (xarid ta'sir qilmaydi)
 *  - EcoCoin = ball − do'konda sarflangan: mukofot olish uchun (my_wallet RPC)
 */
import type { createClient } from "./supabase";

type Client = ReturnType<typeof createClient>;

export const POINTS_PER_KG = 25;

export const LEVELS = [
  { min: 0, name: "Eco Beginner", icon: "🌱", color: "#7fb069" },
  { min: 100, name: "Eco Explorer", icon: "🍃", color: "#5fa35a" },
  { min: 300, name: "Eco Warrior", icon: "🌿", color: "#3f9a5c" },
  { min: 700, name: "Eco Guardian", icon: "🌳", color: "#2c7d4d" },
  { min: 1500, name: "Eco Hero", icon: "🌍", color: "#1d7a6c" },
  { min: 3000, name: "Eco Legend", icon: "👑", color: "#c99a2e" },
] as const;

export function levelOf(xp: number) {
  const index = LEVELS.reduce((acc, l, i) => (xp >= l.min ? i : acc), 0);
  const level = LEVELS[index];
  const next = LEVELS[index + 1] ?? null;
  const progress = next ? Math.min(100, ((xp - level.min) / (next.min - level.min)) * 100) : 100;
  return { index, level, next, progress, toNext: next ? next.min - xp : 0 };
}

export type Wallet = { xp: number; earned: number; spent: number; balance: number };

export async function loadWallet(supabase: Client, fallbackXp = 0): Promise<{ wallet: Wallet; ready: boolean }> {
  const { data, error } = await supabase.rpc("my_wallet");
  const row = (Array.isArray(data) ? data[0] : data) as Wallet | undefined;
  if (error || !row) {
    // Migratsiya hali ishga tushmagan bo'lsa — faqat XP ko'rsatamiz
    return { wallet: { xp: fallbackXp, earned: fallbackXp, spent: 0, balance: fallbackXp }, ready: false };
  }
  return { wallet: { xp: Number(row.xp), earned: Number(row.earned), spent: Number(row.spent), balance: Number(row.balance) }, ready: true };
}

/** Yutuqlar uchun kerakli statistika */
export type EcoStats = {
  challenges: number;
  categories: string[];
  research: number;
  bestResearch: number;
  teamResearch: number;
  classPaperKg: number;
  classPlasticKg: number;
  classEntries: number;
  xp: number;
  leagueWins: number;
};

export const ACHIEVEMENTS: { id: string; icon: string; title: string; text: string; done: (s: EcoStats) => boolean }[] = [
  { id: "first", icon: "♻️", title: "Birinchi qadam", text: "Sinfingiz ilk recycling topshirdi", done: (s) => s.classEntries > 0 },
  { id: "paper", icon: "📄", title: "Paper Master", text: "Sinfingiz 10 kg qog‘oz topshirdi", done: (s) => s.classPaperKg >= 10 },
  { id: "plastic", icon: "🧴", title: "Plastic Hero", text: "Sinfingiz 5 kg plastik topshirdi", done: (s) => s.classPlasticKg >= 5 },
  { id: "scientist", icon: "🔬", title: "Eco Scientist", text: "Ilk tadqiqotingiz nashr qilindi", done: (s) => s.research > 0 },
  { id: "innovator", icon: "💡", title: "Innovator", text: "Tadqiqotingiz 80+ ball oldi", done: (s) => s.bestResearch >= 80 },
  { id: "team", icon: "🤝", title: "Team Player", text: "Jamoaviy tadqiqotda qatnashdingiz", done: (s) => s.teamResearch > 0 },
  { id: "water", icon: "💧", title: "Water Guardian", text: "Suvni tejash challenge’i", done: (s) => s.categories.includes("Suv") },
  { id: "nature", icon: "🌳", title: "Nature Friend", text: "Yashil hudud challenge’i", done: (s) => s.categories.includes("Yashil hudud") },
  { id: "energy", icon: "⚡", title: "Energy Saver", text: "Energiya challenge’i", done: (s) => s.categories.includes("Energiya") },
  { id: "five", icon: "🎯", title: "Faol eko-qahramon", text: "5 ta challenge bajarildi", done: (s) => s.challenges >= 5 },
  { id: "hero", icon: "🌍", title: "Eco Hero", text: "Eco Hero darajasiga yetdingiz", done: (s) => s.xp >= 1500 },
  { id: "champion", icon: "🏆", title: "Eco Champion", text: "Sinfingiz oylik ligada 1-o‘rin oldi", done: (s) => s.leagueWins > 0 },
];

function monthStart(offset: number) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return d.toISOString().slice(0, 10);
}

/** O'quvchining yutuqlar statistikasini yig'adi (faqat o'ziga ruxsat berilgan ma'lumotlar) */
export async function loadStats(supabase: Client, userId: string, className: string | null, xp: number): Promise<EcoStats> {
  const cls = (className || "").toUpperCase();
  const [ch, rs, rec, l0, l1] = await Promise.all([
    supabase.from("challenge_submissions").select("challenges(category)").eq("student_id", userId).eq("status", "approved"),
    supabase.from("eco_research").select("awarded_points, team_members").eq("student_id", userId).eq("status", "published"),
    supabase.rpc("get_class_recycling"),
    supabase.rpc("get_league", { p_month: monthStart(0) }),
    supabase.rpc("get_league", { p_month: monthStart(-1) }),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const categories = ((ch.data as any[]) || []).map((r) => (Array.isArray(r.challenges) ? r.challenges[0]?.category : r.challenges?.category)).filter(Boolean);
  const research = (rs.data as { awarded_points: number; team_members: string | null }[]) || [];
  const myRec = ((rec.data as { class_name: string; paper_kg: number; plastic_kg: number; entries: number }[]) || []).find((r) => r.class_name === cls);
  const won = [l0, l1].filter((l) => {
    const top = ((l.data as { class_name: string; points: number }[]) || [])[0];
    return top && Number(top.points) > 0 && top.class_name === cls;
  }).length;
  return {
    challenges: ((ch.data as unknown[]) || []).length,
    categories,
    research: research.length,
    bestResearch: Math.max(0, ...research.map((r) => r.awarded_points || 0)),
    teamResearch: research.filter((r) => (r.team_members || "").trim()).length,
    classPaperKg: Number(myRec?.paper_kg || 0),
    classPlasticKg: Number(myRec?.plastic_kg || 0),
    classEntries: Number(myRec?.entries || 0),
    xp,
    leagueWins: won,
  };
}

export function monthInputValue(offset = 0) {
  return monthStart(offset);
}
