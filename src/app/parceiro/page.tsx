import Link from "next/link";
import { Ban, CheckCircle2, Clock, DollarSign, Receipt, TrendingUp } from "lucide-react";
import { requirePartnerRestaurant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listRestaurantOrders } from "@/services/orders";
import { computeOrderStats, sinceDays } from "@/services/stats";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { PageHeader, StatCard } from "@/components/ui/misc";
import { StoreStatusToggle } from "@/components/partner/store-status-toggle";
import { isOpenNow } from "@/lib/hours";
import { formatCurrency } from "@/utils/format";

export const metadata = { title: "Dashboard" };

export default async function PartnerDashboard() {
  const restaurant = await requirePartnerRestaurant();
  const supabase = await createClient();
  const orders = await listRestaurantOrders(supabase, restaurant.id, { since: sinceDays(14), limit: 1000 });
  const s = computeOrderStats(orders, 14);

  return (
    <div className="animate-fade-up">
      <PageHeader
        title={`Olá, ${restaurant.name}`}
        description="Resumo da sua operação hoje e nos últimos 14 dias."
        action={<StoreStatusToggle accepting={restaurant.accepting_orders} openBySchedule={isOpenNow({ ...restaurant, accepting_orders: true })} />}
      />

      {restaurant.status === "pending" && (
        <div className="mb-6 rounded-3xl border border-accent-300 bg-accent-50 p-5">
          <p className="font-bold">⏳ Cadastro em análise</p>
          <p className="mt-1 text-sm text-ink-700">
            Enquanto a equipe FAST CHICKN analisa sua loja, aproveite para montar o{" "}
            <Link href="/parceiro/cardapio" className="font-semibold text-brand-600 underline">cardápio</Link> e configurar{" "}
            <Link href="/parceiro/configuracoes" className="font-semibold text-brand-600 underline">horários e taxas</Link>.
          </p>
        </div>
      )}
      {(restaurant.status === "suspended" || restaurant.status === "blocked" || restaurant.status === "rejected") && (
        <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          <p className="font-bold">Sua loja não está visível para clientes.</p>
          <p className="mt-1">Entre em contato com o suporte FAST CHICKN para mais informações.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Pedidos hoje" value={String(s.todayOrders)} icon={<Receipt className="h-5 w-5" />} />
        <StatCard label="Vendas hoje" value={formatCurrency(s.todaySales)} icon={<DollarSign className="h-5 w-5" />} />
        <StatCard label="Ticket médio" value={formatCurrency(s.avgTicket)} hint="Últimos 14 dias" icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard label="Em andamento" value={String(s.inProgress)} icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Concluídos" value={String(s.completed)} hint="Últimos 14 dias" icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="Cancelamentos" value={String(s.cancelled)} hint="Últimos 14 dias" icon={<Ban className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <BarChartCard title="Vendas por dia" description="Faturamento bruto (exclui cancelados)" data={s.salesByDay} currency />
        <BarChartCard title="Pedidos por período" description="Distribuição por hora do dia" data={s.ordersByHour} />
      </div>
      <div className="mt-4">
        <BarChartCard title="Produtos mais vendidos" description="Unidades vendidas" data={s.topProducts} horizontal height={300} />
      </div>
    </div>
  );
}
