/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * DEMO REJIM — Supabase o'rniga brauzer ichidagi soxta ma'lumotlar.
 * Faqat NEXT_PUBLIC_DEMO=1 bo'lganda ishlatiladi (lib/supabase.ts).
 */

const UID = "demo-user-0001";
const USER = { id: UID, email: "demo@ecoschool.uz", aud: "authenticated", role: "authenticated", user_metadata: {} };

const now = Date.now();
const ago = (h: number) => new Date(now - h * 3600_000).toISOString();
const day = (d: number) => {
  const x = new Date(now + d * 86400_000);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

const DB: Record<string, any[]> = {
  profiles: [
    { id: UID, full_name: "Dilnoza Rahimova", class_name: "9-A", school_code: "ECO21", school_id: 1, points: 235, role: "admin", username: "dilnoza", is_owner: true },
    { id: "s-madina", full_name: "Madina Yusupova", class_name: "9-A", school_code: "ECO21", school_id: 1, points: 420, role: "mentor", username: "madina_y", is_owner: false },
    { id: "s-aziz", full_name: "Aziz Karimov", class_name: "8-B", school_code: "ECO21", school_id: 1, points: 365, role: "student", username: "aziz.k", is_owner: false },
    { id: "s-jasur", full_name: "Jasur Toshmatov", class_name: "10-A", school_code: "ECO21", school_id: 1, points: 310, role: "admin", username: "jasur", is_owner: false },
    { id: "s-sevara", full_name: "Sevara Olimova", class_name: "7-V", school_code: "ECO21", school_id: 1, points: 180, role: "student", username: "sevara", is_owner: false },
    { id: "s-bekzod", full_name: "Bekzod Aliyev", class_name: "8-B", school_code: "ECO21", school_id: 1, points: 95, role: "student", username: "bekzod_a", is_owner: false },
  ],
  site_content: [],
  schools: [
    { id: "1", name: "Andijon shahar 21-maktab", code: "ECO21" },
    { id: "2", name: "Asaka tumani 7-maktab", code: "ASAKA7" },
  ],
  school_classes: [
    ...["7-A", "7-V", "8-B", "9-A", "10-A", "11-B"].map((c, i) => ({ id: String(i + 1), school_id: "1", class_name: c })),
    { id: "7", school_id: "2", class_name: "9-A" },
    { id: "8", school_id: "2", class_name: "10-B" },
  ],
  challenges: [
    { id: 1, title: "Plastiksiz bir hafta", description: "Bir martalik plastik idishlardan bir hafta voz keching.", category: "Chiqindilar", points: 30, end_date: day(12), created_at: ago(500) },
    { id: 2, title: "Chiroqni o‘chir!", description: "Tanaffusda sinf chiroqlarini o‘chirishni nazorat qiling.", category: "Energiya", points: 15, end_date: null },
    { id: 3, title: "Qog‘ozni asraymiz", description: "Bir oy davomida daftarning ikki tomoniga yozing.", category: "Resurslar", points: 20, end_date: null },
    { id: 4, title: "Daraxt ekamiz", description: "Maktab hovlisiga ko‘chat eking va parvarishlang.", category: "Yashil hudud", points: 50, end_date: day(18) },
    { id: 5, title: "Suvni tejaymiz", description: "Uyda tish yuvayotganda jo‘mrakni yopib qo‘yishni odat qiling.", category: "Suv", points: 15, end_date: null },
  ],
  challenge_submissions: [
    { id: 10, challenge_id: 1, student_id: "s-aziz", proof_text: "Butun hafta o‘z suv idishim bilan yurdim, oshxonada ham plastik stakan olmadim.", proof_url: null, status: "pending", awarded_points: 0, submitted_at: ago(20), challenges: { title: "Plastiksiz bir hafta", points: 30 }, profiles: { full_name: "Aziz Karimov", class_name: "8-B" } },
    { id: 11, challenge_id: 2, student_id: UID, proof_text: "Sinfimizda navbatchilik jadvali tuzdik.", proof_url: null, status: "approved", awarded_points: 15, submitted_at: ago(120), challenges: { title: "Chiroqni o‘chir!", points: 15 }, profiles: { full_name: "Dilnoza Rahimova", class_name: "9-A" } },
    { id: 12, challenge_id: 4, student_id: "s-jasur", proof_text: "Sinfdoshlar bilan 3 ta o‘rik ko‘chati ekdik.", proof_url: null, status: "pending", awarded_points: 0, submitted_at: ago(4), challenges: { title: "Daraxt ekamiz", points: 50 }, profiles: { full_name: "Jasur Toshmatov", class_name: "10-A" } },
  ],
  recycling_submissions: [
    { id: 20, school_id: 1, student_id: "s-aziz", material: "paper", amount_kg: 3.5, verified_amount_kg: null, status: "pending", awarded_points: 0, proof_image: null, submitted_at: ago(6), profiles: { full_name: "Aziz Karimov", class_name: "8-B" } },
    { id: 21, school_id: 1, student_id: UID, material: "plastic", amount_kg: 1.2, verified_amount_kg: 1.1, status: "approved", awarded_points: 28, proof_image: null, submitted_at: ago(170), profiles: { full_name: "Dilnoza Rahimova", class_name: "9-A" } },
    { id: 22, school_id: 1, student_id: null, class_name: "9-A", material: "paper", amount_kg: 12.5, verified_amount_kg: 12.5, status: "approved", awarded_points: 313, note: "1-chorak aksiyasi", proof_image: null, submitted_at: ago(50), profiles: null },
    { id: 23, school_id: 1, student_id: null, class_name: "8-B", material: "plastic", amount_kg: 6, verified_amount_kg: 6, status: "approved", awarded_points: 150, note: null, proof_image: null, submitted_at: ago(26), profiles: null },
    { id: 24, school_id: 1, student_id: null, class_name: "10-A", material: "paper", amount_kg: 4.2, verified_amount_kg: 4.2, status: "approved", awarded_points: 105, note: null, proof_image: null, submitted_at: ago(3), profiles: null },
  ],
  mentors: [
    { id: 1, full_name: "Gulnora Karimova", subject: "Biologiya o‘qituvchisi", bio: "Tadqiqot ishlarimizga ilmiy rahbarlik qildi va har bir jamoaga maslahat berdi.", photo_url: null, sort_order: 0 },
    { id: 2, full_name: "Rustam Aliyev", subject: "Geografiya", bio: "Recycling aksiyasini tashkil qilishda yordam berdi.", photo_url: null, sort_order: 1 },
    { id: 3, full_name: "Nodira Usmonova", subject: "Direktor o‘rinbosari", bio: "Loyihani maktabda joriy qilishni qo‘llab-quvvatladi.", photo_url: null, sort_order: 2 },
  ],
  eco_research: [
    { id: 30, student_id: "s-sevara", title: "Maktabimizda plastik chiqindilar hajmi", summary: "Bir hafta davomida oshxona va sinflardagi plastik chiqindilarni o‘lchadik va asosiy manbalarni aniqladik.", content: "Muammo: maktab oshxonasida har kuni ko‘plab bir martalik idishlar ishlatiladi.\n\nUsul: 5 kun davomida chiqindi qutilarini tortib, turlarga ajratdik.\n\nNatija: plastikning 60% dan ortig‘i ichimlik butilkalari bo‘ldi.\n\nXulosa: suv quyish nuqtasi o‘rnatilsa, plastik chiqindini ikki baravar kamaytirish mumkin.", sources: "UNEP — Single-use plastics (2023)", status: "pending", awarded_points: 0, reviewer_feedback: null, submitted_at: ago(30), team_name: "Yashil Avlod", team_members: "Sevara Olimova, Bekzod Aliyev, Madina Yusupova" },
    { id: 31, student_id: UID, title: "Andijonda havo sifati", summary: "Shahrimizdagi havo sifati ko‘rsatkichlarini fasllar bo‘yicha taqqosladik.", content: "Kuzatuvlar qishda havo sifati yomonlashishini ko‘rsatdi, asosiy sabab — isitish.\n\nTavsiyalar: ko‘proq daraxt ekish va jamoat transportidan foydalanish.", sources: null, status: "published", awarded_points: 86, reviewer_feedback: "Ajoyib tahlil! Keyingi safar ko‘proq manba qo‘shing.", submitted_at: ago(400), team_name: "Toza Havo", team_members: "Dilnoza Rahimova, Jasur Toshmatov" },
  ],
  eco_events: [
    { id: 40, title: "Daraxt ekish kuni", description: "Butun maktab bilan hovliga 50 ta ko‘chat ekamiz.", event_type: "eco_day", start_date: day(4), end_date: null, location: "Maktab hovlisi", school_id: 1 },
    { id: 41, title: "Plastiksiz hafta", description: null, event_type: "challenge", start_date: day(7), end_date: day(13), location: null, school_id: 1 },
    { id: 42, title: "Eko-viktorina", description: "Sinflar o‘rtasida bilimlar bellashuvi.", event_type: "event", start_date: day(0), end_date: null, location: "Faollar zali", school_id: 1 },
  ],
};

const sortClasses = (list: any[]) =>
  [...list].sort((a, b) => (parseInt(a.class_name) || 99) - (parseInt(b.class_name) || 99) || a.class_name.localeCompare(b.class_name));

const RPC: Record<string, (p: any) => any> = {
  get_my_school_classes: () => sortClasses(DB.school_classes.filter((c) => String(c.school_id) === "1")).map((c) => ({ class_name: c.class_name })),
  get_class_recycling: () => {
    const m = new Map<string, any>();
    DB.recycling_submissions.filter((r) => r.status === "approved").forEach((r) => {
      const cn = r.class_name || r.profiles?.class_name;
      if (!cn) return;
      const kg = Number(r.verified_amount_kg ?? r.amount_kg);
      const x = m.get(cn) ?? { class_name: cn, paper_kg: 0, plastic_kg: 0, total_kg: 0, points: 0, entries: 0 };
      x[r.material === "paper" ? "paper_kg" : "plastic_kg"] += kg;
      x.total_kg += kg; x.points += r.awarded_points; x.entries += 1;
      m.set(cn, x);
    });
    return [...m.values()].sort((a, b) => b.total_kg - a.total_kg);
  },
  admin_set_password: () => null,
  get_school_overall_impact: () => [
    { paper_kg: 142.5, plastic_kg: 63.2, recycling_kg: 205.7, recycling_points: 5140, approved_challenges: 87, challenge_points: 2310, total_points: 7450, active_students: 126 },
  ],
  get_school_leaderboard: () => [
    { student_id: "s-madina", full_name: "Madina Yusupova", class_name: "9-A", points: 420 },
    { student_id: "s-aziz", full_name: "Aziz Karimov", class_name: "8-B", points: 365 },
    { student_id: "s-jasur", full_name: "Jasur Toshmatov", class_name: "10-A", points: 310 },
    { student_id: UID, full_name: "Dilnoza Rahimova", class_name: "9-A", points: DB.profiles[0].points },
    { student_id: "s-sevara", full_name: "Sevara Olimova", class_name: "7-V", points: 180 },
    { student_id: "s-bekzod", full_name: "Bekzod Aliyev", class_name: "8-B", points: 95 },
  ],
  get_school_class_leaderboard: () => [
    { class_name: "9-A", student_count: 28, total_points: 2140, recycling_kg: 61.5, approved_challenges: 24 },
    { class_name: "8-B", student_count: 26, total_points: 1890, recycling_kg: 48.0, approved_challenges: 19 },
    { class_name: "10-A", student_count: 24, total_points: 1560, recycling_kg: 40.2, approved_challenges: 17 },
    { class_name: "7-V", student_count: 30, total_points: 980, recycling_kg: 22.1, approved_challenges: 11 },
  ],
  get_school_classes_by_code: (p) => {
    const sc = DB.schools.find((s) => s.code === String(p.input_school_code ?? "").trim().toUpperCase());
    return sc ? sortClasses(DB.school_classes.filter((c) => c.school_id === sc.id)).map((c) => ({ class_name: c.class_name })) : [];
  },
  admin_list_schools: () =>
    DB.schools.map((s) => ({
      ...s,
      students: DB.profiles.filter((p) => String(p.school_id) === s.id).length,
      classes: DB.school_classes.filter((c) => c.school_id === s.id).length,
    })),
  admin_save_school: (p) => {
    const code = String(p.p_code ?? "").trim().toUpperCase();
    if (DB.schools.some((s) => s.code === code && s.id !== p.p_id)) throw new Error("Bu kod boshqa maktabda band.");
    if (p.p_id) {
      const s = DB.schools.find((x) => x.id === p.p_id);
      if (!s) throw new Error("Maktab topilmadi.");
      Object.assign(s, { name: p.p_name, code });
      return s.id;
    }
    const id = String(nextId++);
    DB.schools.push({ id, name: p.p_name, code });
    return id;
  },
  admin_delete_school: (p) => {
    const n = DB.profiles.filter((x) => String(x.school_id) === p.p_id).length;
    if (n) throw new Error(`Bu maktabda ${n} ta foydalanuvchi bor — avval ularni boshqa maktabga o‘tkazing.`);
    DB.school_classes = DB.school_classes.filter((c) => c.school_id !== p.p_id);
    DB.schools = DB.schools.filter((s) => s.id !== p.p_id);
    return null;
  },
  admin_list_classes: (p) =>
    sortClasses(DB.school_classes.filter((c) => c.school_id === p.p_school_id)).map((c) => ({
      ...c,
      students: DB.profiles.filter((x) => String(x.school_id) === p.p_school_id && x.class_name === c.class_name).length,
    })),
  admin_add_classes: (p) => {
    let added = 0;
    String(p.p_names ?? "").split(/[,;\n]+/).map((v) => v.trim().toUpperCase()).filter(Boolean).forEach((v) => {
      if (!DB.school_classes.some((c) => c.school_id === p.p_school_id && c.class_name === v)) {
        DB.school_classes.push({ id: String(nextId++), school_id: p.p_school_id, class_name: v });
        added++;
      }
    });
    return added;
  },
  admin_rename_class: (p) => {
    const c = DB.school_classes.find((x) => x.id === p.p_id);
    if (!c) throw new Error("Sinf topilmadi.");
    const v = String(p.p_name).trim().toUpperCase();
    DB.profiles.forEach((x) => { if (String(x.school_id) === c.school_id && x.class_name === c.class_name) x.class_name = v; });
    c.class_name = v;
    return null;
  },
  admin_delete_class: (p) => {
    const c = DB.school_classes.find((x) => x.id === p.p_id);
    if (!c) throw new Error("Sinf topilmadi.");
    const n = DB.profiles.filter((x) => String(x.school_id) === c.school_id && x.class_name === c.class_name).length;
    if (n) throw new Error(`Bu sinfda ${n} ta o‘quvchi bor — avval ularni boshqa sinfga o‘tkazing.`);
    DB.school_classes = DB.school_classes.filter((x) => x.id !== p.p_id);
    return null;
  },
};

/* ───── Sessiya (sahifa yangilansa ham saqlanadi) ───── */
const KEY = "eco-demo-session";
function isLoggedIn() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return memLogged;
  }
}
let memLogged = false;
function setLoggedIn(v: boolean) {
  memLogged = v;
  try {
    if (v) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {}
}
const listeners = new Set<(event: string, session: any) => void>();
const emit = (event: string) => listeners.forEach((cb) => setTimeout(() => cb(event, isLoggedIn() ? { user: USER } : null), 0));

let nextId = 1000;

/* ───── So'rov quruvchi ───── */
class Query {
  private filters: ((r: any) => boolean)[] = [];
  private op: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private payload: any = null;
  private orderBy: { col: string; asc: boolean } | null = null;
  private lim: number | null = null;
  private singleMode: "one" | "maybe" | null = null;
  private head = false;
  private wantCount = false;
  private returning = false;

  constructor(private table: string) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (this.op !== "select") this.returning = true;
    if (opts?.head) this.head = true;
    if (opts?.count) this.wantCount = true;
    return this;
  }
  insert(v: any) { this.op = "insert"; this.payload = v; return this; }
  upsert(v: any) { this.op = "upsert" as any; this.payload = v; return this; }
  update(v: any) { this.op = "update"; this.payload = v; return this; }
  delete() { this.op = "delete"; return this; }
  eq(c: string, v: any) { this.filters.push((r) => r[c] === v); return this; }
  is(c: string, v: any) { this.filters.push((r) => (r[c] ?? null) === v); return this; }
  gte(c: string, v: any) { this.filters.push((r) => r[c] >= v); return this; }
  in(c: string, v: any[]) { this.filters.push((r) => v.includes(r[c])); return this; }
  order(col: string, o?: { ascending?: boolean }) { this.orderBy = { col, asc: o?.ascending !== false }; return this; }
  limit(n: number) { this.lim = n; return this; }
  maybeSingle() { this.singleMode = "maybe"; return this; }
  single() { this.singleMode = "one"; return this; }

  private run(): { data: any; error: any; count?: number } {
    const rows = (DB[this.table] ||= []);
    const match = (r: any) => this.filters.every((f) => f(r));

    if (this.op === "upsert") {
      const list = Array.isArray(this.payload) ? this.payload : [this.payload];
      list.forEach((p: any) => {
        const ex = rows.find((r) => r.key === p.key);
        if (ex) Object.assign(ex, p);
        else rows.push({ ...p });
      });
      return { data: null, error: null };
    }

    if (this.op === "insert") {
      const items = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((p: any) => {
        const base: any = ["challenges", "eco_events", "mentors"].includes(this.table)
          ? { created_at: new Date().toISOString() }
          : { submitted_at: new Date().toISOString(), status: "pending", awarded_points: 0 };
        const row: any = { id: nextId++, ...base, ...p };
        const me = DB.profiles[0];
        if (this.table === "challenge_submissions") {
          const ch = DB.challenges.find((c) => c.id === row.challenge_id);
          row.challenges = ch ? { title: ch.title, points: ch.points } : null;
          row.profiles = { full_name: me.full_name, class_name: me.class_name };
        }
        if (this.table === "recycling_submissions") {
          // Sinf yozuvi: bazadagi trigger kabi darhol tasdiqlanadi
          Object.assign(row, { student_id: null, school_id: 1, profiles: null, status: "approved", verified_amount_kg: row.amount_kg, awarded_points: Math.round(row.amount_kg * 25), class_name: String(row.class_name || "").toUpperCase() });
        }
        if (this.table === "mentors") row.sort_order ??= 0;
        return row;
      });
      rows.unshift(...items);
      return { data: this.returning ? items : null, error: null };
    }

    if (this.op === "update") {
      const hit = rows.filter(match);
      hit.forEach((r) => {
        Object.assign(r, this.payload);
        // Ball hisoblash (haqiqiy loyihada buni bazadagi trigger qiladi)
        if (this.payload.status === "approved") {
          if (this.table === "challenge_submissions") r.awarded_points = r.challenges?.points ?? 0;
          if (this.table === "recycling_submissions") r.awarded_points = Math.round((r.verified_amount_kg ?? r.amount_kg) * 25);
          if (r.student_id === UID) DB.profiles[0].points += r.awarded_points;
        }
        if (this.payload.status === "published" && r.student_id === UID) DB.profiles[0].points += r.awarded_points;
      });
      return { data: structuredClone(hit), error: null };
    }

    if (this.op === "delete") {
      const hit = rows.filter(match);
      DB[this.table] = rows.filter((r) => !hit.includes(r));
      return { data: hit.map((r) => ({ id: r.id })), error: null };
    }

    let out = rows.filter(match);
    if (this.orderBy) {
      const { col, asc } = this.orderBy;
      out = [...out].sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (asc ? 1 : -1));
    }
    if (this.lim !== null) out = out.slice(0, this.lim);
    const count = out.length;
    if (this.head) return { data: null, error: null, count };
    if (this.singleMode) return { data: structuredClone(out[0] ?? null), error: null };
    return { data: structuredClone(out), error: null, count: this.wantCount ? count : undefined };
  }

  then(resolve: (v: any) => any, reject?: (e: any) => any) {
    return new Promise((r) => setTimeout(r, 120)).then(() => this.run()).then(resolve, reject);
  }
}
export function createDemoClient(): any {
  return {
    auth: {
      async getUser() {
        return { data: { user: isLoggedIn() ? USER : null }, error: null };
      },
      async signInWithPassword() {
        setLoggedIn(true);
        emit("SIGNED_IN");
        return { data: { user: USER, session: { user: USER } }, error: null };
      },
      async signUp(opts: any) {
        const meta = opts?.options?.data ?? {};
        Object.assign(DB.profiles[0], {
          full_name: meta.full_name || DB.profiles[0].full_name,
          class_name: meta.class_name || DB.profiles[0].class_name,
          school_code: meta.school_code || DB.profiles[0].school_code,
        });
        setLoggedIn(true);
        emit("SIGNED_IN");
        return { data: { user: { ...USER, identities: [{}] }, session: { user: USER } }, error: null };
      },
      async signOut() {
        setLoggedIn(false);
        emit("SIGNED_OUT");
        return { error: null };
      },
      onAuthStateChange(cb: (event: string, session: any) => void) {
        listeners.add(cb);
        return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
      },
    },
    from: (table: string) => new Query(table),
    rpc: (name: string, params?: any) =>
      new Promise((r) => setTimeout(r, 120)).then(() => {
        try {
          return { data: RPC[name] ? RPC[name](params ?? {}) : [], error: null };
        } catch (e: any) {
          return { data: null, error: { message: e.message } };
        }
      }),
    storage: {
      from: () => ({
        upload: async () => ({ data: {}, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
        remove: async () => ({ data: [], error: null }),
        createSignedUrls: async () => ({ data: [], error: null }),
        createSignedUrl: async () => ({ data: null, error: { message: "demo" } }),
      }),
    },
  };
}
