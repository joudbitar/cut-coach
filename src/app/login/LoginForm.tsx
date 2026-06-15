"use client";

import { useActionState, useState } from "react";
import { loginAction } from "@/app/actions";

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(loginAction, undefined);
  const [pin, setPin] = useState("");

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <input type="hidden" name="next" value={next} />
      <input
        className="input"
        name="pin"
        inputMode="numeric"
        autoComplete="off"
        type="password"
        placeholder="••••"
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
        style={{ textAlign: "center", fontSize: 28, letterSpacing: 8 }}
        aria-label="PIN"
        autoFocus
      />
      {state?.error && (
        <p style={{ color: "var(--danger)", textAlign: "center", fontSize: 14 }}>{state.error}</p>
      )}
      <button className="btn" type="submit" disabled={pending || pin.length < 3}>
        {pending ? "Checking…" : "Unlock"}
      </button>
    </form>
  );
}
