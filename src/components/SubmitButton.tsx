"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export type SubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** True while the form's server action is in flight. */
  busy: boolean;
  /** Label shown when idle (e.g. "Log", "Save", "+3"). */
  children: ReactNode;
  /** What to show while busy. Defaults to the hand-rolled "…" affordance. */
  busyLabel?: ReactNode;
};

/**
 * The submit button the forms currently hand-roll: a `className="btn"` submit
 * that is `disabled` while busy and swaps its label for a "…" affordance.
 *
 *   <SubmitButton busy={busy}>Log</SubmitButton>
 *   <SubmitButton busy={busy} busyLabel="Uploading…">Upload</SubmitButton>
 */
export default function SubmitButton({
  busy,
  children,
  busyLabel = "…",
  className = "btn",
  type = "submit",
  disabled,
  ...rest
}: SubmitButtonProps) {
  return (
    <button
      type={type}
      className={className}
      disabled={busy || disabled}
      {...rest}
    >
      {busy ? busyLabel : children}
    </button>
  );
}
