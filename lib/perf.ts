/**
 * Qurilma kuchini sahifa chizilishidan OLDIN aniqlaydi (<head> dagi kichik skript).
 *   <html data-perf="lite"> — telefon, planshet, kuchsiz kompyuter: to'xtovsiz animatsiyalar o'chadi
 *   <html data-perf="off">  — effektlar o'chirilgan: tugma orqali, yoki "kamroq harakat", trafik tejash,
 *                              kuchsiz telefon (tanlov qilinmagan bo'lsa) — deyarli hech qanday animatsiya yo'q
 * Foydalanuvchi tanlovi localStorage "eco-effects" ("on" | "off") da saqlanadi; window.__ecoPerf() qayta hisoblaydi.
 *   atributsiz              — kuchli kompyuter: yengillashtirilgan effektlar
 */
export const PERF_SCRIPT = `(function(){var f=window.__ecoPerf=function(){try{var d=document.documentElement,n=navigator,m=function(q){return window.matchMedia(q).matches},
p=null;try{p=localStorage.getItem("eco-effects")}catch(e){}
var mem=n.deviceMemory||8,cores=n.hardwareConcurrency||8,coarse=m("(pointer: coarse)")||!m("(hover: hover)"),
weak=coarse||cores<=4||mem<=4,veryWeak=mem<=2||(coarse&&(mem<=4||cores<=4)),t="full";
if(p==="off")t="off";
else if(p==="on")t=weak?"lite":"full";
else if(m("(prefers-reduced-motion: reduce)")||(n.connection&&n.connection.saveData)||veryWeak)t="off";
else if(weak)t="lite";
if(t==="full")d.removeAttribute("data-perf");else d.setAttribute("data-perf",t)}catch(e){}};f()})();`;

export type PerfTier = "full" | "lite" | "off";

export function perfTier(): PerfTier {
  if (typeof document === "undefined") return "full";
  const v = document.documentElement.dataset.perf;
  return v === "lite" || v === "off" ? v : "full";
}

/** Telefon/kuchsiz qurilma yoki "kamroq harakat" — og'ir effektlarni ishlatmaslik kerak */
export function isCalm() {
  return perfTier() !== "full";
}
