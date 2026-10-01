import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RESTAURANT_SELECT } from "@/services/catalog";
import { RestaurantActions } from "@/components/admin/restaurant-actions";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { RestaurantLogo } from "@/components/ui/food-image";
import { RESTAURANT_STATUS_LABEL } from "@/lib/constants";
import type { Restaurant, RestaurantStatus } from "@/types";
import { formatDate, formatRating } from "@/utils/format";
import { escapeLike } from "@/utils/sanitize";
import { cn } from "@/utils/cn";

export const metadata = { title: "Restaurantes" };

const STATUSES: (RestaurantStatus | "all")[] = ["all", "pending", "active", "suspended", "blocked", "rejected"];
const TONE = { pending: "warning", active: "success", suspended: "neutral", blocked: "danger", rejected: "danger" } as const;

export default async function AdminRestaurantsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as RestaurantStatus) ? (sp.status as RestaurantStatus) : "all";
  const q = escapeLike(sp.q ?? "").slice(0, 60);

  const supabase = await createClient();
  let query = supabase.from("restaurants").select(RESTAURANT_SELECT).order("created_at", { ascending: false });
  if (status !== "all") query = query.eq("status", status);
  if (q) query = query.ilike("name", `%${q}%`);
  const { data } = await query.limit(200);
  const restaurants = (data ?? []) as Restaurant[];

  return (
    <div className="animate-fade-up">
      <PageHeader title="Restaurantes" description="Aprove, suspenda, bloqueie e edite estabelecimentos." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/restaurantes${s === "all" ? "" : `?status=${s}`}`}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold",
              status === s ? "bg-ink-900 text-white" : "bg-white text-ink-600 shadow-soft",
            )}
          >
            {s === "all" ? "Todos" : RESTAURANT_STATUS_LABEL[s]}
          </Link>
        ))}
        <form className="ml-auto">
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nome"
            className="h-10 rounded-2xl border border-ink-200 bg-white px-4 text-sm"
            aria-label="Buscar restaurante"
          />
        </form>
      </div>

      {restaurants.length === 0 ? (
        <EmptyState emoji="🏪" title="Nenhum restaurante encontrado" />
      ) : (
        <Card className="divide-y divide-ink-100">
          {restaurants.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 p-4">
              <RestaurantLogo src={r.logo_url} name={r.name} color={r.brand_color} className="h-12 w-12 shrink-0" />
              <Link href={`/admin/restaurantes/${r.id}`} className="min-w-0 flex-1 hover:text-brand-600">
                <p className="flex flex-wrap items-center gap-2 font-bold">
                  {r.name}
                  <Badge tone={TONE[r.status]}>{RESTAURANT_STATUS_LABEL[r.status]}</Badge>
                  {r.is_featured && <Badge tone="brand">Destaque</Badge>}
                </p>
                <p className="text-xs text-ink-500">
                  {r.category?.icon} {r.category?.name ?? "Sem categoria"} · {r.city ?? "—"}/{r.state ?? "—"} · ⭐{" "}
                  {r.rating_count ? formatRating(r.rating_avg) : "—"} · {r.total_orders} pedidos · desde {formatDate(r.created_at)}
                </p>
              </Link>
              <RestaurantActions id={r.id} status={r.status} featured={r.is_featured} />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
