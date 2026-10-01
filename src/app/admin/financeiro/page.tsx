import { createClient } from "@/lib/supabase/server";
import { listPlatformOrders } from "@/services/admin";
import { computeOrderStats } from "@/services/stats";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { PeriodTabs, parsePeriod } from "@/components/shared/period-tabs";
import { CsvButton } from "@/components/shared/csv-button";
import { Card, PageHeader, StatCard } from "@/components/ui/misc";
import { formatCurrency } from "@/utils/format";

export const metadata = { title: "Financeiro" };

export default async function AdminFinancePage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const days = parsePeriod((await searchParams).dias);
  const supabase = await createClient();
  const [orders, { data: settings }] = await Promise.all([
    listPlatformOrders(supabase, { days, limit: 10000 }),
    supabase.from("app_settings").select("platform_fee_percent").eq("id", 1).maybeSingle<{ platform_fee_percent: number }>(),
  ]);
  const feePct = Number(settings?.platform_fee_percent ?? 12);
  const s = computeOrderStats(orders, days);
  const delivered = orders.filter((o) => o.status === "delivered");

  // Repasse por restaurante (pedidos entregues)
  const perRestaurant = new Map<string, { name: string; orders: number; subtotal: number; delivery: number; discount: number }>();
  delivered.forEach((o) => {
    const key = o.restaurant_id;
    const cur = perRestaurant.get(key) ?? { name: o.restaurant?.name ?? "—", orders: 0, subtotal: 0, delivery: 0, discount: 0 };
    cur.orders++;
    cur.subtotal += Number(o.subtotal);
    cur.delivery += Number(o.delivery_fee);
    cur.discount += Number(o.discount);
    perRestaurant.set(key, cur);
  });
  const rows = [...perRestaurant.values()]
    .map((r) => {
      const fee = (r.subtotal * feePct) / 100;
      return { ...r, fee, net: r.subtotal + r.delivery - r.discount - fee };
    })
    .sort((a, b) => b.subtotal - a.subtotal);

  const totalFee = rows.reduce((a, r) => a + r.fee, 0);
  const totalNet = rows.reduce((a, r) => a + r.net, 0);
  const totalDiscount = delivered.reduce((a, o) => a + Number(o.discount), 0);

  return (
    <div className="animate-fade-up">
      <PageHeader title="Financeiro" description="Faturamento, comissão e repasses (pedidos entregues)." action={<PeriodTabs basePath="/admin/financeiro" current={days} />} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="GMV" value={formatCurrency(s.periodSales)} hint={`${s.periodOrders} pedidos válidos`} />
        <StatCard label={`Comissão (${feePct}%)`} value={formatCurrency(totalFee)} />
        <StatCard label="Repasse aos restaurantes" value={formatCurrency(totalNet)} />
        <StatCard label="Descontos concedidos" value={formatCurrency(totalDiscount)} />
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <BarChartCard title="GMV por dia" data={s.salesByDay} currency />
        <BarChartCard title="GMV por forma de pagamento" data={s.byPayment} currency horizontal />
      </div>
      <Card className="mt-4 overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <h2 className="font-bold">Repasses por restaurante</h2>
          <CsvButton
            filename={`repasses-${days}d.csv`}
            rows={rows.map((r) => ({
              restaurante: r.name,
              pedidos: r.orders,
              vendas: r.subtotal.toFixed(2).replace(".", ","),
              entregas: r.delivery.toFixed(2).replace(".", ","),
              descontos: r.discount.toFixed(2).replace(".", ","),
              comissao: r.fee.toFixed(2).replace(".", ","),
              repasse: r.net.toFixed(2).replace(".", ","),
            }))}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase text-ink-500">
              <tr>
                <th className="px-4 py-2">Restaurante</th>
                <th className="px-4 py-2 text-right">Pedidos</th>
                <th className="px-4 py-2 text-right">Vendas</th>
                <th className="px-4 py-2 text-right">Comissão</th>
                <th className="px-4 py-2 text-right">Repasse</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((r) => (
                <tr key={r.name}>
                  <td className="px-4 py-2 font-semibold">{r.name}</td>
                  <td className="px-4 py-2 text-right">{r.orders}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(r.subtotal)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(r.fee)}</td>
                  <td className="px-4 py-2 text-right font-bold">{formatCurrency(r.net)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-500">Sem pedidos entregues no período.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
