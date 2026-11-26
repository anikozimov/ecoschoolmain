"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import timoImg from "@/public/timo.webp";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { TELEGRAM_URL } from "@/components/brand";
import { Magnetic, Reveal } from "@/components/effects";

type Impact = {
  paper_kg: number;
  plastic_kg: number;
  active_students: number;
  approved_challenges: number;
  total_points: number;
};

const featured = [
  { icon: "🧴", tag: "Chiqindilar", title: "Plastiksiz bir hafta", text: "Bir martalik plastikdan voz keching — suv idishingizni o‘zingiz bilan olib yuring.", hue: "from-leaf-400/30" },
  { icon: "📄", tag: "Resurslar", title: "Qog‘ozni asraymiz", text: "Daftarning ikki tomoniga yozing, eski qog‘ozni recyclingga topshiring.", hue: "from-[#e9b949]/25" },
  { icon: "💡", tag: "Energiya", title: "Chiroqni o‘chir!", text: "Sinfdan chiqayotganda chiroq va proyektorni o‘chirishni odat qiling.", hue: "from-sky-500/30" },
];

const steps = [
  { n: "01", icon: "🎯", title: "Tanlang", text: "Challenge, recycling yoki tadqiqot — o‘zingizga yoqqanini tanlang." },
  { n: "02", icon: "📸", title: "Isbotlang", text: "Ishni bajaring va rasm yoki izoh bilan dalil yuboring." },
  { n: "03", icon: "⚡", title: "Porlang", text: "Eco Team tasdiqlagach, ballar sizga va sinfingizga qo‘shiladi." },
];


function CountUp({ value, digits = 0 }: { value: number; digits?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      obs.disconnect();
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / 1600);
        setDisplay(value * (1 - Math.pow(1 - p, 4)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    obs.observe(el);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);
  return (
    <span ref={ref}>
      {display.toLocaleString("uz-UZ", { maximumFractionDigits: digits, minimumFractionDigits: digits })}
    </span>
  );
}

/** Sichqonchaga qarab siljiydigan hero sahnasi */
function useParallax() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Faqat sichqonchali qurilmada; ish kadrga bir marta
    if (!window.matchMedia("(pointer: fine)").matches) return;
    let raf = 0;
    let ev: PointerEvent | null = null;
    const apply = () => {
      raf = 0;
      if (!ev) return;
      el.style.setProperty("--px", (ev.clientX / window.innerWidth - 0.5).toFixed(3));
      el.style.setProperty("--py", (ev.clientY / window.innerHeight - 0.5).toFixed(3));
    };
    const onMove = (e: PointerEvent) => {
      ev = e;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);
  return ref;
}

export default function Home() {
  const { user, profile } = useSession();
  const [impact, setImpact] = useState<Impact | null>(null);
  const scene = useParallax();

  useEffect(() => {
    let active = true;
    createClient()
      .rpc("get_school_overall_impact")
      .then(({ data }) => {
        if (!active || !data) return;
        const row = Array.isArray(data) ? data[0] : data;
        if (row)
          setImpact({
            paper_kg: Number(row.paper_kg) || 0,
            plastic_kg: Number(row.plastic_kg) || 0,
            active_students: Number(row.active_students) || 0,
            approved_challenges: Number(row.approved_challenges) || 0,
            total_points: Number(row.total_points) || 0,
          });
      });
    return () => {
      active = false;
    };
  }, [user]);

  const firstName = profile?.full_name?.trim()?.split(" ")[0];
  const recycled = (impact?.paper_kg ?? 0) + (impact?.plastic_kg ?? 0);

  return (
    <div ref={scene} className="[--px:0] [--py:0]">
      {/* ═════════════ HERO ═════════════ */}
      <section className="relative -mt-[72px] min-h-[100svh] overflow-hidden pt-[72px]">
        {/* gorizont nuri */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-[radial-gradient(ellipse_70%_100%_at_50%_100%,rgb(63_214_160/0.22),transparent_70%)]" />
        <div className="pointer-events-none absolute inset-0 leaf-pattern opacity-40 [mask-image:radial-gradient(ellipse_at_center,#000,transparent_75%)]" />

        <div className="container-page relative grid min-h-[calc(100svh-72px)] items-center gap-10 py-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="relative z-10">
            <Reveal>
              <span className="glass-strong inline-flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-xs font-bold text-ink">
                <span className="relative flex h-6 items-center rounded-full bg-glow px-2.5 text-[10px] font-black text-forest-950">
                  <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-forest-950" />
                  LIVE
                </span>
                {impact?.active_students ? `${impact.active_students} nafar o‘quvchi hozir harakatda` : "Kichik harakatlar — katta o‘zgarishlar"}
              </span>
            </Reveal>

            <h1 className="mt-7 text-[clamp(2.6rem,6.6vw,5.6rem)] font-semibold leading-[0.95] tracking-[-0.045em]">
              <Reveal as="span" className="block" delay={80}>
                <span className="block">{user ? `Salom, ${firstName || "qahramon"}` : "Sayyora"}</span>
              </Reveal>
              <Reveal as="span" className="block pb-2" delay={180}>
                <span className="block italic text-aurora">{user ? "bugun nimani yaxshilaymiz?" : "sizni kutmoqda."}</span>
              </Reveal>
            </h1>

            <Reveal delay={300}>
              <p className="mt-7 max-w-xl text-lg leading-8 text-muted">
                ECO SCHOOL — challenge’lar, recycling va tadqiqotlar orqali har bir harakatingizni ballga,
                har bir ballni esa haqiqiy o‘zgarishga aylantiruvchi maktab platformasi.
              </p>
            </Reveal>

            <Reveal delay={420}>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Magnetic>
                  <Link
                    href={user ? "/challenges" : "/login?mode=register"}
                    className="btn btn-primary glow-pulse px-8 py-4 text-base"
                  >
                    {user ? "Challenge boshlash" : "Harakatga qo‘shilish"} <span aria-hidden>→</span>
                  </Link>
                </Magnetic>
                <Link href={user ? "/profile" : "/impact"} className="btn btn-ghost px-7 py-4 text-base">
                  {user ? `⚡ ${profile?.points ?? 0} ball` : "Natijalarni ko‘rish"}
                </Link>
              </div>
            </Reveal>

            <Reveal delay={540}>
              <div className="mt-12 grid max-w-lg grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line bg-line">
                {[
                  { v: impact?.active_students, l: "o‘quvchi", d: 0 },
                  { v: recycled, l: "kg yig‘ildi", d: 0 },
                  { v: impact?.approved_challenges, l: "challenge", d: 0 },
                ].map((s) => (
                  <div key={s.l} className="bg-cream/80 px-4 py-4 backdrop-blur">
                    <p className="font-display text-3xl font-semibold text-ink">
                      {s.v !== undefined && impact ? <CountUp value={s.v} digits={s.d} /> : "—"}
                    </p>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted">{s.l}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Portal + Timo */}
          <div className="relative mx-auto aspect-square w-full max-w-[520px]">
            <div
              className="absolute inset-0 transition-transform duration-300 ease-out"
              style={{ transform: "translate3d(calc(var(--px) * -30px), calc(var(--py) * -30px), 0)" }}
            >
              <div className="absolute inset-[6%] rounded-full bg-[radial-gradient(circle,rgb(142_240_138/0.35),rgb(31_143_78/0.15)_45%,transparent_70%)] blur-2xl" />
              <div className="portal-ring inset-[8%]" />
              <div className="portal-ring inset-[16%] [animation-direction:reverse] [animation-duration:14s] opacity-60" />
              <div className="absolute inset-[2%] rounded-full border border-dashed border-leaf-400/20" />

              <div className="orbit">
                <span className="left-1/2 top-0 -translate-x-1/2 glass-strong grid h-14 w-14 place-items-center rounded-2xl text-2xl">♻️</span>
                <span className="bottom-[6%] left-[4%] glass-strong grid h-12 w-12 place-items-center rounded-2xl text-xl">💧</span>
                <span className="bottom-[6%] right-[4%] glass-strong grid h-12 w-12 place-items-center rounded-2xl text-xl">☀️</span>
              </div>
              <div className="orbit orbit-rev inset-[-6%]">
                <span className="left-0 top-1/2 -translate-y-1/2 glass-strong grid h-11 w-11 place-items-center rounded-full text-lg">🌳</span>
                <span className="right-0 top-1/3 glass-strong grid h-11 w-11 place-items-center rounded-full text-lg">🦋</span>
              </div>
            </div>

            <div
              className="absolute inset-[10%] transition-transform duration-300 ease-out"
              style={{ transform: "translate3d(calc(var(--px) * 26px), calc(var(--py) * 20px), 0)" }}
            >
              <Image
                src={timoImg}
                alt="Timo — ECO SCHOOL maskoti"
                width={1272}
                height={1236}
                priority
                sizes="(max-width: 768px) 80vw, 460px"
                className="h-full w-full animate-float object-contain drop-shadow-[0_0_50px_rgba(142,240,138,0.45)]"
              />
            </div>

            <div className="glass-strong absolute -right-2 top-[6%] z-20 max-w-[200px] rounded-3xl rounded-bl-md px-4 py-3 sm:-right-8">
              <p className="text-sm font-extrabold text-ink">Salom! Men Timo 🐢</p>
              <p className="mt-0.5 text-xs leading-5 text-muted">Sayyorani birga qutqaramiz!</p>
            </div>
          </div>
        </div>

        <a
          href="#explore"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("explore")?.scrollIntoView({ behavior: "smooth" });
          }}
          className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-muted md:flex">
          Pastga
          <span className="relative h-10 w-6 rounded-full border border-ink/25">
            <span className="absolute left-1/2 top-2 h-2 w-1 -translate-x-1/2 animate-bounce rounded-full bg-leaf-300" />
          </span>
        </a>
      </section>

      <span id="explore" />

      {/* ═════════════ BENTO ═════════════ */}
      <section className="container-page py-24 sm:py-32">
        <Reveal>
          <p className="eyebrow">Maktabimiz raqamlarda</p>
          <h2 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.05] sm:text-6xl">
            Har bir gramm <span className="italic text-aurora">hisobda.</span>
          </h2>
        </Reveal>

        <div className="mt-14 grid auto-rows-[minmax(180px,auto)] gap-4 md:grid-cols-4">
          <Reveal className="md:col-span-2 md:row-span-2">
            <Link href="/impact" className="card group flex h-full flex-col justify-between overflow-hidden p-8">
              <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-leaf-400/20 blur-3xl transition-transform duration-700 group-hover:scale-125" />
              <div className="flex items-center justify-between">
                <span className="chip bg-leaf-200 text-accent">♻️ Jami recycling</span>
                <span className="text-sm font-bold text-muted transition group-hover:text-accent">Batafsil ↗</span>
              </div>
              <div>
                <p className="font-display text-[clamp(4rem,10vw,8rem)] font-semibold leading-none text-glow">
                  {impact ? <CountUp value={recycled} digits={1} /> : "—"}
                  <span className="ml-2 font-sans text-2xl font-bold text-muted">kg</span>
                </p>
                <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-ink/5">
                  <div className="bar-grow bg-gradient-to-r from-[#e9b949] to-[#d99a1e]" style={{ width: `${recycled ? ((impact?.paper_kg ?? 0) / recycled) * 100 : 50}%` }} />
                  <div className="bar-grow flex-1 bg-gradient-to-r from-sky-500 to-[#3fd6a0]" />
                </div>
                <div className="mt-3 flex justify-between text-sm font-bold text-muted">
                  <span>📄 Qog‘oz {impact ? impact.paper_kg.toFixed(1) : "—"} kg</span>
                  <span>🧴 Plastik {impact ? impact.plastic_kg.toFixed(1) : "—"} kg</span>
                </div>
              </div>
            </Link>
          </Reveal>

          <Reveal delay={100} className="md:col-span-2">
            <div className="card flex h-full items-center justify-between gap-6 overflow-hidden p-7">
              <div>
                <p className="text-sm font-bold text-muted">Jami to‘plangan ballar</p>
                <p className="mt-2 font-display text-6xl font-semibold text-ink">
                  {impact ? <CountUp value={impact.total_points} /> : "—"}
                </p>
              </div>
              <div className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full bg-glow text-4xl shadow-[0_0_60px_-10px_rgb(200_245_111/0.9)]">
                ⚡
              </div>
            </div>
          </Reveal>

          <Reveal delay={180}>
            <Link href="/leaderboard" className="card group flex h-full flex-col justify-between p-7">
              <span className="text-4xl transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-125">🏆</span>
              <div>
                <p className="font-display text-4xl font-semibold">{impact ? <CountUp value={impact.active_students} /> : "—"}</p>
                <p className="text-sm font-bold text-muted">faol eko-qahramon</p>
              </div>
            </Link>
          </Reveal>

          <Reveal delay={240}>
            <Link href="/challenges" className="card group flex h-full flex-col justify-between p-7">
              <span className="text-4xl transition-transform duration-500 group-hover:rotate-12 group-hover:scale-125">🎯</span>
              <div>
                <p className="font-display text-4xl font-semibold">{impact ? <CountUp value={impact.approved_challenges} /> : "—"}</p>
                <p className="text-sm font-bold text-muted">bajarilgan challenge</p>
              </div>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ═════════════ QADAMLAR ═════════════ */}
      <section className="relative py-24 sm:py-28">
        <div className="container-page">
          <Reveal>
            <div className="text-center">
              <p className="eyebrow justify-center">Qanday ishlaydi</p>
              <h2 className="mt-4 text-5xl font-semibold sm:text-6xl">
                Uch qadam. <span className="italic text-aurora">Cheksiz ta’sir.</span>
              </h2>
            </div>
          </Reveal>

          <div className="relative mt-16 grid gap-6 md:grid-cols-3">
            <div className="absolute left-[16%] right-[16%] top-[52px] hidden h-px overflow-hidden bg-line md:block">
              <span className="beam" />
            </div>
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 140}>
                <div className="group text-center">
                  <div className="relative mx-auto grid h-[104px] w-[104px] place-items-center rounded-[2rem] glass-strong text-5xl transition duration-500 group-hover:-translate-y-1">
                    {s.icon}
                    <span className="absolute -right-3 -top-3 grid h-9 w-9 place-items-center rounded-full bg-glow font-display text-sm font-bold text-forest-950">
                      {s.n}
                    </span>
                  </div>
                  <h3 className="mt-7 text-3xl font-semibold">{s.title}</h3>
                  <p className="mx-auto mt-2 max-w-xs leading-7 text-muted">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════════ CHALLENGE'LAR ═════════════ */}
      <section className="container-page py-20">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow">Eco challenge’lar</p>
              <h2 className="mt-4 text-5xl font-semibold sm:text-6xl">
                Bugungi <span className="italic text-aurora">missiyalar</span>
              </h2>
            </div>
            <Link href="/challenges" className="btn btn-ghost">Barchasi →</Link>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {featured.map((c, i) => (
            <Reveal key={c.title} delay={i * 120}>
              <Link href="/challenges" className="card group flex h-full flex-col overflow-hidden p-7 transition duration-500 hover:-translate-y-2">
                <div className={`pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b ${c.hue} to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-100`} />
                <div className="flex items-center justify-between">
                  <span className="chip bg-ink/[0.06] text-ink ring-1 ring-ink/10">{c.tag}</span>
                  <span className="font-display text-sm text-muted">0{i + 1}</span>
                </div>
                <div className="mt-10 text-6xl transition-transform duration-500 group-hover:-translate-y-2 group-hover:scale-110 group-hover:-rotate-6">
                  {c.icon}
                </div>
                <h3 className="mt-8 text-3xl font-semibold">{c.title}</h3>
                <p className="mt-3 flex-1 leading-7 text-muted">{c.text}</p>
                <span className="mt-8 inline-flex items-center gap-2 font-extrabold text-accent">
                  Missiyani boshlash
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-leaf-200 transition-transform duration-300 group-hover:translate-x-1">→</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═════════════ HAMJAMIYAT ═════════════ */}
      <section className="container-page grid gap-5 py-12 md:grid-cols-3">
        {[
          { href: "/class-leaderboard", icon: "🏫", title: "Sinflar bellashuvi", text: "Qaysi sinf eng yashil? Do‘stona raqobat.", ext: false },
          { href: "/calendar", icon: "📅", title: "Eco taqvim", text: "Tadbirlar va muhim sanalarni o‘tkazib yubormang.", ext: false },
          { href: TELEGRAM_URL, icon: "✈️", title: "Telegram", text: "Eco Future Andijan kanali — yangiliklar birinchi bo‘lib.", ext: true },
        ].map((x, i) => (
          <Reveal key={x.title} delay={i * 100}>
            <Link
              href={x.href}
              {...(x.ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="card group flex h-full items-center gap-5 p-6"
            >
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-ink/[0.06] text-3xl ring-1 ring-ink/10 transition duration-500 group-hover:scale-110 group-hover:bg-leaf-200">
                {x.icon}
              </span>
              <span className="flex-1">
                <span className="block text-xl font-extrabold">{x.title}</span>
                <span className="mt-1 block text-sm text-muted">{x.text}</span>
              </span>
              <span className="text-xl text-muted transition group-hover:translate-x-1 group-hover:text-accent">{x.ext ? "↗" : "→"}</span>
            </Link>
          </Reveal>
        ))}
      </section>

      {/* ═════════════ CTA ═════════════ */}
      <section className="container-page pb-28 pt-16">
        <Reveal from="scale">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-line px-7 py-20 text-center sm:px-14 sm:py-28">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(142_240_138/0.28),transparent_65%)]" />
            <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 opacity-40">
              <div className="portal-ring" />
            </div>
            <div className="relative">
              <p className="eyebrow justify-center">Sizning navbatingiz</p>
              <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] sm:text-6xl">
                Kelajak <span className="italic text-aurora">bugun</span> boshlanadi.
              </h2>
              <p className="mx-auto mt-6 max-w-md text-lg text-muted">
                {user ? "Yangi challenge sizni kutmoqda — bir qadam, va siz reytingda yuqoriroqsiz." : "Maktab kodingiz va email kifoya. Bir daqiqa ham ketmaydi."}
              </p>
              <div className="mt-10 flex justify-center">
                <Magnetic strength={0.4}>
                  <Link href={user ? "/challenges" : "/login?mode=register"} className="btn btn-primary glow-pulse px-10 py-5 text-lg">
                    {user ? "Missiyani tanlash" : "Hoziroq qo‘shilish"} →
                  </Link>
                </Magnetic>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
