"use client";

import { updateSettingsAction } from "@/app/actions/admin";
import { useFormAction } from "@/hooks/use-form-action";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Toggle } from "@/components/ui/form";
import type { AppSettings } from "@/types";

export function SettingsForm({ settings }: { settings: AppSettings }) {
  const { onSubmit, pending, fieldErrors: fe, error, success } = useFormAction(updateSettingsAction);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Comissão da plataforma (%)" htmlFor="fee" error={fe?.platform_fee_percent} hint="Aplicada sobre o valor dos itens dos pedidos entregues.">
        <Input id="fee" name="platform_fee_percent" inputMode="decimal" defaultValue={String(settings.platform_fee_percent).replace(".", ",")} />
      </Field>
      <Field label="E-mail de suporte" htmlFor="email" error={fe?.support_email}>
        <Input id="email" name="support_email" type="email" defaultValue={settings.support_email ?? ""} />
      </Field>
      <Field label="Telefone de suporte" htmlFor="phone" error={fe?.support_phone}>
        <Input id="phone" name="support_phone" inputMode="tel" defaultValue={settings.support_phone ?? ""} />
      </Field>
      <Toggle
        name="demo_payments"
        defaultChecked={settings.demo_payments}
        label="PIX em modo demonstração"
        description="Gera QR Codes fictícios e permite simular o pagamento. Desative ao integrar um gateway real."
      />
      <FormMessage error={error} success={success} />
      <Button type="submit" loading={pending}>Salvar configurações</Button>
    </form>
  );
}
