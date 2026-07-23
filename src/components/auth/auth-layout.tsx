import type { ReactNode } from "react";
import Image from "next/image";export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-indigo-500 via-violet-500 to-purple-600 px-4 py-12">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 -bottom-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white/15 backdrop-blur-sm">
            <Image src="/image.png" alt="SMC Logo" width={64} height={64} className="h-full w-full object-contain" />
          </div>
          <p className="text-sm font-medium text-white/80">
            Strategic Mind Chess
          </p>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-2xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            {subtitle && (
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            )}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
