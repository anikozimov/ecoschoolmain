"use client";

import { Reveal } from "@/components/effects";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { initials, useSession } from "@/lib/session";
import { MENTOR_FIELDS, safePhoto, type Mentor } from "@/lib/mentors";
import { Alert, EmptyState, PageHero, Skeleton } from "@/components/ui";

const TINTS = [
  "from-leaf-300 to-forest-500",
  "from-sand-400 to-[#b9802a]",
  "from-sky-300 to-[#2b6aa3]",
  "from-coral-500/80 to-forest-700",
];

export default function MentorsPage() {
  const { isAdmin } = useSession();
  const [supabase] = useState(() => createClient());
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("mentors")
      .select(MENTOR_FIELDS)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true })
      .then(({ data, error: err }) => {
        if (err) {
          console.error(err);
          setError("Mentorlar ro‘yxatini yuklab bo‘lmadi.");
        } else {
          setMentors((data as Mentor[]) || []);
        }
        setLoading(false);
      });
  }, [supabase]);

  return (
    <>
      <PageHero
        eyebrow="Mentorlar"
        tone="sky"
        title={
          <>
            Bizga yo‘l ko‘rsatgan <span className="text-gradient-anim italic">ustozlar</span>
          </>
        }
        text="ECO SCHOOL loyihasini qo‘llab-quvvatlagan, bilimi va vaqtini ayamagan domlalarimiz. Rahmat sizlarga!"
        emoji="🎓"
      >
        {isAdmin && (
          <Link href="/admin/mentors" className="btn btn-lime btn-sm">
            ⚙️ Mentorlarni boshqarish
          </Link>
        )}
      </PageHero>

      <div className="container-page pb-20">
        {error && <Alert tone="error">{error}</Alert>}
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        ) : mentors.length === 0 && !error ? (
          <EmptyState icon="🎓" title="Tez orada" text="Loyihamizga yordam bergan ustozlar shu yerda bo‘ladi." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {mentors.map((m, i) => {
              const photo = safePhoto(m.photo_url);
              return (
                <Reveal key={m.id} delay={Math.min(i, 6) * 80}>
                  <article className="card card-hover group h-full overflow-hidden p-0">
                    <div className={`relative aspect-[4/3] overflow-hidden bg-gradient-to-br ${TINTS[i % TINTS.length]}`}>
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo}
                          alt={m.full_name}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <span className="grid h-full w-full place-items-center font-display text-6xl font-semibold text-white/90">
                          {initials(m.full_name)}
                        </span>
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
                      {m.subject && (
                        <span className="chip absolute bottom-3 left-3 bg-glow text-forest-950">{m.subject}</span>
                      )}
                    </div>
                    <div className="p-5 sm:p-6">
                      <h2 className="text-xl font-semibold">{m.full_name}</h2>
                      {m.bio && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted">{m.bio}</p>}
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
