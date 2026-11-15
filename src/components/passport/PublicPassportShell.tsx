import Link from "next/link";
import { ShieldCheck, ArrowRight } from "lucide-react";

export function PublicPassportShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-black">
      {/* Top SMC Academy Header */}
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-slate-950 text-lg shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
              ♟
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white block leading-none">
                Strategic Mind Chess
              </span>
              <span className="text-[10px] uppercase tracking-widest text-amber-400 font-semibold">
                SMC Student Passport
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Verified Academy Record
            </div>
            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              Sign In <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-10 px-4 md:px-8 max-w-6xl mx-auto w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950/90 py-8 px-4 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Strategic Mind Chess (SMC). All rights reserved.</p>
          <p className="flex items-center gap-1 text-slate-400">
            Incubated at Bundelkhand Active Startup Incubation Council (BASIC)
          </p>
        </div>
      </footer>
    </div>
  );
}
