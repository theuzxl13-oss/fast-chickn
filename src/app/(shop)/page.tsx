import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDefaultAddress, getSession } from "@/lib/auth";
import { listBanners, listCategories, listRestaurants } from "@/services/catalog";
import { openFirst, toCardData } from "@/lib/restaurant-view";
import { BannerCarousel } from "@/components/home/banner-carousel";
import { CategoryRail } from "@/components/home/category-rail";
import { RestaurantGrid, RestaurantRow } from "@/components/home/section";
import { EmptyState } from "@/components/ui/misc";
import { BRAND } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const [{ profile }, address, categories, banners, restaurants] = await Promise.all([
    getSession(),
    getDefaultAddress(),
    listCategories(supabase),
    listBanners(supabase),
    listRestaurants(supabase),
  ]);

  const cards = openFirst(toCardData(restaurants, address));
  const featured = cards.filter((c) => c.restaurant.is_featured);
  const freeDelivery = cards.filter((c) => Number(c.restaurant.delivery_fee) === 0);
  const promos = cards.filter((c) => c.restaurant.promo_label);
  const popular = [...cards].sort((a, b) => b.restaurant.total_orders - a.restaurant.total_orders).slice(0, 10);
  const newest = [...cards]
    .sort((a, b) => +new Date(b.restaurant.created_at) - +new Date(a.restaurant.created_at))
    .slice(0, 10);

  const firstName = profile?.full_name.split(" ")[0];

  return (
    <div className="animate-fade-up">
      <div className="mb-5">
        <p className="text-sm font-medium text-ink-500">{firstName ? `Olá, ${firstName} 👋` : "Bem-vindo à FAST CHICKN"}</p>
        <h1 className="text-2xl font-black italic tracking-tight md:text-3xl">{BRAND.slogan}</h1>
      </div>

      <CategoryRail categories={categories} />

      <div className="mt-6">
        <BannerCarousel banners={banners} />
      </div>

      {cards.length === 0 ? (
        <EmptyState
          title="Nenhum restaurante disponível ainda"
          description="Assim que nossos parceiros forem aprovados, eles aparecerão aqui."
        />
      ) : (
        <>
          <RestaurantRow title="Destaques" emoji="⭐" items={featured} href="/busca?ordem=rating" />
          <RestaurantRow title="Entrega grátis" emoji="🛵" items={freeDelivery} href="/busca?gratis=1" />
          <RestaurantRow title="Promoções" emoji="🔥" items={promos} href="/busca?promo=1" />
          <RestaurantRow title="Mais pedidos" emoji="🏆" items={popular} href="/busca?ordem=popular" />
          <RestaurantRow title="Novidades" emoji="✨" items={newest} href="/busca?ordem=recent" />

          <section className="mt-10">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold tracking-tight md:text-xl">Restaurantes</h2>
              <Link
                href="/busca"
                className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-ink-50"
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filtros
              </Link>
            </div>
            <RestaurantGrid items={cards} />
          </section>
        </>
      )}
    </div>
  );
}
