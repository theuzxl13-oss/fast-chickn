"use client";

import { useFormAction } from "@/hooks/use-form-action";
import { useState } from "react";
import { registerRestaurantAction } from "@/app/actions/partner";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { BR_STATES } from "@/lib/constants";
import type { Category } from "@/types";

export function RestaurantSignupForm({ categories }: { categories: Category[] }) {
  const { state, onSubmit, pending } = useFormAction(registerRestaurantAction);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  const [addr, setAddr] = useState({ street: "", neighborhood: "", city: "", state: "SP" });

  async function lookup(cep: string) {
    const d = cep.replace(/\D/g, "");
    if (d.length !== 8) return;
    try {
      const data = await (await fetch(`https://viacep.com.br/ws/${d}/json/`)).json();
      if (!data.erro) setAddr({ street: data.logradouro, neighborhood: data.bairro, city: data.localidade, state: data.uf });
    } catch {
      /* preenchimento manual */
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <Field label="Nome do restaurante" htmlFor="name" error={fe?.name} className="md:col-span-2">
        <Input id="name" name="name" required maxLength={80} />
      </Field>
      <Field label="Categoria principal" htmlFor="category_id" error={fe?.category_id}>
        <Select id="category_id" name="category_id" required defaultValue="">
          <option value="" disabled>Selecione</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </Select>
      </Field>
      <Field label="Telefone da loja" htmlFor="phone" error={fe?.phone}>
        <Input id="phone" name="phone" inputMode="tel" required placeholder="(11) 3333-4444" />
      </Field>
      <Field label="CPF ou CNPJ" htmlFor="document" error={fe?.document} className="md:col-span-2">
        <Input id="document" name="document" inputMode="numeric" required />
      </Field>
      <Field label="CEP" htmlFor="cep" error={fe?.cep}>
        <Input id="cep" name="cep" inputMode="numeric" required maxLength={9} onChange={(e) => lookup(e.target.value)} />
      </Field>
      <Field label="Número" htmlFor="number" error={fe?.number}>
        <Input id="number" name="number" required maxLength={20} />
      </Field>
      <Field label="Rua" htmlFor="street" error={fe?.street} className="md:col-span-2">
        <Input id="street" name="street" required value={addr.street} onChange={(e) => setAddr({ ...addr, street: e.target.value })} />
      </Field>
      <Field label="Bairro" htmlFor="neighborhood" error={fe?.neighborhood}>
        <Input id="neighborhood" name="neighborhood" required value={addr.neighborhood} onChange={(e) => setAddr({ ...addr, neighborhood: e.target.value })} />
      </Field>
      <div className="grid grid-cols-[1fr_90px] gap-3">
        <Field label="Cidade" htmlFor="city" error={fe?.city}>
          <Input id="city" name="city" required value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} />
        </Field>
        <Field label="UF" htmlFor="state" error={fe?.state}>
          <Select id="state" name="state" value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })}>
            {BR_STATES.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Descrição (opcional)" htmlFor="description" error={fe?.description} className="md:col-span-2">
        <Textarea id="description" name="description" maxLength={500} placeholder="Conte o que torna sua comida especial" />
      </Field>
      <div className="md:col-span-2">
        <FormMessage error={state && !state.ok ? state.error : null} />
        <Button type="submit" size="lg" className="mt-2 w-full" loading={pending}>
          Enviar para aprovação
        </Button>
      </div>
    </form>
  );
}
