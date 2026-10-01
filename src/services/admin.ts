import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { ORDER_SELECT, normalizeOrder } from "@/services/orders";
import { sinceDays } from "@/services/stats";

/** Pedidos de toda a plataforma no período (somente admin — garantido por RLS). */
export async function listPlatformOrders(
  supabase: SupabaseClient,
  opts: { days?: number; status?: string | null; limit?: number } = {},
) {
  let query = supabase
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 2000);
  if (opts.days) query = query.gte("created_at", sinceDays(opts.days));
  if (opts.status) query = query.eq("status", opts.status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(normalizeOrder);
}
