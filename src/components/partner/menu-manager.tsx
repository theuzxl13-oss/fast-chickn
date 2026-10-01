"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteProductAction, duplicateProductAction, toggleProductAction } from "@/app/actions/partner";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/misc";
import { FoodImage } from "@/components/ui/food-image";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { ProductForm } from "@/components/partner/product-form";
import type { MenuCategory, Product } from "@/types";
import { formatCurrency } from "@/utils/format";
import { cn } from "@/utils/cn";

export function MenuManager({
  restaurantId,
  categories,
  products,
}: {
  restaurantId: string;
  categories: MenuCategory[];
  products: Product[];
}) {
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [filter, setFilter] = useState("all");
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const res = await fn();
      toast(res.ok ? res.message ?? "Pronto!" : res.error ?? "Erro", res.ok ? "success" : "error");
      router.refresh();
    });

  const groups = useMemo(() => {
    const list = [...categories.map((c) => ({ id: c.id, name: `${c.icon ?? ""} ${c.name}`.trim() })), { id: "none", name: "Sem categoria" }];
    return list
      .filter((g) => filter === "all" || filter === g.id)
      .map((g) => ({
        ...g,
        products: products.filter((p) => (g.id === "none" ? !categories.some((c) => c.id === p.menu_category_id) : p.menu_category_id === g.id)),
      }))
      .filter((g) => g.products.length || g.id !== "none");
  }, [categories, products, filter]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" aria-hidden /> Novo produto
        </Button>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-11 rounded-2xl border border-ink-200 bg-white px-3 text-sm"
          aria-label="Filtrar por categoria"
        >
          <option value="all">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <span className="text-sm text-ink-500">{products.length} produtos</span>
      </div>

      {products.length === 0 && (
        <EmptyState emoji="🍔" title="Seu cardápio está vazio" description="Crie categorias e cadastre o primeiro produto." />
      )}

      <div className="space-y-6">
        {groups.map((g) => (
          <section key={g.id}>
            <h2 className="mb-2 font-extrabold">{g.name}</h2>
            {g.products.length === 0 ? (
              <p className="rounded-2xl bg-white p-4 text-sm text-ink-400">Nenhum produto nesta categoria.</p>
            ) : (
              <Card className="divide-y divide-ink-100">
                {g.products.map((p) => (
                  <div key={p.id} className={cn("flex flex-wrap items-center gap-3 p-3", !p.is_available && "bg-ink-50")}>
                    <FoodImage src={p.image_url} alt={p.name} seed={p.id} className="h-14 w-14 shrink-0 text-sm" />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-semibold">
                        {p.name}
                        {!p.is_available && <Badge>Desativado</Badge>}
                        {p.is_featured && <Badge tone="brand">Destaque</Badge>}
                        {(p.options?.length ?? 0) > 0 && <Badge tone="info">{p.options!.length} grupo(s) de adicionais</Badge>}
                      </p>
                      <p className="text-sm">
                        {p.promo_price ? (
                          <>
                            <span className="font-bold text-emerald-700">{formatCurrency(p.promo_price)}</span>{" "}
                            <span className="text-xs text-ink-400 line-through">{formatCurrency(p.price)}</span>
                          </>
                        ) : (
                          <span className="font-bold">{formatCurrency(p.price)}</span>
                        )}
                        <span className="ml-2 text-xs text-ink-400">{p.sold_count} vendidos</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <label className="mr-2 flex cursor-pointer items-center gap-2 text-xs font-semibold text-ink-600">
                        <input
                          type="checkbox"
                          checked={p.is_available}
                          disabled={pending}
                          onChange={(e) => run(() => toggleProductAction(p.id, e.target.checked))}
                          className="h-4 w-4 accent-emerald-600"
                        />
                        Disponível
                      </label>
                      <Button size="icon" variant="ghost" onClick={() => setEditing(p)} aria-label={`Editar ${p.name}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" disabled={pending} onClick={() => run(() => duplicateProductAction(p.id))} aria-label={`Duplicar ${p.name}`}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50"
                        disabled={pending}
                        onClick={() => confirm(`Excluir "${p.name}"?`) && run(() => deleteProductAction(p.id))}
                        aria-label={`Excluir ${p.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </section>
        ))}
      </div>

      {editing && (
        <Modal open onClose={() => setEditing(null)} title={editing === "new" ? "Novo produto" : `Editar: ${editing.name}`} className="md:max-w-2xl">
          <ProductForm
            restaurantId={restaurantId}
            categories={categories}
            product={editing === "new" ? null : editing}
            onDone={() => {
              setEditing(null);
              router.refresh();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
