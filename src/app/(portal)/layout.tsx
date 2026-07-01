import { redirect } from "next/navigation";
import { getSeeker } from "@/lib/auth";
import { runMigrations } from "@/lib/db";
import { SITE } from "@/lib/constants";
import AdminNav, { LogoutButton } from "./AdminNav";
import LoginWatcher from "./LoginWatcher";

export const dynamic = "force-dynamic";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await runMigrations();
  const admin = await getSeeker();
  if (!admin) redirect("/login");
  const initial = (admin.fullName?.[0] ?? "A").toUpperCase();

  return (
    <div className="relative min-h-screen bg-[#F2F3FB] text-ink lg:flex">
      {/* Ambient washes */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0" style={{ background: "radial-gradient(60% 50% at 100% 0%, rgba(91,124,250,0.14), transparent 60%), radial-gradient(50% 40% at 0% 100%, rgba(236,72,153,0.06), transparent 60%)" }} />
      {/* ── Dark sidebar (top bar on mobile) ── */}
      <aside className="relative z-10 border-b border-slate-200/60 bg-white px-4 py-4 shadow-[8px_0_30px_-20px_rgba(80,90,200,0.25)] lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[268px] lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r lg:px-5 lg:py-7">
        <div className="mb-3 flex items-center gap-3 lg:mb-9">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#5B7CFA] to-[#3F51E8] shadow-lg shadow-indigo-500/30">
            <span className="deva text-xl text-white">ॐ</span>
          </span>
          <div>
            <p className="display text-xl leading-tight text-ink">
              Mind Mirage
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
              Admin suite
            </p>
          </div>
        </div>

        <AdminNav />

        <div className="hidden lg:mt-auto lg:block lg:border-t lg:border-slate-200/70 lg:pt-3">
          <LogoutButton />
        </div>
      </aside>

      {/* ── Content ── */}
      <div className="relative z-10 min-w-0 flex-1">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-slate-200/50 bg-white/60 px-4 py-3 backdrop-blur-xl sm:px-8">
          <a
            href={SITE.url}
            target="_blank"
            rel="noreferrer noopener"
            className="text-xs font-semibold text-ink-soft transition-colors hover:text-[#4356E0]"
          >
            mindmirageindia.com ↗
          </a>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold leading-tight text-ink">
                {admin.fullName}
              </p>
              <p className="text-[10px] text-ink-faint">Team</p>
            </div>
            <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-[#5B7CFA] to-[#3F51E8] text-sm font-bold text-white">
              {initial}
            </span>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
        <LoginWatcher />
      </div>
    </div>
  );
}
