"use client";

import { useMemo, useState } from "react";
import { FoodImage } from "@/components/ui/food-image";
import { Badge } from "@/components/ui/misc";
import { ProductModal } from "@/components/restaurant/product-modal";
import type { MenuCategory, Product, Restaurant } from "@/types";
import { formatCurrency } from "@/utils/format";
import { cn } from "@/utils/cn";

interface Section {
  id: string;
  title: string;
  products: Product[];
}

export function RestaurantMenu({
  restaurant,
  categories,
  products,
  isOpen,
  initialProductId,
}: {
  restaurant: Restaurant;
  categories: MenuCategory[];
  products: Product[];
  isOpen: boolean;
  initialProductId: string | null;
}) {
  const [selected, setSelected] = useState<Product | null>(
    () => products.find((p) => p.id === initialProductId) ?? null,
  );
  const [query, setQuery] = useState("");

  const sections = useMemo<Section[]>(() => {
    const term = query.trim().toLowerCase();
    const filtered = term
      ? products.filter((p) => `${p.name} ${p.description ?? ""}`.toLowerCase().includes(term))
      : products;

    const out: Section[] = [];
    if (!term) {
      const popular = [...products]
        .filter((p) => p.is_available && (p.is_featured || p.sold_count > 0))
        .sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || b.sold_count - a.sold_count)
        .slice(0, 4);
      if (popular.length) out.push({ id: "mais-pedidos", title: "🔥 Mais pedidos", products: popular });
    }
    for (const c of categories) {
      const list = filtered.filter((p) => p.menu_category_id === c.id);
      if (list.length) out.push({ id: c.id, title: `${c.icon ? `${c.icon} ` : ""}${c.name}`, products: list });
    }
    const orphan = filtered.filter((p) => !categories.some((c) => c.id === p.menu_category_id));
    if (orphan.length) out.push({ id: "outros", title: "Outros", products: orphan });
    return out;
  }, [products, categories, query]);

  const emojiFor = (p: Product) =>
    categories.find((c) => c.id === p.menu_category_id)?.icon ?? restaurant.category?.icon ?? "🍗";

  return (
    <div className="mt-6">
      <div className="sticky top-[4.25rem] z-20 -mx-4 border-b border-ink-100 bg-ink-50/95 px-4 py-3 backdrop-blur md:top-[4.5rem] md:mx-0 md:px-0">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar no cardápio"
          aria-label="Buscar no cardápio"
          className="mb-3 h-10 w-full rounded-xl border border-ink-200 bg-white px-4 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100 md:max-w-sm"
        />
        <nav className="no-scrollbar flex gap-2 overflow-x-auto" aria-label="Categorias do cardápio">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#sec-${s.id}`}
              className="shrink-0 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-ink-700 shadow-soft hover:text-brand-600"
            >
              {s.title}
            </a>
          ))}
        </nav>
      </div>

      {sections.length === 0 && <p className="py-10 text-center text-sm text-ink-500">Nenhum item encontrado.</p>}

      {sections.map((s) => (
        <section key={s.id} id={`sec-${s.id}`} className="scroll-mt-40 pt-6">
          <h2 className="mb-3 text-lg font-extrabold">{s.title}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {s.products.map((p) => (
              <button
                key={`${s.id}-${p.id}`}
                type="button"
                onClick={() => setSelected(p)}
                className={cn(
                  "flex gap-3 rounded-3xl border border-ink-100 bg-white p-3 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift",
                  !p.is_available && "opacity-60",
                )}
              >
                <div className="min-w-0 flex-1 py-1">
                  <h3 className="font-bold leading-snug text-ink-900">{p.name}</h3>
                  {p.description && <p className="mt-1 line-clamp-2 text-sm text-ink-500">{p.description}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {p.promo_price ? (
                      <>
                        <span className="font-extrabold text-emerald-700">{formatCurrency(p.promo_price)}</span>
                        <span className="text-xs text-ink-400 line-through">{formatCurrency(p.price)}</span>
                        <Badge tone="success">-{Math.round((1 - p.promo_price / p.price) * 100)}%</Badge>
                      </>
                    ) : (
                      <span className="font-extrabold text-ink-900">{formatCurrency(p.price)}</span>
                    )}
                    {!p.is_available && <Badge tone="neutral">Indisponível</Badge>}
                  </div>
                </div>
                <FoodImage src={p.image_url} alt={p.name} seed={p.id} emoji={emojiFor(p)} className="h-24 w-24 shrink-0 text-lg md:h-28 md:w-28" />
              </button>
            ))}
          </div>
        </section>
      ))}

      {selected && (
        <ProductModal
          key={selected.id}
          product={selected}
          restaurant={restaurant}
          isOpen={isOpen}
          emoji={emojiFor(selected)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
