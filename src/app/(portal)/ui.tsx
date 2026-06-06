"use client";

import Link from "next/link";
import { motion } from "framer-motion";

/* Shared admin UI — white, neat, animated. */

export function PageHeader({
  title,
  deva,
  sub,
  action,
}: {
  title: string;
  deva?: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mb-6 flex flex-wrap items-end justify-between gap-3"
    >
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {title}
          {deva && (
            <span className="deva ml-3 align-middle text-base font-normal text-[#4356E0]">
              {deva}
            </span>
          )}
        </h1>
        {sub && <p className="mt-1 text-sm text-ink-soft">{sub}</p>}
      </div>
      {action}
    </motion.div>
  );
}

export function Card({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: "easeOut" }}
      className={`rounded-3xl bg-white/85 p-5 shadow-[0_16px_44px_-20px_rgba(80,90,200,0.28)] ring-1 ring-white/70 backdrop-blur-sm ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function Stat({
  label,
  value,
  hint,
  accent = "text-ink",
  delay = 0,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
  delay?: number;
}) {
  return (
    <Card delay={delay} className="transition-transform duration-300 hover:-translate-y-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-bold tracking-tight ${accent}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </Card>
  );
}

export function EmptyRow({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-ink-faint">{text}</p>;
}

export function IconStat({
  label,
  value,
  icon,
  tile,
  delay = 0,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tile: string;
  delay?: number;
}) {
  return (
    <Card delay={delay} className="transition-transform duration-300 hover:-translate-y-1">
      <div className="flex items-center gap-3.5">
        <span className={`grid size-12 shrink-0 place-items-center rounded-2xl shadow-sm ${tile}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-ink-faint">{label}</p>
          <p className="truncate text-2xl font-bold tracking-tight text-ink">{value}</p>
        </div>
      </div>
    </Card>
  );
}

export function ActionCard({
  href,
  label,
  icon,
  delay = 0,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: "easeOut" }}
    >
      <Link
        href={href}
        className="flex flex-col items-center gap-2 rounded-2xl bg-white px-3 py-4 text-center text-[#4356E0] ring-1 ring-[#E0E5FB] transition-all duration-300 hover:-translate-y-1 hover:bg-[#F0F3FF] hover:shadow-lg hover:shadow-indigo-200/60"
      >
        {icon}
        <span className="text-xs font-semibold text-ink">{label}</span>
      </Link>
    </motion.div>
  );
}
