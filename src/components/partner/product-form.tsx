"use client";

import { useFormAction } from "@/hooks/use-form-action";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { saveProductAction } from "@/app/actions/partner";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { ImageUpload } from "@/components/partner/image-upload";
import type { MenuCategory, Product } from "@/types";

interface ItemDraft {
  id?: string;
  name: string;
  price: string;
  is_available: boolean;
}
interface GroupDraft {
  id?: string;
  name: string;
  min_select: number;
  max_select: number;
  items: ItemDraft[];
}

const PRESETS: { label: string; group: GroupDraft }[] = [
  { label: "Tamanho", group: { name: "Tamanho", min_select: 1, max_select: 1, items: [{ name: "Normal", price: "0", is_available: true }, { name: "Grande", price: "6", is_available: true }] } },
  { label: "Adicionais", group: { name: "Adicionais", min_select: 0, max_select: 5, items: [{ name: "Bacon", price: "4", is_available: true }, { name: "Queijo", price: "3", is_available: true }] } },
  { label: "Molhos", group: { name: "Molhos", min_select: 0, max_select: 2, items: [{ name: "Molho especial", price: "2", is_available: true }] } },
];

function toDraft(product: Product | null): GroupDraft[] {
  return (product?.options ?? []).map((o) => ({
    id: o.id,
    name: o.name,
    min_select: o.min_select,
    max_select: o.max_select,
    items: o.items.map((i) => ({ id: i.id, name: i.name, price: String(i.price), is_available: i.is_available })),
  }));
}

export function ProductForm({
  restaurantId,
  categories,
  product,
  onDone,
}: {
  restaurantId: string;
  categories: MenuCategory[];
  product: Product | null;
  onDone: () => void;
}) {
  const { state, onSubmit, pending } = useFormAction(saveProductAction);
  const [groups, setGroups] = useState<GroupDraft[]>(() => toDraft(product));
  const toast = useToast();
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  useEffect(() => {
    if (state?.ok) {
      toast(state.message ?? "Salvo!");
      onDone();
    }
  }, [state, onDone, toast]);

  const updateGroup = (gi: number, patch: Partial<GroupDraft>) =>
    setGroups((prev) => prev.map((g, i) => (i === gi ? { ...g, ...patch } : g)));
  const updateItem = (gi: number, ii: number, patch: Partial<ItemDraft>) =>
    setGroups((prev) =>
      prev.map((g, i) => (i === gi ? { ...g, items: g.items.map((it, j) => (j === ii ? { ...it, ...patch } : it)) } : g)),
    );

  const serialized = JSON.stringify(
    groups.map((g) => ({
      ...g,
      items: g.items.map((i) => ({ ...i, price: Number(String(i.price).replace(",", ".")) || 0 })),
    })),
  );

  return (
    <form onSubmit={onSubmit} className="space-y-5 p-5">
      {product && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="options" value={serialized} />

      <div className="grid gap-4 md:grid-cols-[180px_1fr]">
        <ImageUpload name="image_url" restaurantId={restaurantId} folder="products" defaultUrl={product?.image_url} label="Foto" />
        <div className="space-y-4">
          <Field label="Nome" htmlFor="p-name" error={fe?.name}>
            <Input id="p-name" name="name" defaultValue={product?.name} required maxLength={80} placeholder="Ex.: X-Frango Especial" />
          </Field>
          <Field label="Categoria" htmlFor="p-cat" error={fe?.menu_category_id}>
            <Select id="p-cat" name="menu_category_id" defaultValue={product?.menu_category_id ?? ""}>
              <option value="">Sem categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </Select>
          </Field>
        </div>
      </div>

      <Field label="Descrição" htmlFor="p-desc" error={fe?.description}>
        <Textarea id="p-desc" name="description" defaultValue={product?.description ?? ""} maxLength={500} placeholder="Pão, frango, queijo, bacon, salada e molho especial." />
      </Field>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Field label="Preço (R$)" htmlFor="p-price" error={fe?.price}>
          <Input id="p-price" name="price" inputMode="decimal" defaultValue={product ? String(product.price).replace(".", ",") : ""} required placeholder="28,90" />
        </Field>
        <Field label="Preço promocional" htmlFor="p-promo" error={fe?.promo_price}>
          <Input id="p-promo" name="promo_price" inputMode="decimal" defaultValue={product?.promo_price ? String(product.promo_price).replace(".", ",") : ""} placeholder="Opcional" />
        </Field>
        <Field label="Ordem" htmlFor="p-sort" error={fe?.sort_order}>
          <Input id="p-sort" name="sort_order" type="number" min={0} max={999} defaultValue={product?.sort_order ?? 0} />
        </Field>
      </div>

      <Field label="Ingredientes removíveis" htmlFor="p-ing" hint="Separe por vírgula. O cliente poderá remover cada um." error={fe?.ingredients}>
        <Input id="p-ing" name="ingredients" defaultValue={product?.ingredients.join(", ")} placeholder="cebola, tomate, alface" />
      </Field>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="is_available" defaultChecked={product?.is_available ?? true} className="h-4 w-4 accent-brand-500" />
          Disponível
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="is_featured" defaultChecked={product?.is_featured ?? false} className="h-4 w-4 accent-brand-500" />
          Exibir em “Mais pedidos”
        </label>
      </div>

      {/* Grupos de adicionais */}
      <div className="space-y-3 rounded-3xl bg-ink-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-bold">Adicionais e opções</p>
          <div className="flex flex-wrap gap-1">
            {PRESETS.map((p) => (
              <Button key={p.label} size="sm" variant="outline" onClick={() => setGroups((g) => [...g, structuredClone(p.group)])}>
                <Plus className="h-3.5 w-3.5" aria-hidden /> {p.label}
              </Button>
            ))}
            <Button size="sm" variant="outline" onClick={() => setGroups((g) => [...g, { name: "", min_select: 0, max_select: 1, items: [{ name: "", price: "0", is_available: true }] }])}>
              <Plus className="h-3.5 w-3.5" aria-hidden /> Grupo
            </Button>
          </div>
        </div>
        {groups.length === 0 && <p className="text-sm text-ink-500">Nenhum grupo. Use os atalhos acima (tamanho, adicionais, molhos).</p>}
        {groups.map((g, gi) => (
          <div key={gi} className="space-y-2 rounded-2xl border border-ink-100 bg-white p-3">
            <div className="grid grid-cols-[1fr_70px_70px_auto] items-end gap-2">
              <Field label="Grupo" htmlFor={`g-${gi}`}>
                <Input id={`g-${gi}`} value={g.name} onChange={(e) => updateGroup(gi, { name: e.target.value })} maxLength={60} className="h-10" />
              </Field>
              <Field label="Mín." htmlFor={`gmin-${gi}`}>
                <Input id={`gmin-${gi}`} type="number" min={0} max={20} value={g.min_select} onChange={(e) => updateGroup(gi, { min_select: Number(e.target.value) })} className="h-10 px-2" />
              </Field>
              <Field label="Máx." htmlFor={`gmax-${gi}`}>
                <Input id={`gmax-${gi}`} type="number" min={1} max={20} value={g.max_select} onChange={(e) => updateGroup(gi, { max_select: Number(e.target.value) })} className="h-10 px-2" />
              </Field>
              <Button size="icon" variant="ghost" className="text-red-600" onClick={() => setGroups((prev) => prev.filter((_, i) => i !== gi))} aria-label="Remover grupo">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {g.items.map((it, ii) => (
              <div key={ii} className="grid grid-cols-[1fr_90px_auto_auto] items-center gap-2">
                <Input value={it.name} onChange={(e) => updateItem(gi, ii, { name: e.target.value })} placeholder="Item" maxLength={60} className="h-10" aria-label="Nome do item" />
                <Input value={it.price} onChange={(e) => updateItem(gi, ii, { price: e.target.value.replace(/[^0-9,\.]/g, "") })} inputMode="decimal" placeholder="+ R$" className="h-10 px-3" aria-label="Preço adicional" />
                <label className="flex items-center gap-1 text-xs" title="Disponível">
                  <input type="checkbox" checked={it.is_available} onChange={(e) => updateItem(gi, ii, { is_available: e.target.checked })} className="accent-emerald-600" />
                  Ativo
                </label>
                <button type="button" onClick={() => updateGroup(gi, { items: g.items.filter((_, j) => j !== ii) })} className="grid h-8 w-8 place-items-center rounded-full text-ink-400 hover:text-red-600" aria-label="Remover item">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => updateGroup(gi, { items: [...g.items, { name: "", price: "0", is_available: true }] })} className="text-sm font-semibold text-brand-600">
              + Adicionar item
            </button>
          </div>
        ))}
      </div>

      <FormMessage error={state && !state.ok ? state.error : null} />
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onDone}>Cancelar</Button>
        <Button type="submit" className="flex-1" loading={pending}>
          {product ? "Salvar alterações" : "Criar produto"}
        </Button>
      </div>
    </form>
  );
}
