import { ReactNode } from "react";
import { Logo } from "./Logo";

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-slate-100">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col bg-white shadow-xl sm:border-x sm:border-slate-200">
        {/* Branded hero - gives the sign-in screen an app splash feel */}
        <div className="relative overflow-hidden bg-ink-900 px-6 pb-10 pt-[max(3rem,calc(env(safe-area-inset-top)+2rem))] text-white">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-800 to-ink-900" />
          <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]" />
          <div className="relative">
            <Logo className="text-lg text-white" />
            <p className="mt-6 text-2xl font-bold leading-snug">
              Train together.
              <br />
              Track everything.
            </p>
            <p className="mt-2 text-sm text-white/70">
              Shared plans, streaks, calories and an AI coach — all in one place.
            </p>
          </div>
        </div>

        <div className="flex-1 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </div>
      </div>
    </div>
  );
}
