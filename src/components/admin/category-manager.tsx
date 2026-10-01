"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { deleteCategoryAction, saveCategoryAction } from "@/app/actions/admin";
import { useFormAction } from "@/hooks/use-form-action";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { Badge, Card } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import type { Category } from "@/types";

function CategoryForm({ category, onDone }: { category: Category | null; onDone: () => void }) {
  const { state, onSubmit, pending, fieldErrors: fe, error } = useFormAction(saveCategoryAction);
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
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-[90px_1fr_100px_auto] md:items-end">
      {category && <input type="hidden" name="id" value={category.id} />}
      <Field label="Ícone" htmlFor="cat-icon" error={fe?.icon}>
        <Input id="cat-icon" name="icon" defaultValue={category?.icon ?? "🍽️"} maxLength={16} className="text-center text-lg" />
      </Field>
      <Field label="Nome" htmlFor="cat-name" error={fe?.name}>
        <Input id="cat-name" name="name" defaultValue={category?.name} required maxLength={40} />
      </Field>
      <Field label="Ordem" htmlFor="cat-sort" error={fe?.sort_order}>
        <Input id="cat-sort" name="sort_order" type="number" min={0} max={999} defaultValue={category?.sort_order ?? 0} />
      </Field>
      <label className="flex h-12 items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="is_active" defaultChecked={category?.is_active ?? true} className="h-4 w-4 accent-brand-500" /> Ativa
      </label>
      <div className="md:col-span-4">
        <FormMessage error={error} />
        <div className="mt-2 flex gap-2">
          <Button variant="ghost" onClick={onDone}>Cancelar</Button>
          <Button type="submit" loading={pending}>Salvar</Button>
        </div>
      </div>
    </form>
  );
}

export function CategoryManager({ categories, counts }: { categories: Category[]; counts: Record<string, number> }) {
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  return (
    <div className="space-y-4">
      {editing ? (
        <Card className="p-5">
          <CategoryForm category={editing === "new" ? null : editing} onDone={() => setEditing(null)} />
        </Card>
      ) : (
        <Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" aria-hidden /> Nova categoria</Button>
      )}
      <Card className="divide-y divide-ink-100">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center gap-3 p-4">
            <span className="text-2xl" aria-hidden>{c.icon}</span>
            <div className="flex-1">
              <p className="font-semibold">{c.name}</p>
              <p className="text-xs text-ink-500">/{c.slug} · {counts[c.id] ?? 0} restaurantes · ordem {c.sort_order}</p>
            </div>
            {!c.is_active && <Badge>Inativa</Badge>}
            <Button size="icon" variant="ghost" onClick={() => setEditing(c)} aria-label={`Editar ${c.name}`}><Pencil className="h-4 w-4" /></Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-red-600 hover:bg-red-50"
              disabled={pending}
              aria-label={`Excluir ${c.name}`}
              onClick={() =>
                confirm(`Excluir "${c.name}"? Restaurantes ficarão sem categoria.`) &&
                start(async () => {
                  const res = await deleteCategoryAction(c.id);
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
    </div>
  );
}
