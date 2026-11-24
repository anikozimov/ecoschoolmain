import Link from "next/link";
import { Logo, NAV, TELEGRAM_URL } from "./brand";

export default function SiteFooter() {
  return (
    <footer className="relative mt-auto overflow-hidden bg-forest-900 text-white/80">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-forest-700/60 blur-3xl" />
      <div className="container-page relative grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-5 max-w-sm text-sm leading-7 text-white/65">
            Maktabimiz ekologik ta’sirini o‘lchaymiz, harakat qilamiz va har kuni yaxshilanamiz.
            Kichik harakatlar — katta o‘zgarishlar.
          </p>
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-lime btn-sm mt-6"
          >
            ✈️ Telegram kanalimiz
          </a>
        </div>

        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-leaf-300">Bo‘limlar</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition hover:text-leaf-300">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-leaf-300">Hamjamiyat</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link href="/class-leaderboard" className="transition hover:text-leaf-300">
                Sinflar bellashuvi
              </Link>
            </li>
            <li>
              <Link href="/profile" className="transition hover:text-leaf-300">
                Profilim
              </Link>
            </li>
            <li>
              <Link href="/login" className="transition hover:text-leaf-300">
                Kirish / Ro‘yxatdan o‘tish
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col justify-between gap-2 py-5 text-xs text-white/50 sm:flex-row">
          <p>© 2026 ECO SCHOOL · Eco Future Andijan</p>
          <p>O‘zgarish bizdan boshlanadi 🌍</p>
        </div>
      </div>
    </footer>
  );
}
