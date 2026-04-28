"use client";

import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { useAuthSession } from "@/components/layout/auth-session-provider";
import { readJsonOrThrow } from "@/lib/client-fetch";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextValue = searchParams.get("next");
  const allowedNextRoutes: Route[] = ["/dashboard", "/upload", "/settings", "/students", "/reports"];
  const next = allowedNextRoutes.find((route) => route === nextValue) ?? "/dashboard";
  const { refreshSession } = useAuthSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setPending(true);
      setError(null);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });
      await readJsonOrThrow(response);
      await refreshSession();
      router.replace(next);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to sign in.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl rounded-[2rem] border border-white/60 bg-white/85 p-6 shadow-soft">
      <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Admin Access</p>
      <h1 className="mt-2 text-3xl font-semibold text-ink">Sign in to manage data</h1>
      <p className="mt-2 text-sm text-slate-600">
        Public visitors can view analytics only. Admin login is required for uploads, edits, deletes, and settings.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Admin username"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3"
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Admin password"
          className="w-full rounded-2xl border border-slate-200 px-4 py-3"
        />
        {error ? <div className="rounded-2xl border border-berry/20 bg-berry/5 p-4 text-sm text-berry">{error}</div> : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
