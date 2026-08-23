"use client";

import { useActionState } from "react";
import { verifyFeesPin } from "@/actions/fees-pin-action";

const initialState = { error: null };

export function FeesPinForm() {
  const [state, formAction, pending] = useActionState(verifyFeesPin, initialState);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-lg"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* Icon */}
        <div className="mb-5 flex justify-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
            style={{ background: "#1F2A24", color: "#B8935A" }}
          >
            ♛
          </div>
        </div>

        <h1
          className="mb-1 text-center text-lg font-semibold text-slate-900"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          Student Ledger
        </h1>
        <p className="mb-6 text-center text-sm text-slate-500">
          Enter the admin PIN to access fee records.
        </p>

        <form action={formAction} className="space-y-4">
          <div>
            <label
              htmlFor="pin"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              PIN
            </label>
            <input
              id="pin"
              name="pin"
              type="password"
              autoFocus
              autoComplete="off"
              placeholder="••••••"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.15em" }}
            />
          </div>

          {state?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ background: "#2F6F4E" }}
          >
            {pending ? "Verifying…" : "Unlock ledger"}
          </button>
        </form>
      </div>
    </div>
  );
}
