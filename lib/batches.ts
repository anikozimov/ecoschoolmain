export const BATCH_STAGES = [
  { n: 1, icon: "🧺", title: "Qabul qilindi", text: "Chiqindi sinflardan qabul qilindi" },
  { n: 2, icon: "⚖️", title: "Saralandi va tortildi", text: "Material bo‘yicha saralandi va tortildi" },
  { n: 3, icon: "🏫", title: "Saqlash punktida", text: "Maktabning saqlash punktiga joylandi" },
  { n: 4, icon: "🚚", title: "Korxonaga topshirildi", text: "Qayta ishlash korxonasiga topshirildi" },
  { n: 5, icon: "🧾", title: "Kvitansiya yuklandi", text: "Qabul dalolatnomasi yoki kvitansiya yuklandi" },
  { n: 6, icon: "📣", title: "Natija e’lon qilindi", text: "Tushum va ekologik natija e’lon qilindi" },
] as const;

export type Batch = {
  id: number;
  title: string;
  paper_kg: number;
  plastic_kg: number;
  stage: number;
  income: number;
  receipt_url: string | null;
  note: string | null;
  history: { stage: number; at: string }[];
  created_at: string;
  updated_at: string;
};

export const BATCH_FIELDS = "id, title, paper_kg, plastic_kg, stage, income, receipt_url, note, history, created_at, updated_at";
export const RECEIPT_BUCKET = "batch-receipts";

export function formatSum(n: number) {
  return new Intl.NumberFormat("ru-RU").format(Math.round(n)).replace(/,/g, " ") + " so‘m";
}

export function safeUrl(url: string | null | undefined) {
  return url && /^https:\/\//i.test(url) ? url : null;
}
