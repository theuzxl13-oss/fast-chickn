import type { SupabaseClient } from "@supabase/supabase-js";
import type { Banner, Category, MenuCategory, Product, Restaurant } from "@/types";
import { escapeLike } from "@/utils/sanitize";

export const RESTAURANT_SELECT = "*, category:categories(id,name,icon,slug)";
export const PRODUCT_SELECT =
  "*, options:product_options(*, items:product_option_items(*))";

function sortOptions(product: Product): Product {
  const options = (product.options ?? [])
    .map((o) => ({ ...o, items: [...(o.items ?? [])].sort((a, b) => a.sort_order - b.sort_order) }))
    .sort((a, b) => a.sort_order - b.sort_order);
  return { ...product, options };
}

export async function listCategories(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order");
  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function listBanners(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("banners").select("*").eq("is_active", true).order("sort_order");
  if (error) throw error;
  return (data ?? []) as Banner[];
}

export interface RestaurantFilters {
  category?: string | null; // slug
  freeDelivery?: boolean;
  promo?: boolean;
  sort?: "rating" | "time" | "fee" | "popular" | "recent";
}

export async function listRestaurants(supabase: SupabaseClient, filters: RestaurantFilters = {}) {
  let query = supabase.from("restaurants").select(RESTAURANT_SELECT).eq("status", "active");

  if (filters.category) {
    const { data: cat } = await supabase.from("categories").select("id").eq("slug", filters.category).maybeSingle();
    if (!cat) return [];
    query = query.eq("category_id", cat.id);
  }
  if (filters.freeDelivery) query = query.eq("delivery_fee", 0);
  if (filters.promo) query = query.not("promo_label", "is", null);

  switch (filters.sort) {
    case "rating":
      query = query.order("rating_avg", { ascending: false });
      break;
    case "time":
      query = query.order("delivery_time_min", { ascending: true });
      break;
    case "fee":
      query = query.order("delivery_fee", { ascending: true });
      break;
    case "recent":
      query = query.order("created_at", { ascending: false });
      break;
    default:
      query = query.order("is_featured", { ascending: false }).order("total_orders", { ascending: false });
  }

  const { data, error } = await query.limit(60);
  if (error) throw error;
  return (data ?? []) as Restaurant[];
}

export async function getRestaurantBySlug(supabase: SupabaseClient, slug: string) {
  const { data, error } = await supabase
    .from("restaurants")
    .select(RESTAURANT_SELECT)
    .eq("slug", slug)
    .maybeSingle<Restaurant>();
  if (error) throw error;
  return data;
}

export async function getMenu(supabase: SupabaseClient, restaurantId: string) {
  const [{ data: categories, error: e1 }, { data: products, error: e2 }] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .order("sort_order"),
    supabase.from("products").select(PRODUCT_SELECT).eq("restaurant_id", restaurantId).order("sort_order"),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  return {
    categories: (categories ?? []) as MenuCategory[],
    products: ((products ?? []) as Product[]).map(sortOptions),
  };
}

export async function getProductsByIds(supabase: SupabaseClient, ids: string[]) {
  if (!ids.length) return [];
  const { data, error } = await supabase.from("products").select(PRODUCT_SELECT).in("id", ids);
  if (error) throw error;
  return ((data ?? []) as Product[]).map(sortOptions);
}

export interface ProductHit extends Product {
  restaurant: Pick<Restaurant, "id" | "name" | "slug" | "logo_url" | "brand_color">;
}

/** Busca restaurantes e produtos (sem acento, sem diferenciar maiúsculas). */
export async function searchCatalog(supabase: SupabaseClient, rawQuery: string) {
  const q = escapeLike(rawQuery).slice(0, 60);
  if (q.length < 2) return { restaurants: [] as Restaurant[], products: [] as ProductHit[] };

  const [{ data: rIds, error: e1 }, { data: pRows, error: e2 }] = await Promise.all([
    supabase.rpc("search_restaurants", { p_query: q }).select("id"),
    supabase.rpc("search_products", { p_query: q, p_limit: 30 }).select("id"),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const restaurantIds = ((rIds ?? []) as { id: string }[]).map((r) => r.id);
  const productIds = ((pRows ?? []) as { id: string }[]).map((p) => p.id);

  const [{ data: restaurants }, { data: products }] = await Promise.all([
    restaurantIds.length
      ? supabase.from("restaurants").select(RESTAURANT_SELECT).in("id", restaurantIds)
      : Promise.resolve({ data: [] }),
    productIds.length
      ? supabase
          .from("products")
          .select("*, restaurant:restaurants(id,name,slug,logo_url,brand_color)")
          .in("id", productIds)
      : Promise.resolve({ data: [] }),
  ]);

  const rOrder = new Map(restaurantIds.map((id, i) => [id, i]));
  const pOrder = new Map(productIds.map((id, i) => [id, i]));
  return {
    restaurants: ((restaurants ?? []) as Restaurant[]).sort((a, b) => (rOrder.get(a.id) ?? 0) - (rOrder.get(b.id) ?? 0)),
    products: ((products ?? []) as ProductHit[]).sort((a, b) => (pOrder.get(a.id) ?? 0) - (pOrder.get(b.id) ?? 0)),
  };
}
