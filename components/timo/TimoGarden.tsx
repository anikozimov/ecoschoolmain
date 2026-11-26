"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DayPhase, MilestoneId, OutfitId } from "@/lib/timo";
import { MILESTONES, unlocked, zonesOpen } from "@/lib/timo";
import { TimoFigure } from "./TimoFigure";

const W = 3000; // 3 hudud × 1000
const H = 560;

const SKY: Record<DayPhase, [string, string, string]> = {
  dawn: ["#2b3d6b", "#f39c7a", "#ffd89a"],
  day: ["#3d8fd6", "#8fc9f2", "#d7f0ff"],
  dusk: ["#2a2350", "#c4567a", "#f5a25d"],
  night: ["#040a1c", "#0b1838", "#16305a"],
};
const GROUND: Record<DayPhase, [string, string, string]> = {
  dawn: ["#4d8f4a", "#3a7a3e", "#2a5f33"],
  day: ["#7cc65c", "#5aad4c", "#3f8f40"],
  dusk: ["#4f7f45", "#3d6a3b", "#2b5131"],
  night: ["#1d4630", "#163a27", "#0f2b1c"],
};

// Barqaror "tasodifiy" yulduzlar (har chizishda o'zgarmasin)
function seeded(n: number) {
  let s = 7;
  return Array.from({ length: n }, () => {
    s = (s * 9301 + 49297) % 233280;
    const a = s / 233280;
    s = (s * 9301 + 49297) % 233280;
    const b = s / 233280;
    return [a * W, b * 230];
  });
}

function Flower({ x, y, c, s = 1 }: { x: number; y: number; c: string; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="g-sway-sm">
      <path d="M0 0 C-2 -10 2 -18 0 -26" stroke="#2f7d3a" strokeWidth="2.2" fill="none" />
      <ellipse cx="-6" cy="-10" rx="5" ry="2.4" fill="#3f9a4a" transform="rotate(-30 -6 -10)" />
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="0" cy="-33" rx="4" ry="7" fill={c} transform={`rotate(${a} 0 -26)`} />
      ))}
      <circle cx="0" cy="-26" r="3.6" fill="#ffd34d" />
      </g>
    </g>
  );
}

function Pine({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-5" y="-14" width="10" height="16" fill="#5b3a22" />
      <path d="M0 -110 L34 -50 L18 -50 L42 -14 L-42 -14 L-18 -50 L-34 -50 Z" fill="#1f6b3d" />
      <path d="M0 -110 L34 -50 L18 -50 L42 -14 L0 -14 Z" fill="#185a33" />
    </g>
  );
}

export function TimoGarden({
  tasks,
  outfit,
  phase,
  fresh,
  watering,
  name,
  onTimo,
  bubble,
  happy,
}: {
  tasks: number;
  outfit: OutfitId;
  phase: DayPhase;
  fresh: Set<MilestoneId>;
  watering: boolean;
  name?: string;
  onTimo?: () => void;
  bubble?: string | null;
  happy?: boolean;
}) {
  const has = useMemo(() => unlocked(tasks), [tasks]);
  const open = zonesOpen(tasks);
  const stars = useMemo(() => seeded(70), []);
  const scroller = useRef<HTMLDivElement>(null);
  const [zone, setZone] = useState(1);
  const night = phase === "night";
  const [sky0, sky1, sky2] = SKY[phase];
  const [g0, g1, g2] = GROUND[phase];
  const cls = (id: MilestoneId) => (fresh.has(id) ? "grow-in" : "");

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    // Boshida Timo ekran markazida bo'lsin (telefonda ayniqsa)
    const timoX = (510 / W) * el.scrollWidth;
    if (timoX > el.clientWidth * 0.6) el.scrollLeft = Math.max(0, timoX - el.clientWidth / 2);
    const onScroll = () => setZone(Math.min(3, Math.floor((el.scrollLeft + el.clientWidth / 3) / (el.scrollWidth / 3)) + 1));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  function goZone(z: number) {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ left: ((z - 1) * el.scrollWidth) / 3, behavior: "smooth" });
  }

  const lockLabel = (z: 2 | 3) => {
    const m = MILESTONES.find((x) => x.zone === z)!;
    return { title: z === 2 ? "Yashil vodiy" : "Tog‘ etagi", at: m.at, left: Math.max(0, m.at - tasks) };
  };

  return (
    <div className="relative">
      <div ref={scroller} className="garden-scroll overflow-x-auto overflow-y-hidden rounded-[22px] ring-1 ring-white/10" tabIndex={0} aria-label={`${name ? name + "ning" : "Timo"} bog‘i`}>
        <div className="garden-stage relative h-[340px] sm:h-[460px] lg:h-[500px]" style={{ aspectRatio: `${W} / ${H}` }}>
          <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" role="img" aria-label="Timo virtual bog‘i">
            <defs>
              <linearGradient id="g-sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={sky0} />
                <stop offset="0.6" stopColor={sky1} />
                <stop offset="1" stopColor={sky2} />
              </linearGradient>
              <linearGradient id="g-ground" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={g0} />
                <stop offset="0.5" stopColor={g1} />
                <stop offset="1" stopColor={g2} />
              </linearGradient>
              <linearGradient id="g-water" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={night ? "#244e7a" : "#7fd0f5"} />
                <stop offset="1" stopColor={night ? "#123058" : "#3d9bd6"} />
              </linearGradient>
              <linearGradient id="g-fog" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={night ? "#1a2a44" : "#dfe9f0"} stopOpacity={night ? 0.7 : 0.55} />
                <stop offset="1" stopColor={night ? "#0e1a2c" : "#c6d6df"} stopOpacity={night ? 0.9 : 0.85} />
              </linearGradient>
              <radialGradient id="g-sun">
                <stop offset="0" stopColor="#fff7d1" />
                <stop offset="0.45" stopColor={phase === "dusk" ? "#ffb36b" : "#ffe27a"} />
                <stop offset="1" stopColor={phase === "dusk" ? "#ff8a5c" : "#ffd34d"} stopOpacity="0" />
              </radialGradient>
              <radialGradient id="g-glow">
                <stop offset="0" stopColor="#fff6a8" />
                <stop offset="1" stopColor="#fff6a8" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="g-rainbow" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#ff6b6b" />
                <stop offset="0.2" stopColor="#ffb84d" />
                <stop offset="0.4" stopColor="#ffe45c" />
                <stop offset="0.6" stopColor="#6fdc7a" />
                <stop offset="0.8" stopColor="#5cb6f5" />
                <stop offset="1" stopColor="#9a7bf0" />
              </linearGradient>
            </defs>

            {/* Osmon */}
            <rect width={W} height={H} fill="url(#g-sky)" />
            {night && (
              <g>
                {stars.map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r={i % 7 === 0 ? 2.2 : 1.3} fill="#fff" className={i % 3 === 0 ? "g-twinkle" : ""} style={{ animationDelay: `${(i % 9) * 0.4}s` }} opacity="0.85" />
                ))}
                <circle cx="780" cy="95" r="34" fill="#f4f1dc" />
                <circle cx="794" cy="86" r="30" fill={sky0} />
              </g>
            )}
            {phase === "day" && <circle cx="820" cy="95" r="90" fill="url(#g-sun)" className="g-pulse" />}
            {phase === "dawn" && <circle cx="170" cy="270" r="110" fill="url(#g-sun)" />}
            {phase === "dusk" && <circle cx="900" cy="250" r="110" fill="url(#g-sun)" />}

            {/* Bulutlar */}
            {!night &&
              [
                [120, 80, 1],
                [1300, 60, 1.3],
                [2350, 100, 1.1],
              ].map(([x, y, s], i) => (
                <g key={i} className="g-cloud" style={{ animationDelay: `${-i * 14}s` }}>
                  <g transform={`translate(${x} ${y}) scale(${s})`} fill="#fff" opacity={phase === "day" ? 0.9 : 0.55}>
                    <ellipse cx="0" cy="0" rx="60" ry="22" />
                    <ellipse cx="-34" cy="6" rx="36" ry="18" />
                    <ellipse cx="38" cy="8" rx="40" ry="16" />
                    <ellipse cx="6" cy="-14" rx="34" ry="20" />
                  </g>
                </g>
              ))}

            {/* Uzoq tog'lar (3-hudud) — har doim ko'rinadi, ochilsa qor qoplaydi */}
            <path d="M1700 330 L1950 150 L2120 290 L2330 90 L2560 300 L2750 130 L3000 300 L3000 360 L1700 360 Z" fill={night ? "#1b2b48" : "#7d97b8"} opacity="0.85" />
            {has.has("mountains") && (
              <g fill="#f4f8fb" className={cls("mountains")}>
                <path d="M2330 90 L2380 140 L2350 132 L2330 150 L2305 128 L2285 136 Z" />
                <path d="M2750 130 L2800 175 L2770 168 L2752 184 L2730 165 L2708 172 Z" />
                <path d="M1950 150 L1990 180 L1965 176 L1948 190 L1930 175 Z" />
              </g>
            )}

            {/* Orqa tepaliklar */}
            <path d="M0 330 C200 270 380 300 520 320 C700 345 860 280 1000 300 C1200 330 1350 270 1550 300 C1750 330 1900 290 2100 320 C2300 350 2500 300 2700 320 C2850 335 2950 310 3000 320 L3000 420 L0 420 Z" fill={night ? "#173a2a" : "#4f9a52"} opacity="0.9" />

            {/* Asosiy yer */}
            <path d="M0 395 C180 375 360 392 520 385 C700 377 860 398 1000 390 C1200 380 1400 400 1600 388 C1800 376 2000 396 2200 389 C2400 382 2600 398 2800 388 L3000 384 L3000 560 L0 560 Z" fill="url(#g-ground)" />
            {/* Yo'lak */}
            <path d="M0 500 C200 470 330 545 520 530 C720 515 820 470 1000 482 C1180 494 1300 540 1500 528 C1700 516 1850 470 2050 486 C2250 502 2400 540 2600 525 C2800 510 2900 490 3000 495" stroke={night ? "#5d4a35" : "#d9bf8c"} strokeWidth="26" strokeLinecap="round" fill="none" opacity="0.75" />

            {/* ═════ 1-HUDUD ═════ */}
            {/* Daraxt (10) */}
            {has.has("tree") && (
              <g className={cls("tree")}>
                <path d="M212 455 C216 400 214 340 222 300 L246 300 C252 340 250 400 256 455 Z" fill="#6b4529" />
                <path d="M226 330 C200 310 186 300 172 280 M244 320 C268 300 280 292 296 276" stroke="#6b4529" strokeWidth="9" strokeLinecap="round" fill="none" />
                <g className="g-sway">
                  <circle cx="234" cy="235" r="92" fill="#2f8a43" />
                  <circle cx="160" cy="265" r="62" fill="#3a9a4c" />
                  <circle cx="310" cy="262" r="64" fill="#33914a" />
                  <circle cx="236" cy="170" r="64" fill="#46a857" />
                  <circle cx="200" cy="210" r="30" fill="#58b765" opacity="0.6" />
                  {[
                    [180, 240],
                    [270, 210],
                    [300, 280],
                    [220, 285],
                    [250, 160],
                    [150, 280],
                  ].map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r="8" fill="#e8453c" stroke="#b52d27" strokeWidth="1.2" />
                  ))}
                </g>
              </g>
            )}
            {!has.has("tree") && tasks > 0 && (
              <g transform="translate(234 452)">
                <path d="M0 0 V-24" stroke="#3f8f40" strokeWidth="3" />
                <ellipse cx="-7" cy="-22" rx="8" ry="4" fill="#6fcf60" transform="rotate(-25 -7 -22)" />
                <ellipse cx="7" cy="-26" rx="8" ry="4" fill="#58b765" transform="rotate(25 7 -26)" />
              </g>
            )}

            {/* Hovuz (15) */}
            {has.has("pond") && (
              <g className={cls("pond")}>
                <ellipse cx="300" cy="518" rx="118" ry="30" fill="#2b6e46" opacity="0.5" />
                <ellipse cx="300" cy="514" rx="110" ry="26" fill="url(#g-water)" />
                <ellipse cx="300" cy="514" rx="40" ry="9" fill="none" stroke="#fff" strokeOpacity="0.5" className="g-ripple" />
                <ellipse cx="300" cy="514" rx="40" ry="9" fill="none" stroke="#fff" strokeOpacity="0.5" className="g-ripple" style={{ animationDelay: "1.6s" }} />
                <ellipse cx="250" cy="510" rx="16" ry="5" fill="#3fa34d" />
                <ellipse cx="355" cy="520" rx="14" ry="4.5" fill="#3fa34d" />
                <circle cx="352" cy="516" r="4" fill="#ff9ec4" />
              </g>
            )}

            {/* Uy (5) */}
            {has.has("house") && (
              <g className={cls("house")}>
                <ellipse cx="760" cy="452" rx="110" ry="10" fill="#000" opacity="0.15" />
                <rect x="684" y="352" width="152" height="98" rx="4" fill="#f3e2c0" stroke="#b98d55" strokeWidth="2" />
                <path d="M666 360 L760 282 L854 360 Z" fill="#c4553b" stroke="#8e3725" strokeWidth="2" strokeLinejoin="round" />
                <path d="M690 345 L760 288 L830 345" stroke="#e07a5c" strokeWidth="4" fill="none" opacity="0.6" />
                <rect x="800" y="290" width="18" height="40" fill="#8e3725" />
                <g className="g-smoke" fill="#fff" opacity="0.6">
                  <circle cx="809" cy="276" r="8" />
                  <circle cx="815" cy="258" r="10" />
                  <circle cx="808" cy="236" r="12" />
                </g>
                <rect x="744" y="392" width="32" height="58" rx="15" fill="#7a4a2a" />
                <circle cx="768" cy="422" r="2.6" fill="#f0b850" />
                {[700, 790].map((x) => (
                  <g key={x}>
                    <rect x={x} y="372" width="30" height="28" rx="3" fill={night || phase === "dusk" ? "#ffd96b" : "#9fd3f2"} stroke="#b98d55" strokeWidth="2" />
                    <path d={`M${x + 15} 372 V400 M${x} 386 H${x + 30}`} stroke="#b98d55" strokeWidth="1.6" />
                    {(night || phase === "dusk") && <rect x={x - 10} y="362" width="50" height="48" fill="url(#g-glow)" opacity="0.5" />}
                  </g>
                ))}
                <path d="M700 450 C700 440 712 436 718 444 C722 434 736 436 734 448 Z M802 450 C800 440 812 436 818 444 C822 434 836 436 834 448 Z" fill="#3f9a4a" />
                <text x="760" y="472" textAnchor="middle" fontSize="13" fontWeight="800" fill={night ? "#b8d8c2" : "#2a5f33"} fontFamily="var(--font-sans)">TIMO</text>
              </g>
            )}

            {/* Qushlar uyasi (7) */}
            {has.has("birds") && (
              <g className={cls("birds")}>
                <rect x="938" y="350" width="7" height="104" fill="#7a4a2a" />
                <path d="M922 352 L941.5 330 L961 352 Z" fill="#c4553b" />
                <rect x="926" y="352" width="31" height="30" fill="#e7c98e" stroke="#9a7840" strokeWidth="1.5" />
                <circle cx="941.5" cy="366" r="6" fill="#5b3a22" />
                {!night && (
                  <g className="g-birds" stroke={phase === "day" ? "#2c3e50" : "#3a2a3a"} strokeWidth="2.4" fill="none" strokeLinecap="round">
                    <path d="M520 150 q10 -10 20 0 q10 -10 20 0" />
                    <path d="M560 125 q8 -8 16 0 q8 -8 16 0" />
                    <path d="M600 160 q7 -7 14 0 q7 -7 14 0" />
                  </g>
                )}
              </g>
            )}

            {/* Gullar (1) */}
            {has.has("flowers") && (
              <g className={cls("flowers")}>
                <Flower x={50} y={505} c="#ff7aa8" />
                <Flower x={92} y={532} c="#ffd34d" s={0.9} />
                <Flower x={640} y={520} c="#b68cff" />
                <Flower x={672} y={540} c="#ff7a5c" s={0.85} />
                <Flower x={905} y={512} c="#ff7aa8" s={0.95} />
                <Flower x={960} y={545} c="#5cc8f0" s={0.9} />
                <Flower x={140} y={470} c="#fff" s={0.75} />
              </g>
            )}

            {/* Kapalaklar (3) */}
            {has.has("butterflies") &&
              [
                [600, 420, "#ff9ec4", 0],
                [130, 410, "#ffd34d", 2],
                [880, 430, "#9fd3f2", 4],
              ].map(([x, y, c, d], i) => (
                <g key={i} className={`g-bfly ${cls("butterflies")}`} style={{ animationDelay: `${-Number(d)}s` }}>
                  <g transform={`translate(${x} ${y})`}>
                    <g className="g-wing">
                      <ellipse cx="-6" cy="-3" rx="7" ry="9" fill={String(c)} />
                      <ellipse cx="6" cy="-3" rx="7" ry="9" fill={String(c)} />
                      <ellipse cx="-5" cy="7" rx="4.5" ry="5" fill={String(c)} opacity="0.8" />
                      <ellipse cx="5" cy="7" rx="4.5" ry="5" fill={String(c)} opacity="0.8" />
                    </g>
                    <rect x="-1.2" y="-8" width="2.4" height="18" rx="1.2" fill="#3a2a1a" />
                  </g>
                </g>
              ))}

            {/* Sug'orish */}
            {watering && (
              <g className="g-rain" stroke="#9fd8ff" strokeWidth="3" strokeLinecap="round">
                {Array.from({ length: 34 }, (_, i) => {
                  const x = 30 + ((i * 97) % 960);
                  return <line key={i} x1={x} y1={-20} x2={x - 6} y2={8} style={{ animationDelay: `${(i % 10) * 0.12}s` }} />;
                })}
              </g>
            )}

            {/* ═════ 2-HUDUD: Yashil vodiy (20) ═════ */}
            {has.has("valley") && (
              <g className={cls("valley")}>
                <path d="M1440 392 C1430 430 1400 470 1380 500 C1360 530 1352 545 1350 560 L1470 560 C1468 540 1476 520 1490 495 C1510 462 1520 430 1520 392 Z" fill="url(#g-water)" />
                <path d="M1470 400 C1462 440 1440 480 1420 520" stroke="#fff" strokeOpacity="0.55" strokeWidth="3" strokeDasharray="14 22" className="g-flow" fill="none" />
                <path d="M1500 410 C1494 446 1474 486 1452 540" stroke="#fff" strokeOpacity="0.4" strokeWidth="2.4" strokeDasharray="10 26" className="g-flow" fill="none" style={{ animationDelay: "-1s" }} />
                {/* Ko'prik */}
                <path d="M1360 520 C1400 486 1480 486 1520 520" stroke="#8a5a32" strokeWidth="14" fill="none" strokeLinecap="round" />
                <path d="M1364 508 C1404 474 1476 474 1516 508" stroke="#b98d55" strokeWidth="4" fill="none" />
                {[1380, 1410, 1440, 1470, 1500].map((x) => (
                  <line key={x} x1={x} y1={x === 1440 ? 478 : 488} x2={x} y2={x === 1440 ? 496 : 506} stroke="#b98d55" strokeWidth="3" />
                ))}
                <Flower x={1100} y={510} c="#ffd34d" />
                <Flower x={1160} y={540} c="#ff7aa8" s={0.9} />
                <Flower x={1620} y={520} c="#b68cff" />
                <Flower x={1880} y={540} c="#ff7a5c" s={0.9} />
                <Flower x={1940} y={505} c="#fff" s={0.8} />
              </g>
            )}
            {has.has("forest") && (
              <g className={cls("forest")}>
                {[
                  [1060, 410, 0.9],
                  [1120, 420, 1.1],
                  [1185, 405, 0.85],
                  [1250, 425, 1],
                  [1600, 415, 1.05],
                  [1665, 405, 0.85],
                  [1950, 410, 0.95],
                ].map(([x, y, s], i) => (
                  <Pine key={i} x={x} y={y} s={s} />
                ))}
              </g>
            )}
            {has.has("turbine") && (
              <g className={cls("turbine")}>
                <path d="M1786 440 L1792 250 L1800 250 L1806 440 Z" fill="#e8eef2" stroke="#b9c6cf" strokeWidth="1.5" />
                <g transform="translate(1796 248)">
                  <g className="g-blades">
                    <circle r="92" fill="none" />
                    {[0, 120, 240].map((a) => (
                      <path key={a} d="M0 0 C4 -20 6 -60 0 -92 C-5 -60 -4 -20 0 0 Z" fill="#f4f8fb" stroke="#b9c6cf" strokeWidth="1.4" transform={`rotate(${a})`} />
                    ))}
                  </g>
                  <circle r="7" fill="#dfe7ec" stroke="#b9c6cf" strokeWidth="1.5" />
                </g>
              </g>
            )}

            {/* ═════ 3-HUDUD: Tog' etagi (40) ═════ */}
            {has.has("mountains") && (
              <g className={cls("mountains")}>
                <path d="M2380 400 L2420 250 L2560 230 L2600 400 Z" fill={night ? "#3a4560" : "#8b7a66"} />
                <path d="M2470 240 C2480 300 2478 360 2486 420" stroke="#bfe8ff" strokeWidth="26" fill="none" opacity="0.9" />
                <path d="M2470 240 C2480 300 2478 360 2486 420" stroke="#fff" strokeWidth="6" strokeDasharray="10 18" fill="none" className="g-fall" />
                <ellipse cx="2488" cy="440" rx="120" ry="24" fill="url(#g-water)" />
                <ellipse cx="2488" cy="436" rx="60" ry="9" fill="#fff" opacity="0.5" className="g-ripple" />
                <Pine x={2200} y={430} s={1.1} />
                <Pine x={2260} y={440} s={0.8} />
                <Pine x={2700} y={432} s={1} />
                <Pine x={2900} y={420} s={1.15} />
                <Flower x={2120} y={520} c="#5cc8f0" />
                <Flower x={2640} y={530} c="#ffd34d" />
              </g>
            )}
            {has.has("rainbow") && (
              <g className={cls("rainbow")}>
                <path d="M2260 420 A300 300 0 0 1 2860 420" stroke="url(#g-rainbow)" strokeWidth="34" fill="none" opacity="0.55" />
                <g transform="translate(2790 470)">
                  <path d="M-46 0 L-38 -76 C-30 -92 30 -92 38 -76 L46 0 Z" fill="#9aa6a0" stroke="#6b7770" strokeWidth="2" />
                  <circle cx="0" cy="-48" r="20" fill="#1d7438" />
                  <path d="M0 -36 C-9 -42 -11 -52 -8 -58 C-1 -56 2 -48 0 -36 Z M0 -36 C9 -42 11 -52 8 -58 C1 -56 -2 -48 0 -36 Z" fill="#b4f07f" />
                  <text y="-12" textAnchor="middle" fontSize="11" fontWeight="800" fill="#2a3a33" fontFamily="var(--font-sans)">ECO LEGEND</text>
                </g>
              </g>
            )}

            {/* Kechasi bog' biroz qorong'ilashadi (yoritilgan derazalar ajralib turadi) */}
            {night && <rect y="200" width={W} height={H - 200} fill="#0a1430" opacity="0.32" pointerEvents="none" />}
            {phase === "dusk" && <rect width={W} height={H} fill="#3a1f4a" opacity="0.12" pointerEvents="none" />}

            {/* Tungi yorug'lik qo'ng'izlari */}
            {night &&
              Array.from({ length: 14 }, (_, i) => (
                <circle key={i} cx={60 + ((i * 137) % (open * 1000 - 100))} cy={400 + ((i * 53) % 120)} r="3" fill="#fff6a8" className="g-firefly" style={{ animationDelay: `${(i % 7) * 0.7}s` }} />
              ))}

            {/* Yopiq hududlar — tuman */}
            {([2, 3] as const).map((z) =>
              open < z ? (
                <g key={z}>
                  <rect x={(z - 1) * 1000} y="0" width={(4 - z) * 1000} height={H} fill="url(#g-fog)" />
                </g>
              ) : null
            )}
          </svg>

          {/* Yopiq hudud yozuvi */}
          {([2, 3] as const).map((z) => {
            if (open >= z || (z === 3 && open < 2)) return null;
            const l = lockLabel(z);
            return (
              <div key={z} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${((z - 1) * 1000 + 500) / 30}%` }}>
                <div className="rounded-2xl bg-[#0b1820]/80 px-5 py-4 text-center text-white shadow-xl ring-1 ring-white/15 backdrop-blur">
                  <p className="text-2xl">🔒</p>
                  <p className="mt-1 font-display text-lg font-semibold">{l.title}</p>
                  <p className="text-xs text-white/70">{l.at} ta ishda ochiladi · yana {l.left} ta</p>
                </div>
              </div>
            );
          })}
          {open < 2 && (
            <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${2500 / 30}%` }}>
              <div className="rounded-2xl bg-[#0b1820]/70 px-4 py-3 text-center text-white/80 ring-1 ring-white/10 backdrop-blur">
                <p className="text-xl">🏔️</p>
                <p className="text-xs">Tog‘ etagi · 40 ta ish</p>
              </div>
            </div>
          )}

          {/* Timo */}
          <button
            type="button"
            onClick={onTimo}
            className="timo-in-garden absolute -translate-x-1/2"
            style={{ left: `${510 / 30}%`, bottom: `${(H - 528) / (H / 100)}%`, width: `${200 / 30}%` }}
            aria-label="Timo bilan gaplashish"
          >
            <TimoFigure outfit={outfit} mood={happy ? "happy" : night ? "sleep" : "idle"} />
          </button>
          {bubble && (
            <div
              className="timo-bubble pointer-events-none absolute z-10 w-max max-w-[220px] -translate-x-1/2 rounded-2xl bg-white px-3.5 py-2.5 text-[13px] font-bold leading-snug text-[#173b26] shadow-xl sm:max-w-[260px] sm:text-sm"
              style={{ left: `${510 / 30}%`, bottom: `${((H - 528) / (H / 100)) + 36}%` }}
              role="status"
            >
              {bubble}
              <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white" />
            </div>
          )}
        </div>
      </div>

      {/* Hududlar bo'ylab o'tish */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {[
          { z: 1, t: "🌼 Boshlang‘ich maydon" },
          { z: 2, t: `${open >= 2 ? "🏞️" : "🔒"} Yashil vodiy` },
          { z: 3, t: `${open >= 3 ? "🏔️" : "🔒"} Tog‘ etagi` },
        ].map((b) => (
          <button
            key={b.z}
            type="button"
            onClick={() => goZone(b.z)}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold ring-1 transition ${zone === b.z ? "bg-white/12 text-ink ring-white/25" : "text-muted ring-white/10 hover:text-ink"}`}
          >
            {b.t}
          </button>
        ))}
        <span className="ml-auto hidden text-xs text-muted sm:inline">← → bog‘ni suring</span>
      </div>
    </div>
  );
}
