import { requirePartnerRestaurant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listRestaurantOrders } from "@/services/orders";
import { computeOrderStats, sinceDays } from "@/services/stats";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { PeriodTabs, parsePeriod } from "@/components/shared/period-tabs";
import { CsvButton } from "@/components/shared/csv-button";
import { Badge, Card, PageHeader, StatCard } from "@/components/ui/misc";
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE, PAYMENT_METHOD_LABEL } from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/utils/format";

export const metadata = { title: "Relatórios" };

export default async function PartnerReportsPage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const days = parsePeriod((await searchParams).dias);
  const restaurant = await requirePartnerRestaurant();
  const supabase = await createClient();
  const orders = await listRestaurantOrders(supabase, restaurant.id, { since: sinceDays(days), limit: 5000 });
  const s = computeOrderStats(orders, days);

  const rows = orders.map((o) => ({
    pedido: o.code,
    data: formatDateTime(o.created_at),
    cliente: o.customer_name,
    status: ORDER_STATUS_LABEL[o.status],
    pagamento: PAYMENT_METHOD_LABEL[o.payment_method],
    subtotal: Number(o.subtotal).toFixed(2).replace(".", ","),
    entrega: Number(o.delivery_fee).toFixed(2).replace(".", ","),
    desconto: Number(o.discount).toFixed(2).replace(".", ","),
    total: Number(o.total).toFixed(2).replace(".", ","),
  }));

  return (
    <div className="animate-fade-up">
      <PageHeader title="Relatórios" action={<PeriodTabs basePath="/parceiro/relatorios" current={days} />} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pedidos válidos" value={String(s.periodOrders)} />
        <StatCard label="Faturamento" value={formatCurrency(s.periodSales)} />
        <StatCard label="Ticket médio" value={formatCurrency(s.avgTicket)} />
        <StatCard label="Cancelados/recusados" value={String(s.cancelled)} />
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <BarChartCard title="Produtos mais vendidos" data={s.topProducts} horizontal height={300} />
        <BarChartCard title="Pedidos por horário" data={s.ordersByHour} height={300} />
      </div>
      <Card className="mt-4 overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <h2 className="font-bold">Pedidos do período ({orders.length})</h2>
          <CsvButton rows={rows} filename={`pedidos-${restaurant.slug}-${days}d.csv`} />
        </div>
        <div className="max-h-[480px] overflow-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="sticky top-0 bg-ink-50 text-left text-xs uppercase text-ink-500">
              <tr>
                <th className="px-4 py-2">Pedido</th>
                <th className="px-4 py-2">Data</th>
                <th className="px-4 py-2">Cliente</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-2 font-semibold">#{o.code}</td>
                  <td className="px-4 py-2">{formatDateTime(o.created_at)}</td>
                  <td className="px-4 py-2">{o.customer_name}</td>
                  <td className="px-4 py-2"><Badge tone={ORDER_STATUS_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge></td>
                  <td className="px-4 py-2 text-right font-semibold">{formatCurrency(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
