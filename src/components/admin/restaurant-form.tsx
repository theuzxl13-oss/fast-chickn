"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { adminUpdateRestaurantAction } from "@/app/actions/admin";
import { useFormAction } from "@/hooks/use-form-action";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import type { Restaurant } from "@/types";

export function AdminRestaurantForm({ restaurant: r }: { restaurant: Restaurant }) {
  const { state, onSubmit, pending, fieldErrors: fe, error } = useFormAction(adminUpdateRestaurantAction);
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      toast(state.message ?? "Salvo!");
      router.refresh();
    }
  }, [state, toast, router]);

  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="id" value={r.id} />
      <Field label="Nome" htmlFor="a-name" error={fe?.name}>
        <Input id="a-name" name="name" defaultValue={r.name} required maxLength={80} />
      </Field>
      <Field label="Slug (URL)" htmlFor="a-slug" error={fe?.slug}>
        <Input id="a-slug" name="slug" defaultValue={r.slug} required maxLength={60} />
      </Field>
      <Field label="Descrição" htmlFor="a-desc" error={fe?.description} className="md:col-span-2">
        <Textarea id="a-desc" name="description" defaultValue={r.description ?? ""} maxLength={500} />
      </Field>
      <Field label="Taxa de entrega" htmlFor="a-fee" error={fe?.delivery_fee}>
        <Input id="a-fee" name="delivery_fee" inputMode="decimal" defaultValue={String(r.delivery_fee).replace(".", ",")} />
      </Field>
      <Field label="Pedido mínimo" htmlFor="a-min" error={fe?.min_order}>
        <Input id="a-min" name="min_order" inputMode="decimal" defaultValue={String(r.min_order).replace(".", ",")} />
      </Field>
      <Field label="Tempo mín. (min)" htmlFor="a-tmin" error={fe?.delivery_time_min}>
        <Input id="a-tmin" name="delivery_time_min" type="number" defaultValue={r.delivery_time_min} />
      </Field>
      <Field label="Tempo máx. (min)" htmlFor="a-tmax" error={fe?.delivery_time_max}>
        <Input id="a-tmax" name="delivery_time_max" type="number" defaultValue={r.delivery_time_max} />
      </Field>
      <Field label="Selo de promoção" htmlFor="a-promo" error={fe?.promo_label} className="md:col-span-2">
        <Input id="a-promo" name="promo_label" defaultValue={r.promo_label ?? ""} maxLength={40} />
      </Field>
      <div className="md:col-span-2">
        <FormMessage error={error} />
        <Button type="submit" loading={pending} className="mt-2">Salvar</Button>
      </div>
    </form>
  );
}
