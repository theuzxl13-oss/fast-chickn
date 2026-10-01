"use client";

import { useFormAction } from "@/hooks/use-form-action";
import { updateProfileAction } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";

export function ProfileForm({ fullName, email, phone }: { fullName: string; email: string; phone: string }) {
  const { state, onSubmit, pending } = useFormAction(updateProfileAction);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Nome completo" htmlFor="full_name" error={fe?.full_name}>
        <Input id="full_name" name="full_name" defaultValue={fullName} required maxLength={120} autoComplete="name" />
      </Field>
      <Field label="E-mail" htmlFor="email" hint="O e-mail de acesso não pode ser alterado por aqui.">
        <Input id="email" value={email} disabled readOnly />
      </Field>
      <Field label="Celular" htmlFor="phone" error={fe?.phone}>
        <Input id="phone" name="phone" defaultValue={phone} inputMode="tel" placeholder="(11) 91234-5678" autoComplete="tel" />
      </Field>
      <FormMessage error={state && !state.ok ? state.error : null} success={state?.ok ? state.message : null} />
      <Button type="submit" loading={pending} className="w-full">
        Salvar
      </Button>
    </form>
  );
}
