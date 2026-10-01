import type { SupabaseClient } from "@supabase/supabase-js";
import type { Order, OrderStatusHistory } from "@/types";

export const ORDER_SELECT =
  "*, items:order_items(*), restaurant:restaurants(id,name,slug,logo_url,brand_color,phone), payment:payments(*), review:reviews(id,rating)";

/** PostgREST retorna relações 1-1 como objeto ou array conforme a FK; normaliza. */
export function normalizeOrder(row: Record<string, unknown>): Order {
  const one = <T,>(v: unknown) => (Array.isArray(v) ? ((v[0] ?? null) as T | null) : ((v ?? null) as T | null));
  return {
    ...(row as unknown as Order),
    payment: one(row.payment),
    review: one(row.review),
    restaurant: one(row.restaurant),
  };
}

export async function getOrder(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase.from("orders").select(ORDER_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? normalizeOrder(data) : null;
}

export async function getOrderHistory(supabase: SupabaseClient, orderId: string) {
  const { data, error } = await supabase
    .from("order_status_history")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as OrderStatusHistory[];
}

export async function listUserOrders(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map(normalizeOrder);
}

export async function listRestaurantOrders(
  supabase: SupabaseClient,
  restaurantId: string,
  opts: { statuses?: string[]; since?: string; limit?: number } = {},
) {
  let query = supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.statuses?.length) query = query.in("status", opts.statuses);
  if (opts.since) query = query.gte("created_at", opts.since);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(normalizeOrder);
}
