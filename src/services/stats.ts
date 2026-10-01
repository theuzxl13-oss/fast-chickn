import type { Order } from "@/types";
import { ACTIVE_ORDER_STATUSES, PAYMENT_METHOD_LABEL } from "@/lib/constants";

const TZ = "America/Sao_Paulo";

function dayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
function hourOf(date: Date) {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "2-digit", hour12: false }).format(date)) % 24;
}
function dayLabel(key: string) {
  const [, m, d] = key.split("-");
  return `${d}/${m}`;
}

export interface OrderStats {
  todayOrders: number;
  todaySales: number;
  avgTicket: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  periodSales: number;
  periodOrders: number;
  salesByDay: { label: string; value: number }[];
  ordersByHour: { label: string; value: number }[];
  topProducts: { label: string; value: number }[];
  byPayment: { label: string; value: number }[];
}

const COUNTS_AS_SALE = (o: Pick<Order, "status">) => o.status !== "cancelled" && o.status !== "rejected";

/** Agrega KPIs e séries a partir dos pedidos do período (já filtrados por RLS). */
export function computeOrderStats(orders: Order[], days = 14): OrderStats {
  const today = dayKey(new Date());
  const todays = orders.filter((o) => dayKey(new Date(o.created_at)) === today);
  const valid = orders.filter(COUNTS_AS_SALE);
  const delivered = orders.filter((o) => o.status === "delivered");

  const dayMap = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) dayMap.set(dayKey(new Date(Date.now() - i * 86_400_000)), 0);
  valid.forEach((o) => {
    const k = dayKey(new Date(o.created_at));
    if (dayMap.has(k)) dayMap.set(k, (dayMap.get(k) ?? 0) + Number(o.total));
  });

  const hours = Array.from({ length: 24 }, () => 0);
  valid.forEach((o) => hours[hourOf(new Date(o.created_at))]++);

  const products = new Map<string, number>();
  valid.forEach((o) => (o.items ?? []).forEach((i) => products.set(i.product_name, (products.get(i.product_name) ?? 0) + i.quantity)));

  const payments = new Map<string, number>();
  valid.forEach((o) => payments.set(o.payment_method, (payments.get(o.payment_method) ?? 0) + Number(o.total)));

  const periodSales = valid.reduce((s, o) => s + Number(o.total), 0);
  const todaySalesOrders = todays.filter(COUNTS_AS_SALE);

  return {
    todayOrders: todays.length,
    todaySales: todaySalesOrders.reduce((s, o) => s + Number(o.total), 0),
    avgTicket: valid.length ? periodSales / valid.length : 0,
    inProgress: orders.filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status)).length,
    completed: delivered.length,
    cancelled: orders.filter((o) => !COUNTS_AS_SALE(o)).length,
    periodSales,
    periodOrders: valid.length,
    salesByDay: [...dayMap.entries()].map(([k, v]) => ({ label: dayLabel(k), value: Math.round(v * 100) / 100 })),
    ordersByHour: hours.map((v, h) => ({ label: `${String(h).padStart(2, "0")}h`, value: v })),
    topProducts: [...products.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({ label, value })),
    byPayment: [...payments.entries()].map(([k, v]) => ({
      label: PAYMENT_METHOD_LABEL[k as keyof typeof PAYMENT_METHOD_LABEL] ?? k,
      value: Math.round(v * 100) / 100,
    })),
  };
}

export function sinceDays(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export function toCsv(rows: Record<string, string | number | null>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    // Evita injeção de fórmulas em planilhas
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",;\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return [headers.join(";"), ...rows.map((r) => headers.map((h) => escape(r[h])).join(";"))].join("\n");
}
