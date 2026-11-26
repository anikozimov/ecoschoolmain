/**
 * Supabase kalitlari kiritilmagan bo'lsa, xato o'rniga shu yo'riqnoma ko'rsatiladi.
 * (Faqat sozlash bosqichida ko'rinadi — kalitlar qo'shilgach yo'qoladi.)
 */
export default function SetupNotice() {
  const steps = [
    {
      t: "Loyiha papkasida .env.local faylini yarating",
      d: (
        <>
          Papkadagi <code>.env.example</code> faylidan nusxa oling va nomini <code>.env.local</code> qiling. Windows’da:
          <pre>copy .env.example .env.local</pre>
        </>
      ),
    },
    {
      t: "Supabase kalitlarini yozing",
      d: (
        <>
          Supabase → <b>Project Settings → API</b> dan ko‘chiring:
          <pre>{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...`}</pre>
        </>
      ),
    },
    {
      t: "Serverni qayta ishga tushiring",
      d: (
        <>
          Terminalda <b>Ctrl + C</b> bosing, keyin yana: <pre>npm run dev</pre>
          Kalitlar faqat ishga tushish paytida o‘qiladi.
        </>
      ),
    },
  ];

  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <div className="card w-full max-w-2xl p-7 sm:p-10">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-sand-200 text-3xl">🔑</div>
        <h1 className="mt-5 text-3xl font-semibold sm:text-4xl">Supabase hali ulanmagan</h1>
        <p className="mt-2 leading-7 text-muted">
          Sayt ishlashi uchun Supabase manzili va kaliti kerak. Ular <code>.env.local</code> faylida saqlanadi va xavfsizlik
          uchun zip/GitHub’ga qo‘shilmaydi — shuning uchun bir marta o‘zingiz kiritasiz.
        </p>
        <ol className="mt-7 space-y-5">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-4">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-glow text-sm font-black text-forest-950">{i + 1}</span>
              <div className="min-w-0 flex-1 text-sm leading-6 text-muted [&_b]:text-ink [&_code]:rounded [&_code]:bg-ink/10 [&_code]:px-1.5 [&_code]:text-accent [&_pre]:mt-2 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-black/40 [&_pre]:p-3 [&_pre]:text-xs [&_pre]:text-accent">
                <p className="text-base font-extrabold text-ink">{s.t}</p>
                {s.d}
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-7 rounded-2xl bg-coral-100 p-4 text-xs leading-5 text-coral-500">
          ⚠️ Faqat <b>publishable (anon)</b> kalitni yozing. <b>service_role</b> kalitni hech qachon saytga qo‘ymang.
          Notepad’da saqlaganda “Fayl turi: Barcha fayllar” ni tanlang, aks holda fayl <code>.env.local.txt</code> bo‘lib qoladi.
        </p>
      </div>
    </main>
  );
}
