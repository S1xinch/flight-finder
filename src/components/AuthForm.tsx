"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Mode = "login" | "register" | "forgot" | "reset";
const TEXT: Record<Mode, { title: string; button: string }> = {
  login: { title: "Sign in", button: "Sign in" },
  register: { title: "Create account", button: "Create account" },
  forgot: { title: "Forgot password", button: "Send reset link" },
  reset: { title: "Choose a new password", button: "Reset password" },
};

export default function AuthForm({ mode, token }: { mode: Mode; token: string }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const needEmail = mode !== "reset";
  const needPw = mode !== "forgot";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setErr("");
    setMsg("");
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: fd.get("email"), password: fd.get("password"), token }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? "Something went wrong.");
    if (mode === "login") {
      router.push("/dashboard");
      router.refresh();
    } else if (mode === "reset") router.push("/login");
    else setMsg(j.message ?? "Done.");
  }

  return (
    <form onSubmit={submit} className="card grid max-w-md gap-4">
      <h1>{TEXT[mode].title}</h1>
      {needEmail && (
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" />
        </div>
      )}
      {needPw && (
        <div>
          <label htmlFor="password">{mode === "reset" ? "New password" : "Password"}</label>
          <input id="password" name="password" type="password" required minLength={mode === "login" ? undefined : 10}
            autoComplete={mode === "login" ? "current-password" : "new-password"} className="input" aria-describedby="pw-hint" />
          {mode !== "login" && <p id="pw-hint" className="mt-1 text-sm">At least 10 characters.</p>}
        </div>
      )}
      {err && <p role="alert" className="err">{err}</p>}
      {msg && <p role="status">{msg}</p>}
      <button className="btn" disabled={busy}>{busy ? "Please wait…" : TEXT[mode].button}</button>
      <p className="flex flex-wrap gap-4 text-sm">
        {mode === "login" && (
          <>
            <Link href="/register">Create account</Link>
            <Link href="/forgot">Forgot password?</Link>
          </>
        )}
        {mode === "register" && <Link href="/login">Already registered? Sign in</Link>}
        {(mode === "forgot" || mode === "reset") && <Link href="/login">Back to sign in</Link>}
      </p>
    </form>
  );
}
