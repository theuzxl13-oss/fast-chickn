"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { deleteMenuCategoryAction, saveMenuCategoryAction } from "@/app/actions/partner";
import { useFormAction } from "@/hooks/use-form-action";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { Badge, Card, EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import type { MenuCategory } from "@/types";

function CategoryForm({ category, onDone }: { category: MenuCategory | null; onDone: () => void }) {
  const { state, onSubmit, pending, fieldErrors, error } = useFormAction(saveMenuCategoryAction);
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      toast(state.message ?? "Salvo!");
      router.refresh();
      onDone();
    }
  }, [state, toast, router, onDone]);

  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-[80px_1fr_100px_auto] md:items-end">
      {category && <input type="hidden" name="id" value={category.id} />}
      <Field label="Ícone" htmlFor="c-icon" error={fieldErrors?.icon}>
        <Input id="c-icon" name="icon" defaultValue={category?.icon ?? "🍔"} maxLength={16} className="text-center text-lg" />
      </Field>
      <Field label="Nome" htmlFor="c-name" error={fieldErrors?.name}>
        <Input id="c-name" name="name" defaultValue={category?.name} required maxLength={60} placeholder="Ex.: Lanches" />
      </Field>
      <Field label="Ordem" htmlFor="c-sort" error={fieldErrors?.sort_order}>
        <Input id="c-sort" name="sort_order" type="number" min={0} max={999} defaultValue={category?.sort_order ?? 0} />
      </Field>
      <label className="flex h-12 items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="is_active" defaultChecked={category?.is_active ?? true} className="h-4 w-4 accent-brand-500" />
        Ativa
      </label>
      <div className="md:col-span-4">
        <FormMessage error={error} />
        <div className="mt-2 flex gap-2">
          <Button variant="ghost" onClick={onDone}>Cancelar</Button>
          <Button type="submit" loading={pending}>{category ? "Salvar" : "Criar categoria"}</Button>
        </div>
      </div>
    </form>
  );
}

export function MenuCategoryManager({ categories, counts }: { categories: MenuCategory[]; counts: Record<string, number> }) {
  const [editing, setEditing] = useState<MenuCategory | "new" | null>(categories.length ? null : "new");
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();

  return (
    <div className="space-y-4">
      {editing ? (
        <Card className="p-5">
          <CategoryForm category={editing === "new" ? null : editing} onDone={() => setEditing(null)} />
        </Card>
      ) : (
        <Button onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" aria-hidden /> Nova categoria
        </Button>
      )}

      {categories.length === 0 ? (
        <EmptyState emoji="🗂️" title="Nenhuma categoria" description="Crie categorias como Lanches, Porções e Bebidas." />
      ) : (
        <Card className="divide-y divide-ink-100">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-4">
              <span className="text-2xl" aria-hidden>{c.icon}</span>
              <div className="flex-1">
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs text-ink-500">{counts[c.id] ?? 0} produtos · ordem {c.sort_order}</p>
              </div>
              {!c.is_active && <Badge>Oculta</Badge>}
              <Button size="icon" variant="ghost" onClick={() => setEditing(c)} aria-label={`Editar ${c.name}`}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-red-600 hover:bg-red-50"
                disabled={pending}
                aria-label={`Excluir ${c.name}`}
                onClick={() =>
                  confirm(`Excluir a categoria "${c.name}"? Os produtos não serão apagados.`) &&
                  start(async () => {
                    const res = await deleteMenuCategoryAction(c.id);
                    toast(res.ok ? res.message! : res.error, res.ok ? "success" : "error");
                    router.refresh();
                  })
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
