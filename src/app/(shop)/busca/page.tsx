import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDefaultAddress } from "@/lib/auth";
import { listCategories, listRestaurants, searchCatalog, type RestaurantFilters } from "@/services/catalog";
import { openFirst, toCardData } from "@/lib/restaurant-view";
import { CategoryRail } from "@/components/home/category-rail";
import { RestaurantGrid } from "@/components/home/section";
import { EmptyState } from "@/components/ui/misc";
import { FoodImage } from "@/components/ui/food-image";
import { formatCurrency } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { Restaurant } from "@/types";

export const metadata = { title: "Buscar" };

type Params = Promise<Record<string, string | string[] | undefined>>;

const SORTS: { value: NonNullable<RestaurantFilters["sort"]>; label: string }[] = [
  { value: "popular", label: "Relevância" },
  { value: "rating", label: "Mais bem avaliados" },
  { value: "time", label: "Menor tempo" },
  { value: "fee", label: "Menor taxa" },
  { value: "recent", label: "Novidades" },
];

function str(v: string | string[] | undefined) {
  return typeof v === "string" ? v : undefined;
}

export default async function SearchPage({ searchParams }: { searchParams: Params }) {
  const sp = await searchParams;
  const q = (str(sp.q) ?? "").slice(0, 60);
  const category = str(sp.categoria) ?? null;
  const freeDelivery = str(sp.gratis) === "1";
  const promo = str(sp.promo) === "1";
  const sortParam = str(sp.ordem);
  const sort = SORTS.some((s) => s.value === sortParam) ? (sortParam as RestaurantFilters["sort"]) : "popular";

  const supabase = await createClient();
  const [address, categories] = await Promise.all([getDefaultAddress(), listCategories(supabase)]);

  let restaurants: Restaurant[];
  let products: Awaited<ReturnType<typeof searchCatalog>>["products"] = [];
  if (q.trim().length >= 2) {
    const result = await searchCatalog(supabase, q);
    const cat = categories.find((c) => c.slug === category);
    restaurants = result.restaurants.filter(
      (r) =>
        (!cat || r.category_id === cat.id) &&
        (!freeDelivery || Number(r.delivery_fee) === 0) &&
        (!promo || !!r.promo_label),
    );
    const sorters: Record<string, (a: typeof restaurants[number], b: typeof restaurants[number]) => number> = {
      rating: (a, b) => b.rating_avg - a.rating_avg,
      time: (a, b) => a.delivery_time_min - b.delivery_time_min,
      fee: (a, b) => a.delivery_fee - b.delivery_fee,
      recent: (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
    };
    if (sort && sorters[sort]) restaurants.sort(sorters[sort]);
    products = result.products;
  } else {
    restaurants = await listRestaurants(supabase, { category, freeDelivery, promo, sort });
  }

  const cards = openFirst(toCardData(restaurants, address));

  const buildHref = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams();
    const current: Record<string, string | null> = {
      q: q || null,
      categoria: category,
      gratis: freeDelivery ? "1" : null,
      promo: promo ? "1" : null,
      ordem: sort === "popular" ? null : sort ?? null,
      ...patch,
    };
    Object.entries(current).forEach(([k, v]) => v && next.set(k, v));
    const s = next.toString();
    return s ? `/busca?${s}` : "/busca";
  };

  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition",
      active ? "border-brand-500 bg-brand-500 text-white" : "border-ink-200 bg-white text-ink-700 hover:border-ink-300",
    );

  return (
    <div className="animate-fade-up">
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight">
        {q ? <>Resultados para “{q}”</> : "Buscar restaurantes"}
      </h1>

      <CategoryRail categories={categories} active={category} />

      <div className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0" role="toolbar" aria-label="Filtros">
        <Link href={buildHref({ gratis: freeDelivery ? null : "1" })} className={chip(freeDelivery)}>
          🛵 Entrega grátis
        </Link>
        <Link href={buildHref({ promo: promo ? null : "1" })} className={chip(promo)}>
          🔥 Promoções
        </Link>
        {SORTS.slice(1).map((s) => (
          <Link key={s.value} href={buildHref({ ordem: sort === s.value ? null : s.value })} className={chip(sort === s.value)}>
            {s.label}
          </Link>
        ))}
        {(category || freeDelivery || promo || sort !== "popular") && (
          <Link href={q ? `/busca?q=${encodeURIComponent(q)}` : "/busca"} className="shrink-0 px-3 py-2 text-sm font-semibold text-brand-600">
            Limpar filtros
          </Link>
        )}
      </div>

      {products.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-extrabold">Pratos</h2>
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
            {products.map((p) => (
              <Link
                key={p.id}
                href={`/restaurante/${p.restaurant.slug}?produto=${p.id}`}
                className="w-44 shrink-0 snap-start overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                <FoodImage src={p.image_url} alt={p.name} seed={p.id} className="h-28 w-full text-xl" rounded="rounded-none" />
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-bold leading-snug">{p.name}</p>
                  <p className="mt-0.5 truncate text-xs text-ink-500">{p.restaurant.name}</p>
                  <p className="mt-1 text-sm font-extrabold text-ink-900">
                    {formatCurrency(p.promo_price ?? p.price)}
                    {p.promo_price && (
                      <span className="ml-1 text-xs font-medium text-ink-400 line-through">{formatCurrency(p.price)}</span>
                    )}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-extrabold">
          Restaurantes <span className="text-sm font-semibold text-ink-400">({cards.length})</span>
        </h2>
        {cards.length ? (
          <RestaurantGrid items={cards} />
        ) : (
          <EmptyState
            emoji="🔎"
            title="Nada encontrado"
            description="Tente outro termo ou remova alguns filtros."
          />
        )}
      </section>
    </div>
  );
}
