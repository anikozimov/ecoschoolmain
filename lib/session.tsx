"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";

export type Profile = {
  full_name: string | null;
  class_name: string | null;
  school_code: string | null;
  school_id: number | null;
  points: number | null;
  role: string | null;
  username?: string | null;
  is_owner?: boolean | null;
};

export type SessionState = {
  user: User | null;
  profile: Profile | null;
  /** To'liq admin: saytni boshqaradi */
  isAdmin: boolean;
  /** Mentor: faqat topshiriqlarni tekshiradi */
  isMentor: boolean;
  /** Admin yoki mentor — admin panelga kira oladi */
  isStaff: boolean;
  isVolunteer: boolean;
  /** Bosh admin (Supabase'da tayinlangan) */
  isOwner: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
};

/**
 * Joriy foydalanuvchi va uning profilini yuklaydi.
 * Muhim: bu faqat interfeys uchun. Haqiqiy ruxsatlar Supabase RLS
 * siyosatlari orqali bazada tekshirilishi shart (SECURITY.md ga qarang).
 */
function useSessionLoader(): SessionState {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    try {
      const { data } = await supabase.auth.getUser();
      const currentUser = data.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const base = "full_name, class_name, school_code, school_id, points, role";
        const first = await supabase
          .from("profiles")
          .select(`${base}, username, is_owner`)
          .eq("id", currentUser.id)
          .maybeSingle();
        let profileData = first.data;
        if (first.error) {
          // Yangi migratsiya hali ishga tushirilmagan bo'lsa — eski ustunlar bilan
          ({ data: profileData } = await supabase.from("profiles").select(base).eq("id", currentUser.id).maybeSingle());
        }
        setProfile((profileData as Profile) ?? null);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error("Session load error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        // Supabase callback ichida to‘g‘ridan-to‘g‘ri auth so‘rov yuborish lock'ni bloklaydi
        setTimeout(() => load(), 0);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  return {
    user,
    profile,
    isAdmin: profile?.role === "admin",
    isMentor: profile?.role === "mentor",
    isStaff: profile?.role === "admin" || profile?.role === "mentor",
    isVolunteer: profile?.role === "volunteer",
    isOwner: profile?.role === "admin" && !!profile?.is_owner,
    loading,
    refresh: load,
  };
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const value = useSessionLoader();
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}

/** Bazadan kelgan texnik xatolarni foydalanuvchiga ko‘rsatmaymiz. */
export function friendlyError(prefix: string, error: unknown): string {
  console.error(prefix, error);
  return `${prefix}. Iltimos, birozdan so‘ng qayta urinib ko‘ring.`;
}

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function initials(name?: string | null) {
  if (!name) return "🌱";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatNumber(value: number | null | undefined, digits = 0) {
  const n = Number(value) || 0;
  return n.toLocaleString("uz-UZ", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

export const MONTHS = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
];
export const MONTHS_SHORT = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];

export function formatDate(value: string, withTime = false) {
  const d = new Date(value.length === 10 ? value + "T12:00:00" : value);
  const base = `${d.getDate()}-${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
  if (!withTime) return base;
  return `${base} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatMonth(d: Date) {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
