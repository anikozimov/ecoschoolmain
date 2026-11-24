"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

/**
 * Admin paneldagi "Sahifa matnlari" bo'limidan boshqariladigan matnlar.
 * Bazada `site_content` jadvali bo'lmasa ham sayt quyidagi standart matnlar bilan ishlayveradi.
 */
export const CONTENT_PAGES = {
  recycling: {
    label: "Recycling sahifasi",
    defaults: {
      title: "Chiqindini topshiring —",
      accent: "ball oling.",
      text: "Sinfingiz bilan qog‘oz yoki plastik yig‘ib, Eco Team’ga topshiring. Eco Team uni tarozida o‘lchaydi va sinfingizga ball yozadi: 1 kg = 25 ball.",
    },
  },
  research: {
    label: "Tadqiqotlar sahifasi",
    defaults: {
      title: "Maktabimiz",
      accent: "tadqiqotlari",
      text: "Bu yerda maktabimizda o‘tkazilgan tadqiqotlar jamlanadi. Har bir jamoaga tadqiqoti uchun 100 ballgacha beriladi.",
    },
  },
  challenges: {
    label: "Challenge’lar sahifasi",
    defaults: {
      title: "Kichik vazifa,",
      accent: "katta ta’sir.",
      text: "Vazifani tanlang, bajaring va dalil yuboring. Eco Team tasdiqlagach, ballar hisobingizga tushadi.",
    },
  },
} as const;

export type ContentPage = keyof typeof CONTENT_PAGES;
export type PageContent = { title: string; accent: string; text: string };
export const CONTENT_FIELDS = ["title", "accent", "text"] as const;

export function useSiteContent(page: ContentPage): PageContent {
  const [content, setContent] = useState<PageContent>({ ...CONTENT_PAGES[page].defaults });

  useEffect(() => {
    let active = true;
    createClient()
      .from("site_content")
      .select("key, value")
      .in("key", CONTENT_FIELDS.map((f) => `${page}.${f}`))
      .then(({ data, error }) => {
        if (!active || error || !data) return; // jadval yo'q bo'lsa standart matn qoladi
        const next = { ...CONTENT_PAGES[page].defaults } as PageContent;
        (data as { key: string; value: string }[]).forEach((row) => {
          const field = row.key.split(".")[1] as keyof PageContent;
          if (row.value?.trim()) next[field] = row.value;
        });
        setContent(next);
      });
    return () => {
      active = false;
    };
  }, [page]);

  return content;
}
