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
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <Logo className="mb-10 text-lg" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-ink-900 lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-700 via-ink-800 to-ink-900" />
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />
        <div className="relative flex h-full flex-col justify-between p-14 text-white">
          <div />
          <div>
            <p className="text-3xl font-bold leading-tight">
              Train together.
              <br />
              Track everything.
              <br />
              Never skip a day.
            </p>
            <p className="mt-4 max-w-md text-sm text-white/70">
              Build workout plans with your gym crew, log every session, hit your calorie targets, and let
              an AI coach personalize your training around your goals.
            </p>
          </div>
          <div className="flex gap-8 text-sm text-white/60">
            <div>
              <p className="text-2xl font-bold text-white">Shared</p>
              Plans
            </div>
            <div>
              <p className="text-2xl font-bold text-white">AI</p>
              Coaching
            </div>
            <div>
              <p className="text-2xl font-bold text-white">Apple</p>
              Health sync
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
