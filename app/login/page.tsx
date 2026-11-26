"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import timoImg from "@/public/timo.webp";
import Link from "next/link";
import { DEMO, hashQuery, useAppRouter } from "@/lib/nav";
import { createClient } from "@/lib/supabase";
import { Alert, Spinner } from "@/components/ui";
import { Logo } from "@/components/brand";
import { loginToEmail, normalizeUsername, usernameError } from "@/lib/login";

type SchoolClass = { class_name: string };

export default function LoginPage() {
  const router = useAppRouter();
  const [supabase] = useState(() => createClient());

  const [mode, setMode] = useState<"register" | "login">("login");
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = DEMO ? hashQuery() : new URLSearchParams(window.location.search);
    if (params.get("mode") === "register") setMode("register");
  }, []);

  function switchMode(next: "register" | "login") {
    setMode(next);
    setError("");
    setMessage("");
  }

  async function loadClasses() {
    const normalizedCode = schoolCode.trim().toUpperCase();
    setSchoolCode(normalizedCode);
    setClasses([]);
    setClassName("");
    setError("");
    setMessage("");

    if (!normalizedCode) {
      setError("Avval maktab kodini kiriting.");
      return;
    }

    setClassesLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc("get_school_classes_by_code", {
        input_school_code: normalizedCode,
      });

      if (rpcError) {
        console.error("Class loading error:", rpcError.code, rpcError.message);
        setError(
          rpcError.code === "PGRST202"
            ? "Ro‘yxatdan o‘tish hali sozlanmagan (bazada sinflar funksiyasi yo‘q). Administratorga murojaat qiling."
            : "Sinflarni yuklab bo‘lmadi. Qayta urinib ko‘ring."
        );
        return;
      }

      const list = (data ?? []) as SchoolClass[];
      setClasses(list);
      if (list.length === 0) {
        setError("Maktab kodi topilmadi yoki sinflar hali kiritilmagan.");
      }
    } catch (err) {
      console.error("Class loading error:", err);
      setError("Sinflarni yuklashda kutilmagan xatolik yuz berdi.");
    } finally {
      setClassesLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (mode === "register") {
      if (!name.trim()) return setError("Ism va familiyangizni kiriting.");
      if (!schoolCode.trim()) return setError("Maktab kodini kiriting.");
      if (!className) return setError("Iltimos, sinfingizni tanlang.");
      if (!classes.some((item) => item.class_name === className))
        return setError("Iltimos, maktab sinflarini qayta yuklang.");
      const uErr = usernameError(login);
      if (uErr) return setError(uErr);
      if (password.length < 8) return setError("Parol kamida 8 ta belgidan iborat bo‘lishi kerak.");
    } else if (!login.trim()) {
      return setError("Loginingizni kiriting.");
    }

    setLoading(true);
    try {
      if (mode === "register") {
        const username = normalizeUsername(login);
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: loginToEmail(username),
          password,
          options: {
            data: {
              username,
              full_name: name.trim(),
              class_name: className,
              school_code: schoolCode.trim().toUpperCase(),
            },
          },
        });

        if (signUpError) {
          console.error("Sign up error:", signUpError);
          const msg = signUpError.message.toLowerCase();
          setError(
            msg.includes("already") || msg.includes("registered")
              ? "Bu login band. Boshqa login tanlang."
              : msg.includes("password")
                ? "Parol talablarga javob bermaydi. Kuchliroq parol tanlang."
                : msg.includes("email")
                  ? "Ro‘yxatdan o‘tish hali sozlanmagan (Supabase Auth sozlamalari). Administratorga murojaat qiling."
                  : "Ro‘yxatdan o‘tib bo‘lmadi. Ma’lumotlarni tekshirib, qayta urinib ko‘ring."
          );
          return;
        }

        if (!data.user || data.user.identities?.length === 0) {
          setError("Bu login band. Boshqa login tanlang yoki “Kirish” bo‘limidan foydalaning.");
          return;
        }

        if (data.session) {
          router.push("/profile");
          router.refresh();
        } else {
          setMessage(
            "Akkaunt yaratildi, lekin darhol kirib bo‘lmadi. Administrator Supabase’da “Confirm email” sozlamasini o‘chirishi kerak."
          );
        }
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: loginToEmail(login),
          password,
        });

        if (loginError) {
          setError(
            loginError.message.toLowerCase().includes("not confirmed")
              ? "Akkaunt hali tasdiqlanmagan. Administratorga murojaat qiling."
              : "Login yoki parol noto‘g‘ri. Qayta urinib ko‘ring."
          );
          return;
        }

        router.push("/");
        router.refresh();
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError("Kutilmagan xatolik yuz berdi. Qayta urinib ko‘ring.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      {/* Chap panel — brend */}
      <aside className="relative hidden overflow-hidden bg-forest-800 p-12 text-white lg:flex lg:flex-col">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-forest-600/60 blur-3xl" />
        <div className="absolute -bottom-32 -right-20 h-[28rem] w-[28rem] rounded-full bg-leaf-500/25 blur-3xl" />
        <div className="absolute inset-0 leaf-pattern opacity-20" />

        <Link href="/" className="relative">
          <Logo light />
        </Link>

        <div className="relative mt-auto">
          <div className="relative mx-auto w-[78%] max-w-[380px]">
            <div className="absolute inset-[8%] rounded-full bg-leaf-400/30 blur-2xl" />
            <Image
              src={timoImg}
              alt="Timo maskoti"
              width={1272}
              height={1236}
              priority
              sizes="380px"
              className="relative h-auto w-full animate-float drop-shadow-[0_30px_30px_rgba(0,0,0,0.35)]"
            />
          </div>
          <h2 className="mt-10 text-4xl font-semibold leading-tight">
            Har bir kichik harakat — <span className="italic text-leaf-300">katta o‘zgarish.</span>
          </h2>
          <ul className="mt-6 space-y-3 text-sm text-white/75">
            {[
              "🎯  Challenge’lar bajarib ball to‘plang",
              "♻️  Qog‘oz va plastikni recyclingga topshiring",
              "🏆  Sinfingiz bilan reytingda yetakchi bo‘ling",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2">
                {t}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* O‘ng panel — forma */}
      <section className="relative flex flex-col bg-cream px-5 py-8 sm:px-10">
        <div className="absolute inset-0 leaf-pattern opacity-40 lg:hidden" />
        <div className="relative flex items-center justify-between">
          <Link href="/" className="lg:hidden">
            <Logo />
          </Link>
          <Link href="/" className="ml-auto text-sm font-bold text-muted hover:text-accent">
            ← Bosh sahifa
          </Link>
        </div>

        <div className="relative mx-auto my-auto w-full max-w-md py-10">
          {process.env.NEXT_PUBLIC_DEMO === "1" && (
            <div className="mb-6">
              <Alert tone="info">
                <strong>Demo rejim:</strong> istalgan login va parol (8+ belgi) bilan kiring. Siz admin sifatida kirasiz,
                barcha ma’lumotlar sinov uchun.
              </Alert>
            </div>
          )}
          <h1 className="text-4xl font-semibold sm:text-5xl">
            {mode === "login" ? "Xush kelibsiz!" : "Jamoaga qo‘shiling"}
          </h1>
          <p className="mt-3 text-muted">
            {mode === "login"
              ? "Akkauntingizga kiring va eko-sayohatni davom ettiring."
              : "Maktab kodingiz bilan bir daqiqada ro‘yxatdan o‘ting."}
          </p>

          <div className="mt-8 grid grid-cols-2 rounded-full border border-line bg-surface p-1">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`rounded-full py-3 text-sm font-extrabold transition ${
                  mode === m ? "bg-glow text-forest-950 shadow" : "text-muted hover:text-ink"
                }`}
              >
                {m === "login" ? "Kirish" : "Ro‘yxatdan o‘tish"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate={false}>
            {mode === "register" && (
              <>
                <div>
                  <label className="label" htmlFor="name">Ism va familiya</label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Masalan: Aziza Karimova"
                    autoComplete="name"
                    maxLength={80}
                    required
                    className="input"
                  />
                </div>

                <div>
                  <label className="label" htmlFor="school">Maktab kodi</label>
                  <div className="flex gap-2">
                    <input
                      id="school"
                      type="text"
                      value={schoolCode}
                      onChange={(e) => {
                        setSchoolCode(e.target.value.toUpperCase());
                        setClasses([]);
                        setClassName("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          loadClasses();
                        }
                      }}
                      placeholder="Masalan: ECO21"
                      maxLength={32}
                      required
                      className="input uppercase tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={loadClasses}
                      disabled={classesLoading || !schoolCode.trim()}
                      className="btn btn-lime shrink-0 rounded-2xl"
                    >
                      {classesLoading ? <Spinner /> : "Tekshirish"}
                    </button>
                  </div>
                  {classes.length > 0 && (
                    <p className="hint font-bold text-accent">✓ {classes.length} ta sinf topildi</p>
                  )}
                </div>

                <div>
                  <label className="label" htmlFor="class">Sinfingiz</label>
                  {classes.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {classes.map((item) => (
                        <button
                          type="button"
                          key={item.class_name}
                          onClick={() => setClassName(item.class_name)}
                          className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
                            className === item.class_name
                              ? "border-forest-600 bg-glow text-forest-950"
                              : "border-line bg-surface hover:border-forest-500/50"
                          }`}
                        >
                          {item.class_name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-line bg-ink/[0.06] px-4 py-3.5 text-sm text-muted">
                      Avval maktab kodini tekshiring
                    </div>
                  )}
                </div>
              </>
            )}

            <div>
              <label className="label" htmlFor="login">Login</label>
              <input
                id="login"
                type="text"
                value={login}
                onChange={(e) => setLogin(mode === "register" ? e.target.value.toLowerCase().replace(/\s/g, "") : e.target.value)}
                placeholder={mode === "register" ? "Masalan: aziza_k" : "Loginingiz"}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={mode === "register" ? 24 : 120}
                required
                className="input"
              />
              {mode === "register" && (
                <p className="hint">Lotin harflari, raqamlar, nuqta yoki _ (3–24 belgi). Shu login va parol bilan kirasiz.</p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="password">Parol</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Kamida 8 ta belgi"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  minLength={8}
                  required
                  className="input pr-20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-bold text-muted hover:bg-cream"
                >
                  {showPassword ? "Yashirish" : "Ko‘rsatish"}
                </button>
              </div>
            </div>

            {error && <Alert tone="error">{error}</Alert>}
            {message && <Alert tone="success">{message}</Alert>}

            <button type="submit" disabled={loading} className="btn btn-primary w-full py-4 text-base">
              {loading && <Spinner />}
              {loading ? "Kuting..." : mode === "register" ? "Ro‘yxatdan o‘tish" : "Kirish"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {mode === "login" ? "Hali akkauntingiz yo‘qmi? " : "Akkauntingiz bormi? "}
            <button
              onClick={() => switchMode(mode === "login" ? "register" : "login")}
              className="font-extrabold text-accent hover:underline"
            >
              {mode === "login" ? "Ro‘yxatdan o‘ting" : "Kiring"}
            </button>
          </p>
        </div>
      </section>
    </div>
  );
}
