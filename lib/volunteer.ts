export const VOLUNTEER_BUCKET = "volunteer-proofs";

export type VolunteerLog = {
  id: number;
  student_id: string;
  work_date: string;
  title: string;
  description: string | null;
  hours: number;
  approved_hours: number | null;
  proof_url: string | null;
  status: "pending" | "approved" | "rejected";
  awarded_points: number;
  reviewer_feedback: string | null;
  submitted_at: string;
  profiles?: { full_name: string | null } | null;
};

export type VolunteerRow = { student_id: string; full_name: string | null; hours: number; entries: number; points: number };

export const VOL_FIELDS =
  "id, student_id, work_date, title, description, hours, approved_hours, proof_url, status, awarded_points, reviewer_feedback, submitted_at";

/** Soatni chiroyli yozish: 3.5 → “3 soat 30 daq” */
export function formatHours(h: number) {
  const total = Math.round(Number(h || 0) * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  if (!hh && !mm) return "0 soat";
  return [hh ? `${hh} soat` : "", mm ? `${mm} daq` : ""].filter(Boolean).join(" ");
}

/** Taklif qilinadigan ball: 1 soat = 10 ball, ko‘pi bilan 100 */
export const suggestPoints = (hours: number) => Math.min(100, Math.round(Number(hours || 0) * 10));

/** Volontyor darajasi (tasdiqlangan soat bo‘yicha) */
export const VOL_BADGES = [
  { min: 0, icon: "🌱", name: "Yangi volontyor" },
  { min: 10, icon: "🤝", name: "Faol volontyor" },
  { min: 25, icon: "⭐", name: "Yulduz volontyor" },
  { min: 50, icon: "🏅", name: "Oltin volontyor" },
  { min: 100, icon: "👑", name: "Volontyorlar faxri" },
] as const;

export function volBadge(hours: number) {
  const i = VOL_BADGES.reduce((acc, b, idx) => (hours >= b.min ? idx : acc), 0);
  return { ...VOL_BADGES[i], next: VOL_BADGES[i + 1] ?? null };
}
