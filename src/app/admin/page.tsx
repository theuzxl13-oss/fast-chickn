import Link from "next/link";
import { DollarSign, Receipt, Store, TrendingUp, UserPlus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listPlatformOrders } from "@/services/admin";
import { computeOrderStats, sinceDays } from "@/services/stats";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { Card, PageHeader, StatCard } from "@/components/ui/misc";
import { formatCurrency } from "@/utils/format";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const supabase = await createClient();
  const [orders, users, restaurants, pendingRestaurants, totalOrders, newUsers, { data: settings }] = await Promise.all([
    listPlatformOrders(supabase, { days: 30, limit: 5000 }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("restaurants").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("restaurants").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", sinceDays(7)),
    supabase.from("app_settings").select("platform_fee_percent").eq("id", 1).maybeSingle<{ platform_fee_percent: number }>(),
  ]);

  const s = computeOrderStats(orders, 30);
  const feePct = Number(settings?.platform_fee_percent ?? 12);
  const revenue = orders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + (Number(o.subtotal) * feePct) / 100, 0);

  const byRestaurant = new Map<string, number>();
  orders
    .filter((o) => o.status !== "cancelled" && o.status !== "rejected")
    .forEach((o) => {
      const name = o.restaurant?.name ?? "—";
      byRestaurant.set(name, (byRestaurant.get(name) ?? 0) + Number(o.total));
    });
  const topRestaurants = [...byRestaurant.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 }));

  return (
    <div className="animate-fade-up">
      <PageHeader title="Visão geral da plataforma" description="Indicadores dos últimos 30 dias." />

      {(pendingRestaurants.count ?? 0) > 0 && (
        <Link
          href="/admin/restaurantes?status=pending"
          className="mb-6 flex items-center justify-between rounded-3xl border border-accent-300 bg-accent-50 p-4 font-semibold hover:bg-accent-100"
        >
          ⏳ {pendingRestaurants.count} restaurante(s) aguardando aprovação
          <span className="text-sm text-brand-600">Revisar →</span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total de usuários" value={String(users.count ?? 0)} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Restaurantes ativos" value={String(restaurants.count ?? 0)} icon={<Store className="h-5 w-5" />} />
        <StatCard label="Pedidos (total)" value={String(totalOrders.count ?? 0)} icon={<Receipt className="h-5 w-5" />} />
        <StatCard label="Pedidos hoje" value={String(s.todayOrders)} icon={<Receipt className="h-5 w-5" />} />
        <StatCard label="Vendas hoje" value={formatCurrency(s.todaySales)} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard label="GMV (30 dias)" value={formatCurrency(s.periodSales)} hint="Valor bruto transacionado" icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard label="Ticket médio" value={formatCurrency(s.avgTicket)} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard label="Novos cadastros" value={String(newUsers.count ?? 0)} hint="Últimos 7 dias" icon={<UserPlus className="h-5 w-5" />} />
      </div>

      <Card className="mt-3 flex flex-wrap items-center justify-between gap-2 bg-ink-900 p-5 text-white">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-300">Receita da plataforma (comissão {feePct}%)</p>
          <p className="text-3xl font-black">{formatCurrency(revenue)}</p>
        </div>
        <Link href="/admin/financeiro" className="text-sm font-semibold text-accent-300 hover:underline">
          Ver financeiro →
        </Link>
      </Card>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <BarChartCard title="GMV por dia" data={s.salesByDay} currency />
        <BarChartCard title="Pedidos por horário" data={s.ordersByHour} />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <BarChartCard title="Restaurantes que mais venderam" data={topRestaurants} currency horizontal height={300} />
        <BarChartCard title="Produtos mais vendidos" data={s.topProducts} horizontal height={300} />
      </div>
    </div>
  );
}
