import { TicketPercent } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BackHeader } from "@/components/layout/back-header";
import { Card, EmptyState } from "@/components/ui/misc";
import { CopyButton } from "@/components/account/copy-button";
import type { Coupon } from "@/types";
import { formatCurrency, formatDate } from "@/utils/format";

export const metadata = { title: "Cupons" };

export default async function CouponsPage() {
  const { user } = await requireUser("/conta/cupons");
  const supabase = await createClient();
  const [{ data }, { data: uses }] = await Promise.all([
    supabase
      .from("coupons")
      .select("*, owner:restaurants!coupons_owner_restaurant_id_fkey(name)")
      .eq("is_public", true)
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    supabase.from("coupon_uses").select("coupon_id").eq("user_id", user.id),
  ]);

  const usedCount = new Map<string, number>();
  (uses ?? []).forEach((u) => usedCount.set(u.coupon_id, (usedCount.get(u.coupon_id) ?? 0) + 1));
  const now = new Date();
  const coupons = ((data ?? []) as (Coupon & { owner: { name: string } | null })[]).filter(
    (c) => new Date(c.starts_at) <= now && (!c.usage_limit || c.used_count < c.usage_limit),
  );

  return (
    <div className="mx-auto max-w-lg animate-fade-up">
      <BackHeader href="/conta" title="Cupons" description="Use o código no carrinho para ganhar desconto." />
      {coupons.length === 0 ? (
        <EmptyState emoji="🎟️" title="Nenhum cupom disponível agora" description="Fique de olho: novas promoções aparecem sempre!" />
      ) : (
        <div className="space-y-3">
          {coupons.map((c) => {
            const exhausted = (usedCount.get(c.id) ?? 0) >= c.usage_per_user;
            return (
              <Card key={c.id} className={exhausted ? "p-4 opacity-60" : "p-4"}>
                <div className="flex items-start gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                    <TicketPercent className="h-6 w-6" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-black tracking-wide">{c.code}</p>
                    <p className="text-sm font-semibold text-ink-800">
                      {c.discount_type === "percent" ? `${Number(c.discount_value)}% OFF` : `${formatCurrency(c.discount_value)} OFF`}
                      {c.max_discount ? ` (até ${formatCurrency(c.max_discount)})` : ""}
                    </p>
                    {c.description && <p className="text-sm text-ink-500">{c.description}</p>}
                    <p className="mt-1 text-xs text-ink-400">
                      {Number(c.min_order_value) > 0 && `Pedido mínimo ${formatCurrency(c.min_order_value)} · `}
                      {c.owner ? `Válido em ${c.owner.name}` : "Válido em restaurantes participantes"}
                      {c.ends_at && ` · até ${formatDate(c.ends_at)}`}
                    </p>
                    {exhausted && <p className="mt-1 text-xs font-semibold text-ink-600">Você já usou este cupom.</p>}
                  </div>
                  {!exhausted && <CopyButton value={c.code} />}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
