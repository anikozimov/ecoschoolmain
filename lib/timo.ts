/**
 * Timo — o'quvchining shaxsiy eko-yordamchisi va virtual bog'i.
 *  - Bog' elementlari TASDIQLANGAN ishlar soniga qarab ochiladi (challenge + tadqiqot + volontyorlik)
 *  - Kiyimlar darajaga (XP) qarab ochiladi — server ham tekshiradi (set_timo_outfit)
 *  - Hech narsa yo'qolmaydi: faol bo'lmaslik jazolanmaydi
 */
import type { createClient } from "./supabase";
import { LEVELS } from "./eco";

type Client = ReturnType<typeof createClient>;

export type Zone = 1 | 2 | 3;

export const MILESTONES = [
  { id: "flowers", at: 1, zone: 1, icon: "🌼", title: "Birinchi gullar", text: "Bog'ingizdagi ilk gullar ochildi" },
  { id: "butterflies", at: 3, zone: 1, icon: "🦋", title: "Kapalaklar", text: "Gullarga kapalaklar uchib keldi" },
  { id: "house", at: 5, zone: 1, icon: "🏡", title: "Timoning uyi", text: "Timo uchun shinam uy qurildi" },
  { id: "birds", at: 7, zone: 1, icon: "🐦", title: "Qushlar uyasi", text: "Bog'ga qushlar ko'chib keldi" },
  { id: "tree", at: 10, zone: 1, icon: "🌳", title: "Katta daraxt", text: "Sizning shaxsiy daraxtingiz o'sdi" },
  { id: "pond", at: 15, zone: 1, icon: "🪷", title: "Hovuz", text: "Nilufarli tiniq hovuz paydo bo'ldi" },
  { id: "valley", at: 20, zone: 2, icon: "🗺️", title: "Yangi hudud: Yashil vodiy", text: "Daryo, ko'prik va keng vodiy ochildi" },
  { id: "turbine", at: 25, zone: 2, icon: "🌬️", title: "Shamol generatori", text: "Bog' toza energiya bilan ishlaydi" },
  { id: "forest", at: 30, zone: 2, icon: "🌲", title: "Archazor", text: "Vodiyda butun bir o'rmon o'sdi" },
  { id: "mountains", at: 40, zone: 3, icon: "🏔️", title: "Yangi hudud: Tog' etagi", text: "Sharshara va tog'lar ochildi" },
  { id: "rainbow", at: 50, zone: 3, icon: "🌈", title: "Kamalak va Eco Legend toshi", text: "Afsonaviy bog' — eng yuqori cho'qqi" },
] as const;

export type MilestoneId = (typeof MILESTONES)[number]["id"];

export const OUTFITS = [
  { id: "none", title: "Oddiy Timo", min: LEVELS[0].min },
  { id: "leaf", title: "Yaproq gulchambar", min: LEVELS[1].min },
  { id: "cap", title: "Eco kepka", min: LEVELS[2].min },
  { id: "explorer", title: "Sayohatchi shlyapasi", min: LEVELS[3].min },
  { id: "grad", title: "Bilimdon qalpog'i", min: LEVELS[4].min },
  { id: "crown", title: "Oltin toj", min: LEVELS[5].min },
] as const;

export type OutfitId = (typeof OUTFITS)[number]["id"];

export type TimoState = {
  tasks: number;
  challenges: number;
  research: number;
  volunteer: number;
  xp: number;
  outfit: OutfitId;
};

export function unlocked(tasks: number) {
  return new Set<MilestoneId>(MILESTONES.filter((m) => tasks >= m.at).map((m) => m.id));
}

export function nextMilestone(tasks: number) {
  return MILESTONES.find((m) => tasks < m.at) ?? null;
}

export function zonesOpen(tasks: number): Zone {
  return tasks >= 40 ? 3 : tasks >= 20 ? 2 : 1;
}

export async function loadTimo(supabase: Client, fallbackXp = 0): Promise<{ state: TimoState; ready: boolean }> {
  const { data, error } = await supabase.rpc("get_timo_state");
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
  if (error || !row) {
    return { state: { tasks: 0, challenges: 0, research: 0, volunteer: 0, xp: fallbackXp, outfit: "none" }, ready: false };
  }
  const outfit = String(row.outfit ?? "none");
  return {
    ready: true,
    state: {
      tasks: Number(row.tasks) || 0,
      challenges: Number(row.challenges) || 0,
      research: Number(row.research) || 0,
      volunteer: Number(row.volunteer) || 0,
      xp: Number(row.xp) || 0,
      outfit: (OUTFITS.some((o) => o.id === outfit) ? outfit : "none") as OutfitId,
    },
  };
}

/** Kun vaqti: bog' osmoni va Timoning salomi shunga qarab o'zgaradi */
export type DayPhase = "dawn" | "day" | "dusk" | "night";

export function dayPhase(d = new Date()): DayPhase {
  const h = d.getHours();
  if (h >= 5 && h < 8) return "dawn";
  if (h >= 8 && h < 17) return "day";
  if (h >= 17 && h < 20) return "dusk";
  return "night";
}

export function greeting(name: string | null | undefined, phase = dayPhase()) {
  const n = (name || "").trim().split(/\s+/)[0] || "do'stim";
  if (phase === "dawn") return `Xayrli tong, ${n}! ☀️`;
  if (phase === "day") return `Salom, ${n}! 👋`;
  if (phase === "dusk") return `Xayrli kech, ${n}! 🌇`;
  return `Hali uxlamadingmi, ${n}? 🌙`;
}

/** Timoning maslahatlari — hech qachon tanbeh yoki jazo yo'q */
export function timoAdvice(s: TimoState, opts: { volunteer?: boolean } = {}) {
  const next = nextMilestone(s.tasks);
  const out: string[] = [];
  if (s.tasks === 0) {
    out.push("Birinchi challenge'ni bajarsangiz, bog'imizda ilk gullar ochiladi 🌼");
  } else if (next) {
    const left = next.at - s.tasks;
    out.push(`Yana ${left} ta ish — va ${next.icon} ${next.title.toLowerCase()} ochiladi!`);
  } else {
    out.push("Siz afsonaviy bog'ni qurdingiz! Endi do'stlaringizga yordam bering 🌈");
  }
  if (opts.volunteer) out.push("Volontyorlik soatlaringizni yozib qo'yishni unutmang — har bir tasdiqlangan ish bog'ni o'stiradi.");
  out.push("Shoshilish shart emas — bog' sizni doim kutadi va hech narsa so'lib qolmaydi 🌱");
  return out;
}

/** Yangi ochilgan elementlarni bilish uchun (bayram oynasi) */
export function seenKey(uid: string) {
  return `eco-timo-seen-${uid}`;
}
