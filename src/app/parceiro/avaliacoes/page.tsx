import { requirePartnerRestaurant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ReviewReply } from "@/components/partner/review-reply";
import { Card, EmptyState, PageHeader, RatingStars, StatCard } from "@/components/ui/misc";
import type { Review } from "@/types";
import { formatDate, formatRating } from "@/utils/format";

export const metadata = { title: "Avaliações" };

export default async function PartnerReviewsPage() {
  const restaurant = await requirePartnerRestaurant();
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("*, order:orders(code, customer_name)")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const reviews = (data ?? []) as (Review & { order: { code: string; customer_name: string } | null })[];

  const avg = (k: "food_rating" | "delivery_rating") => {
    const v = reviews.map((r) => r[k]).filter((x): x is number => x != null);
    return v.length ? formatRating(v.reduce((a, b) => a + b, 0) / v.length) : "—";
  };

  return (
    <div className="animate-fade-up">
      <PageHeader title="Avaliações" description="Responda seus clientes — as respostas aparecem na página da loja." />
      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard label="Nota geral" value={restaurant.rating_count ? formatRating(restaurant.rating_avg) : "—"} hint={`${restaurant.rating_count} avaliações`} />
        <StatCard label="Comida" value={avg("food_rating")} />
        <StatCard label="Entrega" value={avg("delivery_rating")} />
      </div>
      {reviews.length === 0 ? (
        <EmptyState emoji="⭐" title="Nenhuma avaliação ainda" description="Elas aparecem após os pedidos entregues serem avaliados." />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {reviews.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center justify-between">
                <RatingStars value={r.rating} />
                <span className="text-xs text-ink-400">
                  #{r.order?.code} · {formatDate(r.created_at)}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold">{r.order?.customer_name?.split(" ")[0]}</p>
              <p className="text-xs text-ink-500">
                Comida: {r.food_rating ?? "—"} · Entrega: {r.delivery_rating ?? "—"}
              </p>
              {r.comment && <p className="mt-2 text-sm text-ink-700">{r.comment}</p>}
              <ReviewReply reviewId={r.id} reply={r.reply} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
