/**
 * Login (foydalanuvchi nomi) bilan kirish.
 *
 * Supabase Auth ichkarida email talab qiladi, shuning uchun login
 * "login@<LOGIN_DOMAIN>" ko'rinishidagi ichki manzilga aylantiriladi.
 * Bu manzilga hech qachon xat yuborilmaydi (Supabase'da "Confirm email" o'chiq).
 * Oldin email bilan ochilgan akkauntlar emailni yozib kirishda davom etadi.
 */
export const LOGIN_DOMAIN = (process.env.NEXT_PUBLIC_LOGIN_DOMAIN || "ecoschool.uz").toLowerCase();

export const USERNAME_RE = /^[a-z0-9_.]{3,24}$/;

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

/** Kiritilgan login yoki emailni Supabase uchun emailga aylantiradi. */
export function loginToEmail(value: string) {
  const v = value.trim().toLowerCase();
  return v.includes("@") ? v : `${v}@${LOGIN_DOMAIN}`;
}

/** Ichki manzil bo'lsa — loginni, aks holda haqiqiy emailni qaytaradi. */
export function displayLogin(email?: string | null, username?: string | null) {
  if (username) return username;
  if (!email) return "";
  return email.endsWith(`@${LOGIN_DOMAIN}`) ? email.slice(0, -(LOGIN_DOMAIN.length + 1)) : email;
}

export function usernameError(value: string): string | null {
  const v = normalizeUsername(value);
  if (v.length < 3) return "Login kamida 3 ta belgidan iborat bo‘lsin.";
  if (v.length > 24) return "Login 24 ta belgidan oshmasin.";
  if (!USERNAME_RE.test(v)) return "Loginda faqat lotin harflari, raqamlar, nuqta va _ ishlatilsin (bo‘sh joysiz).";
  return null;
}

export const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  mentor: "Tekshiruvchi",
  volunteer: "Volontyor",
  student: "O‘quvchi",
};
