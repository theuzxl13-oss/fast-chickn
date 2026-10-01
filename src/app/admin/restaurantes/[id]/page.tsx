import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RESTAURANT_SELECT } from "@/services/catalog";
import { listRestaurantOrders } from "@/services/orders";
import { computeOrderStats, sinceDays } from "@/services/stats";
import { BackHeader } from "@/components/layout/back-header";
import { RestaurantActions } from "@/components/admin/restaurant-actions";
import { AdminRestaurantForm } from "@/components/admin/restaurant-form";
import { BarChartCard } from "@/components/charts/bar-chart-card";
import { Badge, Card, StatCard } from "@/components/ui/misc";
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE, RESTAURANT_STATUS_LABEL } from "@/lib/constants";
import type { Restaurant } from "@/types";
import { formatCurrency, formatDateTime, formatPhone } from "@/utils/format";

export const metadata = { title: "Restaurante" };

export default async function AdminRestaurantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from("restaurants").select(RESTAURANT_SELECT).eq("id", id).maybeSingle<Restaurant>();
  if (!data) notFound();
  const r = data;
  const orders = await listRestaurantOrders(supabase, r.id, { since: sinceDays(30), limit: 2000 });
  const s = computeOrderStats(orders, 30);

  return (
    <div className="animate-fade-up">
      <BackHeader href="/admin/restaurantes" title={r.name} description={`${RESTAURANT_STATUS_LABEL[r.status]} · /restaurante/${r.slug}`} />
      <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
        <div className="space-y-0.5 text-ink-600">
          <p>Documento: <strong>{r.document ?? "—"}</strong> · Telefone: <strong>{formatPhone(r.phone) || "—"}</strong></p>
          <p>Endereço: {r.street ? `${r.street}, ${r.number} - ${r.neighborhood}, ${r.city}/${r.state}` : "—"}</p>
        </div>
        <RestaurantActions id={r.id} status={r.status} featured={r.is_featured} />
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Vendas (30 dias)" value={formatCurrency(s.periodSales)} />
        <StatCard label="Pedidos (30 dias)" value={String(s.periodOrders)} />
        <StatCard label="Ticket médio" value={formatCurrency(s.avgTicket)} />
        <StatCard label="Cancelamentos" value={String(s.cancelled)} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-bold">Editar informações</h2>
          <AdminRestaurantForm restaurant={r} />
        </Card>
        <BarChartCard title="Vendas por dia" data={s.salesByDay} currency />
      </div>

      <Card className="mt-4 overflow-hidden">
        <h2 className="p-4 font-bold">Pedidos recentes</h2>
        <div className="max-h-96 overflow-auto">
          <table className="w-full min-w-[560px] text-sm">
            <tbody className="divide-y divide-ink-100">
              {orders.slice(0, 50).map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-2 font-semibold">#{o.code}</td>
                  <td className="px-4 py-2">{formatDateTime(o.created_at)}</td>
                  <td className="px-4 py-2">{o.customer_name}</td>
                  <td className="px-4 py-2"><Badge tone={ORDER_STATUS_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge></td>
                  <td className="px-4 py-2 text-right font-semibold">{formatCurrency(o.total)}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td className="px-4 py-6 text-center text-ink-500">Nenhum pedido nos últimos 30 dias.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
