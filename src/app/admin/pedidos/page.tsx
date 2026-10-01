import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listPlatformOrders } from "@/services/admin";
import { AdminCancelOrder } from "@/components/admin/admin-cancel-order";
import { Badge, Card, PageHeader } from "@/components/ui/misc";
import { ACTIVE_ORDER_STATUSES, ORDER_STATUS_LABEL, ORDER_STATUS_TONE, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/constants";
import type { OrderStatus } from "@/types";
import { formatCurrency, formatDateTime } from "@/utils/format";
import { cn } from "@/utils/cn";

export const metadata = { title: "Pedidos" };

const FILTERS: (OrderStatus | "all")[] = ["all", "pending", "confirmed", "preparing", "ready", "out_for_delivery", "delivered", "cancelled", "rejected"];

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status = FILTERS.includes(sp.status as OrderStatus) ? (sp.status as OrderStatus | "all") : "all";
  const supabase = await createClient();
  const orders = await listPlatformOrders(supabase, { days: 90, status: status === "all" ? null : status, limit: 300 });

  return (
    <div className="animate-fade-up">
      <PageHeader title="Pedidos" description="Todos os pedidos da plataforma (últimos 90 dias)." />
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "all" ? "/admin/pedidos" : `/admin/pedidos?status=${f}`}
            className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-semibold", status === f ? "bg-ink-900 text-white" : "bg-white text-ink-600 shadow-soft")}
          >
            {f === "all" ? "Todos" : ORDER_STATUS_LABEL[f]}
          </Link>
        ))}
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3">Pedido</th>
              <th className="px-4 py-3">Restaurante</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Pagamento</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-3">
                  <p className="font-bold">#{o.code}</p>
                  <p className="text-xs text-ink-500">{formatDateTime(o.created_at)}</p>
                </td>
                <td className="px-4 py-3">{o.restaurant?.name}</td>
                <td className="px-4 py-3">{o.customer_name}</td>
                <td className="px-4 py-3">
                  {PAYMENT_METHOD_LABEL[o.payment_method]}
                  {o.payment && <span className="block text-xs text-ink-500">{PAYMENT_STATUS_LABEL[o.payment.status]}</span>}
                </td>
                <td className="px-4 py-3"><Badge tone={ORDER_STATUS_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge></td>
                <td className="px-4 py-3 text-right font-semibold">{formatCurrency(o.total)}</td>
                <td className="px-4 py-3 text-right">
                  {ACTIVE_ORDER_STATUSES.includes(o.status) && o.status !== "out_for_delivery" && <AdminCancelOrder orderId={o.id} code={o.code} />}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-ink-500">Nenhum pedido.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
