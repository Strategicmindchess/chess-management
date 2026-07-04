"use client";

import { useActionState } from "react";
import { login, type LoginActionState } from "@/actions/auth/login";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleButton } from "./google-button";

const initialState: LoginActionState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <div className="space-y-5">
      <GoogleButton />
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <div className="h-px flex-1 bg-slate-200" />
        or
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <form action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="mb-1.5">
              Password
            </Label>
            <a
              href="/forgot-password"
              className="mb-1.5 text-xs font-medium text-brand-600 hover:underline"
            >
              Forgot password?
            </a>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />
        </div>
        {state?.error && <Alert variant="error">{state.error}</Alert>}
        <Button
          type="submit"
          variant="gradient"
          className="w-full"
          disabled={isPending}
        >
          {isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500">
        New to SMC?{" "}
        <a
          href="/signup"
          className="font-medium text-brand-600 hover:underline"
        >
          Create an account
        </a>
      </p>
    </div>
  );
}
