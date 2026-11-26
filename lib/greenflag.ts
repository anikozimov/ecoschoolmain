import type { createClient } from "./supabase";

type Client = ReturnType<typeof createClient>;

/** Eco-Schools Green Flag dasturining 7 qadami */
export const GF_STEPS = [
  { key: "committee", n: 1, icon: "👥", title: "Eco Committee", text: "A’zolar, yig‘ilishlar va qarorlar" },
  { key: "review", n: 2, icon: "🔍", title: "Ekologik audit", text: "Maktabning boshlang‘ich holatini o‘rganish" },
  { key: "curriculum", n: 3, icon: "📖", title: "Fanlarga integratsiya", text: "Darslarda ekologik mavzular" },
  { key: "action", n: 4, icon: "🗂️", title: "Action Plan", text: "Vazifalar, muddatlar va mas’ullar" },
  { key: "monitoring", n: 5, icon: "📈", title: "Monitoring", text: "Maqsadlar va natijalarni kuzatish" },
  { key: "inform", n: 6, icon: "📣", title: "Xabardorlik", text: "Yangiliklar, tadbirlar, ota-onalar" },
  { key: "ecocode", n: 7, icon: "📜", title: "Eco-Code", text: "Maktabning ekologik nizomi" },
] as const;

export type StepKey = (typeof GF_STEPS)[number]["key"];

export type Goal = { id: number; title: string; unit: string; target: number; current: number; auto: AutoKey | null; sort_order: number };
export type AutoKey = "active_pct" | "classes_pct" | "paper_kg" | "plastic_kg" | "research";
export type AutoValues = Record<AutoKey, number>;
export type Member = { id: number; full_name: string; role_title: string | null; class_name: string | null; sort_order: number };
export type Meeting = { id: number; meet_date: string; title: string; minutes: string | null; decisions: string | null };
export type Task = { id: number; step: StepKey; title: string; owner_name: string | null; deadline: string | null; status: "todo" | "doing" | "done" };

export const AUTO_LABEL: Record<AutoKey, string> = {
  active_pct: "Ball olgan o‘quvchilar ulushi",
  classes_pct: "Faol sinflar ulushi",
  paper_kg: "Tasdiqlangan qog‘oz recycling",
  plastic_kg: "Tasdiqlangan plastik recycling",
  research: "Nashr qilingan tadqiqotlar",
};

export const TASK_STATUS: Record<Task["status"], { label: string; cls: string }> = {
  todo: { label: "Rejada", cls: "bg-white/[0.06] text-muted" },
  doing: { label: "Bajarilmoqda", cls: "bg-sand-200 text-sand-400" },
  done: { label: "Bajarildi", cls: "bg-leaf-100 text-accent" },
};

export const ECOCODE_KEY = "greenflag.ecocode";

export function goalValue(g: Goal, auto: AutoValues | null) {
  return g.auto && auto ? Number(auto[g.auto] ?? 0) : Number(g.current);
}

export function goalPct(g: Goal, auto: AutoValues | null) {
  const t = Number(g.target);
  return t > 0 ? Math.min(100, (goalValue(g, auto) / t) * 100) : 0;
}

export type GreenFlagData = {
  goals: Goal[];
  auto: AutoValues | null;
  members: Member[];
  meetings: Meeting[];
  tasks: Task[];
  ecocode: string;
  ready: boolean;
};

export async function loadGreenFlag(supabase: Client): Promise<GreenFlagData> {
  const [g, a, m, mt, t, ec] = await Promise.all([
    supabase.from("eco_goals").select("id, title, unit, target, current, auto, sort_order").order("sort_order").order("id"),
    supabase.rpc("get_goal_auto"),
    supabase.from("committee_members").select("id, full_name, role_title, class_name, sort_order").order("sort_order").order("id"),
    supabase.from("committee_meetings").select("id, meet_date, title, minutes, decisions").order("meet_date", { ascending: false }),
    supabase.from("action_tasks").select("id, step, title, owner_name, deadline, status").order("deadline", { ascending: true, nullsFirst: false }).order("id"),
    supabase.from("site_content").select("value").eq("key", ECOCODE_KEY).maybeSingle(),
  ]);
  const autoRow = (Array.isArray(a.data) ? a.data[0] : a.data) as Record<string, number> | undefined;
  return {
    ready: !g.error,
    goals: ((g.data as Goal[]) || []).map((x) => ({ ...x, target: Number(x.target), current: Number(x.current) })),
    auto: autoRow
      ? {
          active_pct: Number(autoRow.active_pct),
          classes_pct: Number(autoRow.classes_pct),
          paper_kg: Number(autoRow.paper_kg),
          plastic_kg: Number(autoRow.plastic_kg),
          research: Number(autoRow.research),
        }
      : null,
    members: (m.data as Member[]) || [],
    meetings: (mt.data as Meeting[]) || [],
    tasks: (t.data as Task[]) || [],
    ecocode: ((ec.data as { value: string } | null)?.value || "").trim(),
  };
}

/** Qadam holati: 0 — boshlanmagan, 1 — jarayonda, 2 — bajarilgan */
export function stepState(key: StepKey, d: GreenFlagData): 0 | 1 | 2 {
  const tasks = d.tasks.filter((t) => t.step === key);
  const allDone = tasks.length > 0 && tasks.every((t) => t.status === "done");
  if (key === "committee") return d.members.length >= 3 && d.meetings.length > 0 ? 2 : d.members.length > 0 ? 1 : 0;
  if (key === "monitoring") {
    const pcts = d.goals.map((g) => goalPct(g, d.auto));
    return pcts.length && pcts.every((p) => p >= 100) ? 2 : pcts.some((p) => p > 0) ? 1 : 0;
  }
  if (key === "ecocode") return d.ecocode.length > 20 ? 2 : 0;
  if (allDone) return 2;
  return tasks.some((t) => t.status !== "todo") ? 1 : tasks.length ? 1 : 0;
}
