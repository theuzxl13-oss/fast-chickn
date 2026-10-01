import { requirePartnerRestaurant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MenuCategoryManager } from "@/components/partner/menu-category-manager";
import { PageHeader } from "@/components/ui/misc";
import type { MenuCategory } from "@/types";

export const metadata = { title: "Categorias" };

export default async function PartnerCategoriesPage() {
  const restaurant = await requirePartnerRestaurant();
  const supabase = await createClient();
  const [{ data: categories }, { data: counts }] = await Promise.all([
    supabase.from("menu_categories").select("*").eq("restaurant_id", restaurant.id).order("sort_order"),
    supabase.from("products").select("menu_category_id").eq("restaurant_id", restaurant.id),
  ]);
  const countMap: Record<string, number> = {};
  (counts ?? []).forEach((p) => {
    if (p.menu_category_id) countMap[p.menu_category_id] = (countMap[p.menu_category_id] ?? 0) + 1;
  });

  return (
    <div className="animate-fade-up">
      <PageHeader title="Categorias do cardápio" description="Organize as seções exibidas no seu cardápio (ex.: Lanches, Bebidas)." />
      <MenuCategoryManager categories={(categories ?? []) as MenuCategory[]} counts={countMap} />
    </div>
  );
}
