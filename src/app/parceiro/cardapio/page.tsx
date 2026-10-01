import { requirePartnerRestaurant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PRODUCT_SELECT } from "@/services/catalog";
import { MenuManager } from "@/components/partner/menu-manager";
import { PageHeader } from "@/components/ui/misc";
import type { MenuCategory, Product } from "@/types";

export const metadata = { title: "Cardápio" };

export default async function PartnerMenuPage() {
  const restaurant = await requirePartnerRestaurant();
  const supabase = await createClient();
  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from("menu_categories").select("*").eq("restaurant_id", restaurant.id).order("sort_order"),
    supabase.from("products").select(PRODUCT_SELECT).eq("restaurant_id", restaurant.id).order("sort_order"),
  ]);

  return (
    <div className="animate-fade-up">
      <PageHeader title="Cardápio" description="Cadastre produtos, fotos, preços, adicionais e disponibilidade." />
      <MenuManager
        restaurantId={restaurant.id}
        categories={(categories ?? []) as MenuCategory[]}
        products={(products ?? []) as Product[]}
      />
    </div>
  );
}
