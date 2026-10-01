import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listUserOrders } from "@/services/orders";
import { ReorderButton } from "@/components/orders/reorder-button";
import { Badge, Card, EmptyState, PageHeader, RatingStars } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import { RestaurantLogo } from "@/components/ui/food-image";
import { ACTIVE_ORDER_STATUSES, ORDER_STATUS_LABEL, ORDER_STATUS_TONE } from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/utils/format";

export const metadata = { title: "Meus pedidos" };

export default async function OrdersPage() {
  const { user } = await requireUser("/pedidos");
  const supabase = await createClient();
  const orders = await listUserOrders(supabase, user.id);

  if (!orders.length) {
    return (
      <EmptyState
        emoji="🧾"
        title="Você ainda não fez pedidos"
        description="Quando fizer, eles aparecerão aqui para você acompanhar."
        action={<LinkButton href="/">Fazer meu primeiro pedido</LinkButton>}
      />
    );
  }

  const active = orders.filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status));
  const past = orders.filter((o) => !ACTIVE_ORDER_STATUSES.includes(o.status));

  return (
    <div className="mx-auto max-w-3xl animate-fade-up">
      <PageHeader title="Meus pedidos" />

      {active.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">Em andamento</h2>
          <div className="space-y-3">
            {active.map((o) => (
              <Link key={o.id} href={`/pedido/${o.id}`} className="block">
                <Card className="flex items-center gap-3 border-brand-200 p-4 transition hover:shadow-lift">
                  <span className="h-3 w-3 shrink-0 rounded-full bg-brand-500 animate-pulse-ring" aria-hidden />
                  <div className="flex-1">
                    <p className="font-bold">{o.restaurant?.name}</p>
                    <p className="text-sm text-brand-700">{ORDER_STATUS_LABEL[o.status]}</p>
                  </div>
                  <span className="text-sm font-semibold text-ink-500">#{o.code}</span>
                  <ChevronRight className="h-5 w-5 text-ink-400" aria-hidden />
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-500">Histórico</h2>
        <div className="space-y-3">
          {past.map((o) => (
            <Card key={o.id} className="p-4">
              <Link href={`/pedido/${o.id}`} className="flex items-start gap-3">
                <RestaurantLogo src={o.restaurant?.logo_url} name={o.restaurant?.name ?? "?"} color={o.restaurant?.brand_color} className="h-12 w-12 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold">{o.restaurant?.name}</p>
                    <Badge tone={ORDER_STATUS_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge>
                  </div>
                  <p className="text-xs text-ink-500">
                    {formatDateTime(o.created_at)} · #{o.code}
                  </p>
                  <p className="mt-1 truncate text-sm text-ink-600">
                    {(o.items ?? []).map((i) => `${i.quantity}× ${i.product_name}`).join(", ")}
                  </p>
                  <p className="mt-1 text-sm font-bold">{formatCurrency(o.total)}</p>
                </div>
              </Link>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3">
                {o.restaurant && <ReorderButton restaurantId={o.restaurant.id} items={o.items ?? []} />}
                {o.status === "delivered" &&
                  (o.review ? (
                    <span className="inline-flex items-center gap-2 text-xs text-ink-500">
                      Sua avaliação: <RatingStars value={o.review.rating} size={12} />
                    </span>
                  ) : (
                    <LinkButton href={`/pedidos/${o.id}/avaliar`} variant="outline" size="sm">
                      ⭐ Avaliar pedido
                    </LinkButton>
                  ))}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
