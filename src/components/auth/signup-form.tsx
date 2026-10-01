"use client";

import { useFormAction } from "@/hooks/use-form-action";
import { useState } from "react";
import { signUpAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { cn } from "@/utils/cn";

export function SignUpForm({ defaultType }: { defaultType: "client" | "restaurant" }) {
  const { state, onSubmit, pending } = useFormAction(signUpAction);
  const [type, setType] = useState(defaultType);
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  if (state?.ok) {
    return <FormMessage success={state.message} />;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Tipo de conta</legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            { v: "client" as const, label: "Quero pedir", icon: "🍔" },
            { v: "restaurant" as const, label: "Tenho restaurante", icon: "🏪" },
          ].map((o) => (
            <label
              key={o.v}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-1 rounded-2xl border p-3 text-sm font-semibold",
                type === o.v ? "border-brand-400 bg-brand-50 text-brand-700" : "border-ink-200",
              )}
            >
              <input type="radio" name="account_type" value={o.v} checked={type === o.v} onChange={() => setType(o.v)} className="sr-only" />
              <span className="text-2xl" aria-hidden>{o.icon}</span>
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label={type === "restaurant" ? "Nome do responsável" : "Nome completo"} htmlFor="full_name" error={fe?.full_name}>
        <Input id="full_name" name="full_name" autoComplete="name" required maxLength={120} />
      </Field>
      <Field label="E-mail" htmlFor="email" error={fe?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Celular" htmlFor="phone" error={fe?.phone}>
        <Input id="phone" name="phone" inputMode="tel" autoComplete="tel" placeholder="(11) 91234-5678" />
      </Field>
      <Field label="Senha" htmlFor="password" error={fe?.password} hint="Mínimo de 8 caracteres, com letras e números.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <FormMessage error={state && !state.ok && !fe ? state.error : null} />
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Criar conta
      </Button>
    </form>
  );
}
