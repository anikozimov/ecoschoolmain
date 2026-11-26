"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { formatDate, formatMonth, MONTHS_SHORT, useSession } from "@/lib/session";
import { Alert, LoginRequired, PageHero, Skeleton } from "@/components/ui";
import { EVENT_TYPES, type EcoEvent } from "@/lib/events";

const WEEKDAYS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const { user, isAdmin, loading: sessionLoading } = useSession();
  const [supabase] = useState(() => createClient());
  const [events, setEvents] = useState<EcoEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [month, setMonth] = useState<Date | null>(null);
  const [today, setToday] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    const now = new Date();
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setToday(toKey(now));
    setSelectedDate(toKey(now));
  }, []);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    supabase
      .from("eco_events")
      .select("*")
      .order("start_date", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          setError("Tadbirlarni yuklab bo‘lmadi.");
        } else setEvents((data as EcoEvent[]) || []);
        setLoading(false);
      });
  }, [sessionLoading, user, supabase]);

  const eventsForDate = (date: string) =>
    events.filter((e) => e.start_date <= date && (e.end_date ? e.end_date >= date : e.start_date === date));

  const upcoming = useMemo(
    () => events.filter((e) => (e.end_date || e.start_date) >= today).slice(0, 6),
    [events, today]
  );

  if (!month) {
    return (
      <div className="container-page py-12">
        <Skeleton className="h-[480px]" />
      </div>
    );
  }

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDay = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const monthName = formatMonth(month);
  const selectedEvents = selectedDate ? eventsForDate(selectedDate) : [];

  function changeMonth(direction: number) {
    setMonth(new Date(year, monthIndex + direction, 1));
  }

  function goToday() {
    const now = new Date();
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(toKey(now));
  }

  return (
    <>
      <PageHero
        eyebrow="Eco Calendar"
        tone="sand"
        title={
          <>
            Har bir sana — <span className="text-gradient-anim italic">yangi imkoniyat.</span>
          </>
        }
        text="Ekologik tadbirlar, challenge’lar va muhim sanalarni kuzatib boring."
        emoji="📅"
      >
        <div className="flex flex-wrap items-center gap-2">
          {Object.values(EVENT_TYPES).map((t) => (
            <span key={t.label} className={`chip ${t.chip}`}>
              <span className={`h-2 w-2 rounded-full ${t.dot}`} /> {t.label}
            </span>
          ))}
          {isAdmin && (
            <Link href="/admin/events" className="btn btn-lime btn-sm ml-1">
              + Tadbir qo‘shish
            </Link>
          )}
        </div>
      </PageHero>

      <div className="container-page pb-20">
        {!sessionLoading && !user ? (
          <LoginRequired text="Maktab tadbirlarini ko‘rish uchun akkauntingizga kiring." />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <section className="card p-4 sm:p-7">
              {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold capitalize sm:text-3xl">{monthName}</h2>
                <div className="flex items-center gap-1.5">
                  <button onClick={goToday} className="btn btn-ghost btn-sm">Bugun</button>
                  <button onClick={() => changeMonth(-1)} className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface hover:bg-cream" aria-label="Oldingi oy">←</button>
                  <button onClick={() => changeMonth(1)} className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface hover:bg-cream" aria-label="Keyingi oy">→</button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs font-extrabold uppercase tracking-wider text-muted sm:gap-2">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="py-2">{d}</div>
                ))}
              </div>

              {loading ? (
                <Skeleton className="h-80" />
              ) : (
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`e${i}`} />
                  ))}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const date = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const dayEvents = eventsForDate(date);
                    const isSelected = selectedDate === date;
                    const isToday = today === date;
                    return (
                      <button
                        key={date}
                        onClick={() => setSelectedDate(date)}
                        className={`relative flex aspect-square flex-col items-center justify-start rounded-xl p-1 text-sm font-bold transition sm:aspect-auto sm:min-h-24 sm:items-start sm:p-2.5 ${
                          isSelected
                            ? "bg-glow text-forest-950 shadow-lg"
                            : isToday
                            ? "bg-leaf-200 text-accent ring-1 ring-leaf-400/50"
                            : dayEvents.length
                            ? "bg-cream hover:bg-leaf-100"
                            : "hover:bg-cream"
                        }`}
                      >
                        <span>{day}</span>
                        {dayEvents.length > 0 && (
                          <>
                            <span className="mt-auto flex gap-0.5 sm:hidden">
                              {dayEvents.slice(0, 3).map((e) => (
                                <span key={e.id} className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-surface" : EVENT_TYPES[e.event_type].dot}`} />
                              ))}
                            </span>
                            <span className="mt-1.5 hidden w-full space-y-1 sm:block">
                              {dayEvents.slice(0, 2).map((e) => (
                                <span
                                  key={e.id}
                                  className={`block truncate rounded-md px-1.5 py-0.5 text-left text-[10px] font-bold ${
                                    isSelected ? "bg-ink/20 text-white" : EVENT_TYPES[e.event_type].chip
                                  }`}
                                >
                                  {e.title}
                                </span>
                              ))}
                              {dayEvents.length > 2 && (
                                <span className={`block text-left text-[10px] ${isSelected ? "text-white/70" : "text-muted"}`}>
                                  +{dayEvents.length - 2} ta
                                </span>
                              )}
                            </span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <aside className="space-y-5">
              <div className="card p-6">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-accent">Tanlangan kun</p>
                <h3 className="mt-1 text-2xl font-semibold">{selectedDate ? formatDate(selectedDate) : "—"}</h3>
                <div className="mt-4 space-y-3">
                  {selectedEvents.length === 0 ? (
                    <p className="rounded-2xl bg-cream p-5 text-center text-sm text-muted">Bu kunga tadbir belgilanmagan 🌿</p>
                  ) : (
                    selectedEvents.map((e) => <EventCard key={e.id} event={e} />)
                  )}
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-xl font-semibold">Yaqin tadbirlar</h3>
                <div className="mt-4 space-y-2">
                  {upcoming.length === 0 ? (
                    <p className="text-sm text-muted">Yaqin orada tadbirlar yo‘q.</p>
                  ) : (
                    upcoming.map((e) => {
                      const d = new Date(e.start_date + "T12:00:00");
                      return (
                        <button
                          key={e.id}
                          onClick={() => {
                            setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                            setSelectedDate(e.start_date);
                          }}
                          className="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-cream"
                        >
                          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-glow leading-none text-forest-950">
                            <span className="text-center">
                              <span className="block font-display text-lg font-semibold">{d.getDate()}</span>
                              <span className="block text-[9px] font-bold uppercase">
                                {MONTHS_SHORT[d.getMonth()]}
                              </span>
                            </span>
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-extrabold">{e.title}</span>
                            <span className="text-xs text-muted">{EVENT_TYPES[e.event_type].label}</span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}

function EventCard({ event }: { event: EcoEvent }) {
  const t = EVENT_TYPES[event.event_type];
  return (
    <article className="rounded-2xl bg-cream p-4">
      <span className={`chip ${t.chip}`}>{t.icon} {t.label}</span>
      <h4 className="mt-2 text-lg font-extrabold">{event.title}</h4>
      {event.description && <p className="mt-1 text-sm leading-6 text-muted">{event.description}</p>}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-muted">
        {event.location && <span>📍 {event.location}</span>}
        {event.end_date && event.end_date !== event.start_date && <span>⏳ {formatDate(event.end_date)} gacha</span>}
      </div>
    </article>
  );
}
