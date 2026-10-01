import { requirePartnerRestaurant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listRestaurantOrders } from "@/services/orders";
import { computeOrderStats, sinceDays } from "@/services/stats";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { PeriodTabs, parsePeriod } from "@/components/shared/period-tabs";
import { Card, PageHeader, StatCard } from "@/components/ui/misc";
import { formatCurrency } from "@/utils/format";

export const metadata = { title: "Financeiro" };

export default async function PartnerFinancePage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const days = parsePeriod((await searchParams).dias);
  const restaurant = await requirePartnerRestaurant();
  const supabase = await createClient();
  const [orders, { data: settings }] = await Promise.all([
    listRestaurantOrders(supabase, restaurant.id, { since: sinceDays(days), limit: 5000 }),
    supabase.from("app_settings").select("platform_fee_percent").eq("id", 1).maybeSingle<{ platform_fee_percent: number }>(),
  ]);

  const stats = computeOrderStats(orders, days);
  const delivered = orders.filter((o) => o.status === "delivered");
  const subtotal = delivered.reduce((s, o) => s + Number(o.subtotal), 0);
  const deliveryFees = delivered.reduce((s, o) => s + Number(o.delivery_fee), 0);
  const discounts = delivered.reduce((s, o) => s + Number(o.discount), 0);
  const feePct = Number(settings?.platform_fee_percent ?? 12);
  const platformFee = (subtotal * feePct) / 100;
  const net = subtotal + deliveryFees - discounts - platformFee;
  const pendingPix = orders.filter((o) => o.payment?.method === "pix" && o.payment.status === "pending" && o.status !== "cancelled" && o.status !== "rejected");

  return (
    <div className="animate-fade-up">
      <PageHeader title="Financeiro" description="Valores de pedidos entregues no período." action={<PeriodTabs basePath="/parceiro/financeiro" current={days} />} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Vendas (itens)" value={formatCurrency(subtotal)} hint={`${delivered.length} pedidos entregues`} />
        <StatCard label="Taxas de entrega" value={formatCurrency(deliveryFees)} />
        <StatCard label="Descontos" value={`− ${formatCurrency(discounts)}`} />
        <StatCard label={`Comissão FAST CHICKN (${feePct}%)`} value={`− ${formatCurrency(platformFee)}`} />
      </div>
      <Card className="mt-3 flex flex-wrap items-center justify-between gap-2 bg-ink-900 p-5 text-white">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-300">Repasse estimado</p>
          <p className="text-3xl font-black">{formatCurrency(net)}</p>
        </div>
        <p className="max-w-md text-xs text-ink-300">
          Estimativa = vendas + entregas − descontos − comissão. O repasse automático depende da integração com o
          gateway de pagamento (integração futura).
        </p>
      </Card>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <BarChartCard title="Faturamento por dia" data={stats.salesByDay} currency />
        <BarChartCard title="Faturamento por forma de pagamento" data={stats.byPayment} currency horizontal />
      </div>
      {pendingPix.length > 0 && (
        <Card className="mt-4 p-5">
          <h2 className="font-bold">PIX aguardando pagamento</h2>
          <ul className="mt-2 text-sm text-ink-600">
            {pendingPix.map((o) => (
              <li key={o.id}>#{o.code} · {formatCurrency(o.total)}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
