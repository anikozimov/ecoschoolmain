/** "Timo dunyosi" — chiqindini to‘g‘ri qutiga saralash o‘yini */

export type BinKey = "paper" | "plastic" | "organic" | "metal";

export const BINS: { key: BinKey; label: string; icon: string; color: string; key1: string }[] = [
  { key: "paper", label: "Qog‘oz", icon: "📄", color: "#3b82f6", key1: "1" },
  { key: "plastic", label: "Plastik", icon: "🧴", color: "#eab308", key1: "2" },
  { key: "organic", label: "Organik", icon: "🍂", color: "#22a05a", key1: "3" },
  { key: "metal", label: "Shisha / metall", icon: "🥫", color: "#64748b", key1: "4" },
];

export const ITEMS: { emoji: string; name: string; bin: BinKey }[] = [
  { emoji: "📄", name: "Qog‘oz varaq", bin: "paper" },
  { emoji: "📰", name: "Gazeta", bin: "paper" },
  { emoji: "📦", name: "Karton quti", bin: "paper" },
  { emoji: "📚", name: "Eski daftar", bin: "paper" },
  { emoji: "✉️", name: "Konvert", bin: "paper" },
  { emoji: "🧴", name: "Plastik idish", bin: "plastic" },
  { emoji: "🛍️", name: "Polietilen paket", bin: "plastic" },
  { emoji: "🍼", name: "Plastik shisha", bin: "plastic" },
  { emoji: "🪥", name: "Tish cho‘tkasi", bin: "plastic" },
  { emoji: "🍎", name: "Olma qoldig‘i", bin: "organic" },
  { emoji: "🍌", name: "Banan po‘sti", bin: "organic" },
  { emoji: "🥕", name: "Sabzi", bin: "organic" },
  { emoji: "🍂", name: "Xazon", bin: "organic" },
  { emoji: "🥚", name: "Tuxum po‘chog‘i", bin: "organic" },
  { emoji: "🍞", name: "Non qoldig‘i", bin: "organic" },
  { emoji: "🥫", name: "Konserva bankasi", bin: "metal" },
  { emoji: "🍾", name: "Shisha butilka", bin: "metal" },
  { emoji: "🫙", name: "Shisha banka", bin: "metal" },
  { emoji: "🔩", name: "Temir bolt", bin: "metal" },
];

/** Dunyo bosqichlari: ochko oshgani sari Timoning olami tozarib, yashnaydi */
export const WORLD = [
  { min: 0, name: "Iflos vodiy", sky: ["#4b5248", "#2a2f28"], ground: "#5a4a35", deco: ["🗑️", "💨", "🗑️"] },
  { min: 100, name: "Tozalanmoqda", sky: ["#5d7a6a", "#2f4a3c"], ground: "#6b5a3a", deco: ["🌱", "🪨", "🌱"] },
  { min: 250, name: "Yashil maysa", sky: ["#5fa3c7", "#2f6d6a"], ground: "#3f7d3a", deco: ["🌱", "🌿", "🌱", "🌿"] },
  { min: 500, name: "Bog‘", sky: ["#62b6e8", "#2c7aa0"], ground: "#2f8a3e", deco: ["🌳", "🌷", "🌳", "🌼"] },
  { min: 800, name: "Gullagan vodiy", sky: ["#7cc8f2", "#3b8fc0"], ground: "#2c9a45", deco: ["🌳", "🦋", "🌸", "🌳", "🌻"] },
  { min: 1200, name: "Timoning jannati", sky: ["#8fd3ff", "#4aa3d8"], ground: "#29a64d", deco: ["🌈", "🌳", "🐦", "🌸", "🦋", "🌳"] },
] as const;

export function worldOf(score: number) {
  let i = 0;
  WORLD.forEach((w, idx) => {
    if (score >= w.min) i = idx;
  });
  return { index: i, ...WORLD[i], next: WORLD[i + 1] ?? null };
}

export const FACTS = [
  "Shisha sifatini yo‘qotmasdan qayta-qayta eritilib, yangi idishga aylanishi mumkin.",
  "Alyuminiy banka qayta ishlanib, taxminan ikki oyda yana do‘kon javoniga qaytishi mumkin.",
  "Qog‘ozni qayta ishlash yangi qog‘oz tayyorlashdan kamroq daraxt, suv va energiya talab qiladi.",
  "Plastik butilka tabiatda yuzlab yil davomida parchalanmay yotadi.",
  "Meva va sabzavot qoldiqlaridan kompost qilinsa, tuproq uchun tabiiy o‘g‘it bo‘ladi.",
  "Ifloslangan yoki aralash chiqindini qayta ishlash qiyin — shuning uchun saralash muhim.",
  "Polietilen paket o‘rniga mato sumka — eng oson ekologik odat.",
];

export const BEST_KEY = "eco-game-best";
