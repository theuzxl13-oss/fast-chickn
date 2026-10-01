"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { TicketPercent, X } from "lucide-react";
import { validateCouponAction } from "@/app/actions/orders";
import { useCart } from "@/components/cart/cart-provider";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/format";

export function CouponBox() {
  const { restaurant, subtotal, coupon, setCoupon } = useCart();
  const { user } = useSession();
  const toast = useToast();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const lastSubtotal = useRef(subtotal);

  // Revalida o cupom quando o subtotal muda (ex.: mínimo do pedido)
  useEffect(() => {
    if (!coupon || !restaurant || lastSubtotal.current === subtotal) return;
    lastSubtotal.current = subtotal;
    validateCouponAction(coupon.code, restaurant.id, subtotal).then((res) => {
      if (res.ok && res.data) setCoupon(res.data);
      else {
        setCoupon(null);
        toast(res.ok ? "Cupom removido" : res.error, "error");
      }
    });
  }, [subtotal, coupon, restaurant, setCoupon, toast]);

  if (!restaurant) return null;

  if (coupon) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <TicketPercent className="h-5 w-5 text-emerald-600" aria-hidden />
        <div className="flex-1 text-sm">
          <p className="font-bold text-emerald-800">{coupon.code}</p>
          <p className="text-emerald-700">Desconto de {formatCurrency(coupon.discount)}</p>
        </div>
        <button
          type="button"
          onClick={() => setCoupon(null)}
          className="grid h-8 w-8 place-items-center rounded-full hover:bg-emerald-100"
          aria-label="Remover cupom"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!user) {
          setError("Entre na sua conta para usar cupons.");
          return;
        }
        start(async () => {
          const res = await validateCouponAction(code, restaurant.id, subtotal);
          if (res.ok && res.data) {
            lastSubtotal.current = subtotal;
            setCoupon(res.data);
            setError(null);
            setCode("");
            toast(res.message ?? "Cupom aplicado!");
          } else if (!res.ok) {
            setError(res.error);
          }
        });
      }}
    >
      <label htmlFor="coupon" className="text-sm font-bold">
        Adicionar cupom
      </label>
      <div className="flex gap-2">
        <input
          id="coupon"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
          maxLength={30}
          placeholder="Ex.: FAST10"
          className="h-11 flex-1 rounded-2xl border border-ink-200 px-4 text-sm font-semibold uppercase tracking-wide outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
          aria-invalid={!!error}
        />
        <Button type="submit" variant="dark" loading={pending} disabled={code.length < 3}>
          Aplicar
        </Button>
      </div>
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </form>
  );
}
