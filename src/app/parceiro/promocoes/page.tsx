import { requirePartnerRestaurant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PromotionsManager } from "@/components/partner/promotions-manager";
import { PageHeader } from "@/components/ui/misc";
import type { Product } from "@/types";

export const metadata = { title: "Promoções" };

export default async function PartnerPromotionsPage() {
  const restaurant = await requirePartnerRestaurant();
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, name, price, promo_price, image_url, is_available")
    .eq("restaurant_id", restaurant.id)
    .order("name");

  return (
    <div className="animate-fade-up">
      <PageHeader title="Promoções" description="Defina preços promocionais e o selo de promoção exibido na vitrine." />
      <PromotionsManager label={restaurant.promo_label} products={(data ?? []) as Product[]} />
    </div>
  );
}
