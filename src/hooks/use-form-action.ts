"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import type { ActionResult } from "@/types";

type FormActionFn<T> = (prev: ActionResult<T> | null, formData: FormData) => Promise<ActionResult<T>>;

/**
 * Igual ao useActionState, mas envia via onSubmit para que o React não limpe
 * os campos do formulário quando a validação falha.
 */
export function useFormAction<T = undefined>(fn: FormActionFn<T>) {
  const [state, action, pending] = useActionState(fn, null);
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  };
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const error = state && !state.ok ? state.error : null;
  const success = state?.ok ? state.message ?? null : null;
  return { state, onSubmit, pending, fieldErrors, error, success };
}
