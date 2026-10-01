import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, MapPin, Phone, Wallet } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOrder, getOrderHistory } from "@/services/orders";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { OrderLiveRefresh } from "@/components/orders/order-live-refresh";
import { PixPanel } from "@/components/orders/pix-panel";
import { CancelOrderButton } from "@/components/orders/cancel-order-button";
import { OrderItemsList } from "@/components/orders/order-items-list";
import { OrderSummary } from "@/components/cart/order-summary";
import { Badge, Card } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";
import { RestaurantLogo } from "@/components/ui/food-image";
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/constants";
import { formatCurrency, formatDateTime, formatPhone, formatTime } from "@/utils/format";

export const metadata = { title: "Acompanhar pedido" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ novo?: string }> };

export default async function OrderPage({ params, searchParams }: Props) {
  const [{ id }, { novo }] = await Promise.all([params, searchParams]);
  const { user } = await requireUser(`/pedido/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const order = await getOrder(supabase, id);
  if (!order || order.user_id !== user.id) notFound();
  const history = await getOrderHistory(supabase, id);

  const created = new Date(order.created_at);
  const etaFrom = formatTime(new Date(created.getTime() + order.estimated_min * 60_000));
  const etaTo = formatTime(new Date(created.getTime() + order.estimated_max * 60_000));
  const finished = ["delivered", "cancelled", "rejected"].includes(order.status);
  const a = order.delivery_address;

  return (
    <div className="mx-auto max-w-3xl animate-fade-up">
      <OrderLiveRefresh orderId={order.id} />

      {novo && order.status === "pending" && (
        <div className="mb-4 flex items-center gap-3 rounded-3xl bg-emerald-600 p-5 text-white shadow-lift">
          <CheckCircle2 className="h-10 w-10 shrink-0" aria-hidden />
          <div>
            <p className="text-xl font-extrabold">Pedido confirmado!</p>
            <p className="text-sm text-white/90">Enviamos seu pedido ao restaurante. Acompanhe por aqui.</p>
          </div>
        </div>
      )}

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <RestaurantLogo
              src={order.restaurant?.logo_url}
              name={order.restaurant?.name ?? "Restaurante"}
              color={order.restaurant?.brand_color}
              className="h-12 w-12"
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Pedido</p>
              <h1 className="text-2xl font-black tracking-tight">#{order.code}</h1>
              <p className="text-sm text-ink-500">
                {order.restaurant?.name} · {formatDateTime(order.created_at)}
              </p>
            </div>
          </div>
          <Badge tone={ORDER_STATUS_TONE[order.status]}>{ORDER_STATUS_LABEL[order.status]}</Badge>
        </div>

        {!finished && (
          <p className="mt-4 rounded-2xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800">
            Seu pedido deve chegar entre {etaFrom} e {etaTo}.
          </p>
        )}

        <div className="mt-5">
          <OrderTimeline status={order.status} history={history} cancelReason={order.cancel_reason} />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {order.status === "pending" && <CancelOrderButton orderId={order.id} />}
          {order.status === "delivered" && !order.review && (
            <LinkButton href={`/pedidos/${order.id}/avaliar`}>Avaliar pedido</LinkButton>
          )}
          {order.restaurant?.phone && !finished && (
            <a
              href={`tel:${order.restaurant.phone}`}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-ink-200 px-4 text-sm font-semibold hover:bg-ink-50"
            >
              <Phone className="h-4 w-4" aria-hidden /> {formatPhone(order.restaurant.phone)}
            </a>
          )}
        </div>
      </Card>

      {order.payment_method === "pix" && order.payment && !["cancelled", "rejected"].includes(order.status) && (
        <PixPanel orderId={order.id} payment={order.payment} total={order.total} />
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 font-bold">Itens</h2>
          <OrderItemsList items={order.items ?? []} />
          <div className="mt-4 border-t border-ink-100 pt-4">
            <OrderSummary
              subtotal={Number(order.subtotal)}
              deliveryFee={Number(order.delivery_fee)}
              discount={Number(order.discount)}
              total={Number(order.total)}
            />
            {order.coupon_code && <p className="mt-2 text-xs text-emerald-700">Cupom {order.coupon_code} aplicado</p>}
          </div>
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-2 flex items-center gap-2 font-bold">
              <MapPin className="h-4 w-4 text-brand-500" aria-hidden /> Entrega
            </h2>
            <p className="text-sm text-ink-700">
              {a.street}, {a.number}
              {a.complement ? ` - ${a.complement}` : ""}
              <br />
              {a.neighborhood}, {a.city}/{a.state}
              {a.reference && (
                <>
                  <br />
                  <span className="text-ink-500">Ref.: {a.reference}</span>
                </>
              )}
            </p>
          </Card>
          <Card className="p-5">
            <h2 className="mb-2 flex items-center gap-2 font-bold">
              <Wallet className="h-4 w-4 text-brand-500" aria-hidden /> Pagamento
            </h2>
            <p className="text-sm text-ink-700">
              {PAYMENT_METHOD_LABEL[order.payment_method]}
              {order.payment && (
                <Badge tone={order.payment.status === "paid" ? "success" : "neutral"} className="ml-2">
                  {PAYMENT_STATUS_LABEL[order.payment.status]}
                </Badge>
              )}
            </p>
            {order.change_for && <p className="mt-1 text-sm text-ink-500">Troco para {formatCurrency(order.change_for)}</p>}
          </Card>
          {order.notes && (
            <Card className="p-5">
              <h2 className="mb-1 font-bold">Observações</h2>
              <p className="text-sm text-ink-600">{order.notes}</p>
            </Card>
          )}
          <Link href="/pedidos" className="block text-center text-sm font-semibold text-brand-600 hover:underline">
            Ver todos os pedidos
          </Link>
        </div>
      </div>
    </div>
  );
}
