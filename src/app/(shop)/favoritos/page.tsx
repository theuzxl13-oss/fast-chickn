import { requireUser, getDefaultAddress } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RESTAURANT_SELECT } from "@/services/catalog";
import { toCardData } from "@/lib/restaurant-view";
import { RestaurantGrid } from "@/components/home/section";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import type { Restaurant } from "@/types";

export const metadata = { title: "Favoritos" };

export default async function FavoritesPage() {
  const { user } = await requireUser("/favoritos");
  const supabase = await createClient();
  const [address, { data }] = await Promise.all([
    getDefaultAddress(),
    supabase
      .from("favorites")
      .select(`created_at, restaurant:restaurants(${RESTAURANT_SELECT})`)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const restaurants = ((data ?? []) as unknown as { restaurant: Restaurant | null }[])
    .map((f) => f.restaurant)
    .filter((r): r is Restaurant => !!r && r.status === "active");

  return (
    <div className="animate-fade-up">
      <PageHeader title="Favoritos" description="Seus restaurantes preferidos em um só lugar." />
      {restaurants.length ? (
        <RestaurantGrid items={toCardData(restaurants, address)} />
      ) : (
        <EmptyState
          emoji="❤️"
          title="Nenhum favorito ainda"
          description="Toque no coração na página de um restaurante para salvá-lo aqui."
          action={<LinkButton href="/">Explorar restaurantes</LinkButton>}
        />
      )}
    </div>
  );
}
