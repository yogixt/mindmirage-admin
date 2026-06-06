import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main
      className="grid min-h-screen place-items-center px-6 py-10"
      style={{
        background:
          "radial-gradient(80% 60% at 80% 0%, rgba(91,124,250,0.18), transparent 55%), radial-gradient(60% 50% at 0% 100%, rgba(236,72,153,0.10), transparent 55%), #F2F3FB",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-[#5B7CFA] to-[#3F51E8] shadow-lg shadow-indigo-500/30">
            <span className="deva text-2xl text-white">ॐ</span>
          </div>
          <h1 className="display mt-4 text-3xl text-ink">
            Mind <span className="text-[#4356E0]">Mirage</span>
          </h1>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.3em] text-slate-400">
            Admin portal
          </p>
        </div>
        <div className="mt-8 rounded-3xl bg-white p-6 shadow-[0_24px_70px_-24px_rgba(80,90,200,0.4)] ring-1 ring-white/70">
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-[11px] text-slate-400">
          Team access only · प्रशासन
        </p>
      </div>
    </main>
  );
}
