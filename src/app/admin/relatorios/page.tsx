import { createClient } from "@/lib/supabase/server";
import { listPlatformOrders } from "@/services/admin";
import { computeOrderStats, sinceDays } from "@/services/stats";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { PeriodTabs, parsePeriod } from "@/components/shared/period-tabs";
import { CsvButton } from "@/components/shared/csv-button";
import { Card, PageHeader, StatCard } from "@/components/ui/misc";
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/utils/format";

export const metadata = { title: "Relatórios" };

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const days = parsePeriod((await searchParams).dias);
  const supabase = await createClient();
  const [orders, { data: signups }, { data: couponUses }] = await Promise.all([
    listPlatformOrders(supabase, { days, limit: 10000 }),
    supabase.from("profiles").select("created_at, role").gte("created_at", sinceDays(days)),
    supabase.from("coupon_uses").select("discount_amount, coupon:coupons(code)").gte("created_at", sinceDays(days)),
  ]);
  const s = computeOrderStats(orders, days);

  // Novos cadastros por dia
  const signupMap = new Map(s.salesByDay.map((d) => [d.label, 0]));
  (signups ?? []).forEach((p) => {
    const d = new Date(p.created_at);
    const label = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }).format(d);
    if (signupMap.has(label)) signupMap.set(label, (signupMap.get(label) ?? 0) + 1);
  });

  // Uso de cupons
  const couponMap = new Map<string, number>();
  ((couponUses ?? []) as unknown as { coupon: { code: string } | null }[]).forEach((u) => {
    const code = u.coupon?.code ?? "—";
    couponMap.set(code, (couponMap.get(code) ?? 0) + 1);
  });

  const rows = orders.map((o) => ({
    pedido: o.code,
    data: formatDateTime(o.created_at),
    restaurante: o.restaurant?.name ?? "",
    cliente: o.customer_name,
    status: ORDER_STATUS_LABEL[o.status],
    pagamento: PAYMENT_METHOD_LABEL[o.payment_method],
    cupom: o.coupon_code ?? "",
    total: Number(o.total).toFixed(2).replace(".", ","),
  }));

  const cancelRate = orders.length ? Math.round((s.cancelled / orders.length) * 100) : 0;

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Relatórios"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <CsvButton rows={rows} filename={`pedidos-plataforma-${days}d.csv`} />
            <PeriodTabs basePath="/admin/relatorios" current={days} />
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pedidos" value={String(orders.length)} />
        <StatCard label="GMV" value={formatCurrency(s.periodSales)} />
        <StatCard label="Taxa de cancelamento" value={`${cancelRate}%`} />
        <StatCard label="Novos cadastros" value={String(signups?.length ?? 0)} />
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <BarChartCard title="Novos cadastros por dia" data={[...signupMap.entries()].map(([label, value]) => ({ label, value }))} />
        <BarChartCard title="Pedidos por horário" data={s.ordersByHour} />
        <BarChartCard title="Produtos mais vendidos" data={s.topProducts} horizontal height={300} />
        <BarChartCard
          title="Cupons mais usados"
          data={[...couponMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }))}
          horizontal
          height={300}
        />
      </div>
      <Card className="mt-4 p-4 text-sm text-ink-500">
        Os relatórios consideram até 10.000 pedidos do período. Para volumes maiores, crie views agregadas no
        PostgreSQL (ver README).
      </Card>
    </div>
  );
}
