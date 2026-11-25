/**
 * Qurilma kuchini sahifa chizilishidan OLDIN aniqlaydi (<head> dagi kichik skript).
 *   <html data-perf="lite"> — telefon, planshet, kuchsiz kompyuter: to'xtovsiz animatsiyalar o'chadi
 *   <html data-perf="off">  — "kamroq harakat" yoki trafik tejash yoqilgan: deyarli hech qanday animatsiya yo'q
 *   atributsiz              — kuchli kompyuter: yengillashtirilgan effektlar
 */
export const PERF_SCRIPT = `(function(){try{var d=document.documentElement,n=navigator,m=function(q){return window.matchMedia(q).matches},t="full";
if(m("(prefers-reduced-motion: reduce)")||(n.connection&&n.connection.saveData)||(n.deviceMemory||8)<=2)t="off";
else if(m("(pointer: coarse)")||!m("(hover: hover)")||(n.hardwareConcurrency||8)<=4||(n.deviceMemory||8)<=4)t="lite";
if(t!=="full")d.setAttribute("data-perf",t)}catch(e){}})();`;

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
