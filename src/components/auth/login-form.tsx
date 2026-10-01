"use client";

import { useFormAction } from "@/hooks/use-form-action";
import { signInAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";

export function LoginForm({ next }: { next: string }) {
  const { state, onSubmit, pending } = useFormAction(signInAction);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <Field label="E-mail" htmlFor="email" error={fe?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="voce@email.com" />
      </Field>
      <Field label="Senha" htmlFor="password" error={fe?.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <FormMessage error={state && !state.ok && !fe?.email && !fe?.password ? state.error : null} />
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Entrar
      </Button>
    </form>
  );
}
