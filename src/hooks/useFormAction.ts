"use client";

import { useRef, useState } from "react";

/** A Next.js server action invoked via `<form action={...}>`. */
export type FormAction = (formData: FormData) => void | Promise<void>;

export type UseFormActionOptions = {
  /** Reset the native form element after the action resolves. Defaults to true. */
  resetOnSuccess?: boolean;
  /** Extra cleanup after a successful submit (e.g. clear controlled-field state). */
  onReset?: () => void;
};

export type UseFormAction = {
  /** Ref to attach to the `<form>` element so it can be reset after submit. */
  formRef: React.RefObject<HTMLFormElement | null>;
  /** True while the wrapped action is in flight. */
  busy: boolean;
  /** Wrapped action to pass to `<form action={run}>`; toggles busy + resets. */
  run: FormAction;
  /** Convenience bundle to spread onto the `<form>`: `<form {...formProps}>`. */
  formProps: {
    ref: React.RefObject<HTMLFormElement | null>;
    action: FormAction;
  };
};

/**
 * Captures the shared form-submit pattern used across the app's server-action
 * forms: a `useRef` on the `<form>`, a `busy` `useState`, and a wrapper that
 * toggles busy, awaits the server action, resets the form, and clears busy.
 *
 *   const { formProps, busy } = useFormAction(addMeal);
 *   return <form {...formProps}>… <SubmitButton busy={busy}>Log</SubmitButton></form>;
 *
 * Equivalent destructured shape (`formRef` + `run`) is also supported:
 *   const { formRef, busy, run } = useFormAction(addMeal, { resetOnSuccess: true });
 *   return <form ref={formRef} action={run}>…</form>;
 */
export function useFormAction(
  action: FormAction,
  options: UseFormActionOptions = {}
): UseFormAction {
  const { resetOnSuccess = true, onReset } = options;
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);

  const run: FormAction = async (formData) => {
    setBusy(true);
    try {
      await action(formData);
      if (resetOnSuccess) formRef.current?.reset();
      onReset?.();
    } finally {
      setBusy(false);
    }
  };

  return {
    formRef,
    busy,
    run,
    formProps: { ref: formRef, action: run },
  };
}
