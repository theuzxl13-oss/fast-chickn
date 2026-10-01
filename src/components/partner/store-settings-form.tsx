"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateRestaurantSettingsAction } from "@/app/actions/partner";
import { useFormAction } from "@/hooks/use-form-action";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select, Textarea, Toggle } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { ImageUpload } from "@/components/partner/image-upload";
import type { Category, Restaurant } from "@/types";

const money = (v: number) => String(v).replace(".", ",");

export function StoreSettingsForm({ restaurant: r, categories }: { restaurant: Restaurant; categories: Category[] }) {
  const { state, onSubmit, pending, fieldErrors: fe, error } = useFormAction(updateRestaurantSettingsAction);
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      toast(state.message ?? "Salvo!");
      router.refresh();
    }
  }, [state, toast, router]);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
        <ImageUpload name="logo_url" restaurantId={r.id} folder="brand" defaultUrl={r.logo_url} label="Logo" />
        <ImageUpload name="banner_url" restaurantId={r.id} folder="brand" defaultUrl={r.banner_url} label="Banner" aspect="aspect-[3/1] sm:h-[160px] sm:aspect-auto" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nome da loja" htmlFor="s-name" error={fe?.name}>
          <Input id="s-name" name="name" defaultValue={r.name} required maxLength={80} />
        </Field>
        <Field label="Categoria" htmlFor="s-cat" error={fe?.category_id}>
          <Select id="s-cat" name="category_id" defaultValue={r.category_id ?? ""}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Descrição" htmlFor="s-desc" error={fe?.description} className="md:col-span-2">
          <Textarea id="s-desc" name="description" defaultValue={r.description ?? ""} maxLength={500} />
        </Field>
        <Field label="Tags (separadas por vírgula)" htmlFor="s-tags" error={fe?.tags} hint="Ex.: Lanches, Porções">
          <Input id="s-tags" name="tags" defaultValue={r.tags.join(", ")} />
        </Field>
        <Field label="Telefone" htmlFor="s-phone" error={fe?.phone}>
          <Input id="s-phone" name="phone" defaultValue={r.phone ?? ""} inputMode="tel" required />
        </Field>
        <Field label="Cor da marca" htmlFor="s-color" error={fe?.brand_color}>
          <Input id="s-color" name="brand_color" type="color" defaultValue={r.brand_color} className="h-12 p-1" />
        </Field>
        <Field label="Selo de promoção" htmlFor="s-promo" error={fe?.promo_label} hint="Opcional">
          <Input id="s-promo" name="promo_label" defaultValue={r.promo_label ?? ""} maxLength={40} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Field label="Taxa de entrega (R$)" htmlFor="s-fee" error={fe?.delivery_fee} hint="0 = entrega grátis">
          <Input id="s-fee" name="delivery_fee" inputMode="decimal" defaultValue={money(r.delivery_fee)} />
        </Field>
        <Field label="Pedido mínimo (R$)" htmlFor="s-min" error={fe?.min_order}>
          <Input id="s-min" name="min_order" inputMode="decimal" defaultValue={money(r.min_order)} />
        </Field>
        <Field label="Tempo mín. (min)" htmlFor="s-tmin" error={fe?.delivery_time_min}>
          <Input id="s-tmin" name="delivery_time_min" type="number" min={5} max={240} defaultValue={r.delivery_time_min} />
        </Field>
        <Field label="Tempo máx. (min)" htmlFor="s-tmax" error={fe?.delivery_time_max}>
          <Input id="s-tmax" name="delivery_time_max" type="number" min={5} max={300} defaultValue={r.delivery_time_max} />
        </Field>
      </div>

      <Toggle name="accepting_orders" defaultChecked={r.accepting_orders} label="Recebendo pedidos" description="Desative para pausar a loja temporariamente." />

      <FormMessage error={error} />
      <Button type="submit" loading={pending} className="w-full md:w-auto">
        Salvar configurações
      </Button>
    </form>
  );
}
