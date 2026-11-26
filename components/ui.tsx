"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import Portal from "./Portal";
import { FallingLeaves, TiltCard } from "./effects";
import type { ReactNode } from "react";

/* ─────────── Xabar bloki ─────────── */
export function Alert({
  tone = "success",
  children,
  onClose,
}: {
  tone?: "success" | "error" | "info" | "warning";
  children: ReactNode;
  onClose?: () => void;
}) {
  const styles = {
    success: "border-[#1f7a45]/25 bg-leaf-100 text-accent",
    error: "border-coral-500/25 bg-coral-100 text-coral-500",
    info: "border-sky-500/20 bg-sky-100 text-sky-500",
    warning: "border-sand-400 bg-sand-100 text-sand-400",
  }[tone];
  const icon = { success: "✓", error: "!", info: "i", warning: "!" }[tone];

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm leading-6 animate-rise ${styles}`}
    >
      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-current/15 text-[11px] font-black">
        {icon}
      </span>
      <div className="flex-1">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="-m-1 rounded-lg p-1 opacity-60 hover:opacity-100"
          aria-label="Yopish"
        >
          ✕
        </button>
      )}
    </div>
  );
}

/* ─────────── Holat belgisi ─────────── */
export type Status = "pending" | "approved" | "rejected" | "published";

export function StatusBadge({ status }: { status: Status }) {
  const map = {
    pending: { label: "Tekshirilmoqda", cls: "bg-sand-100 text-sand-400 ring-sand-400/60" },
    approved: { label: "Tasdiqlangan", cls: "bg-leaf-100 text-accent ring-leaf-300" },
    published: { label: "Nashr qilingan", cls: "bg-leaf-100 text-accent ring-leaf-300" },
    rejected: { label: "Rad etilgan", cls: "bg-coral-100 text-coral-500 ring-coral-500/25" },
  }[status];
  return (
    <span className={`chip ring-1 ${map.cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {map.label}
    </span>
  );
}

/* ─────────── Bo‘sh holat ─────────── */
export function EmptyState({
  icon = "🌱",
  title,
  text,
  action,
}: {
  icon?: string;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-leaf-100 text-3xl animate-sway">
        {icon}
      </div>
      <h3 className="mt-5 text-xl font-semibold">{title}</h3>
      {text && <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/* ─────────── Yuklanish skeleti ─────────── */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-line/70 ${className}`} />;
}

export function CardsSkeleton({ count = 3, className = "h-40" }: { count?: number; className?: string }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={className} />
      ))}
    </>
  );
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
      aria-hidden
    />
  );
}

/* ─────────── Modal oyna ─────────── */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  size?: "md" | "lg";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Portal>
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-[#0c1f1b]/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative max-h-[92vh] w-full overflow-y-auto overscroll-contain rounded-t-[20px] border border-line bg-white p-6 shadow-[0_30px_80px_-20px_rgba(18,48,42,0.45)] outline-none animate-rise sm:rounded-[18px] sm:p-8 ${
          size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg"
        }`}
      >
        <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-line sm:hidden" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">{title}</h2>
            {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cream text-muted hover:bg-line hover:text-ink"
            aria-label="Yopish"
          >
            ✕
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
    </Portal>
  );
}

/* ─────────── Tasdiqlash oynasi ─────────── */
export function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel = "Tasdiqlash",
  tone = "primary",
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  text?: string;
  confirmLabel?: string;
  tone?: "primary" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} subtitle={text}>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button className="btn btn-ghost" onClick={onCancel} disabled={busy}>
          Bekor qilish
        </button>
        <button
          className={`btn ${tone === "danger" ? "bg-coral-500 text-white hover:bg-[#c24a30]" : "btn-primary"}`}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy && <Spinner />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/* ─────────── Tizimga kirish talabi ─────────── */
export function LoginRequired({ text }: { text?: string }) {
  return (
    <div className="card relative overflow-hidden px-6 py-14 text-center sm:px-12">
      <div className="absolute inset-0 leaf-pattern opacity-60" />
      <div className="relative">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-leaf-200 text-3xl">🔐</div>
        <h3 className="mt-5 text-2xl font-semibold">Avval tizimga kiring</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
          {text ?? "Bu bo‘limdan foydalanish uchun ECO SCHOOL akkauntingizga kiring."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/login" className="btn btn-primary">
            Kirish
          </Link>
          <Link href="/login?mode=register" className="btn btn-ghost">
            Ro‘yxatdan o‘tish
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Sahifa sarlavhasi ─────────── */
export function PageHero({
  eyebrow,
  title,
  text,
  emoji,
  tone = "leaf",
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  text?: string;
  emoji?: string;
  tone?: "leaf" | "sand" | "sky";
  children?: ReactNode;
}) {
  const bg = {
    leaf: "from-leaf-100 via-leaf-100/40",
    sand: "from-sand-200/80 via-sand-100/60",
    sky: "from-sky-100 via-sky-100/50",
  }[tone];
  return (
    <section className={`relative -mt-[72px] overflow-hidden bg-gradient-to-b ${bg} to-transparent pt-[72px]`}>
      <div className="container-page relative pb-10 pt-10 sm:pb-14 sm:pt-14">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl animate-rise">
            <p className="eyebrow">
              <span className="h-px w-6 bg-forest-500" />
              {eyebrow}
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] sm:text-5xl md:text-6xl">
              {title}
            </h1>
            {text && <p className="mt-4 max-w-xl text-base leading-7 text-muted sm:text-lg">{text}</p>}
          </div>
        </div>
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}

/* ─────────── Statistik karta ─────────── */
export function StatCard({
  icon,
  label,
  value,
  unit,
  tone = "leaf",
  loading,
}: {
  icon: string;
  label: string;
  value: ReactNode;
  unit?: string;
  tone?: "leaf" | "sand" | "sky" | "coral";
  loading?: boolean;
}) {
  const iconBg = {
    leaf: "bg-leaf-100",
    sand: "bg-sand-100",
    sky: "bg-sky-100",
    coral: "bg-coral-100",
  }[tone];
  return (
    <div className="hover-bounce card card-hover p-5 sm:p-6">
      <div className={`bounce-target grid h-11 w-11 place-items-center rounded-2xl text-xl ${iconBg}`}>{icon}</div>
      <p className="mt-4 text-sm font-semibold text-muted">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-9 w-24" />
      ) : (
        <p className="mt-1 font-display text-3xl font-semibold text-accent sm:text-4xl">
          {value}
          {unit && <span className="ml-1.5 font-sans text-sm font-bold text-muted">{unit}</span>}
        </p>
      )}
    </div>
  );
}

/* ─────────── Tablar ─────────── */
export function Tabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: string; count?: number }[];
}) {
  return (
    <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1">
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            onClick={() => onChange(item.value)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
              active ? "bg-glow text-forest-950" : "text-muted hover:bg-cream hover:text-ink"
            }`}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] ${
                  active ? "bg-ink/20" : "bg-cream"
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
