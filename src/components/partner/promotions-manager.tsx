"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPromoLabelAction, setPromoPriceAction } from "@/app/actions/partner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Badge, Card } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import type { Product } from "@/types";
import { formatCurrency } from "@/utils/format";

function PromoRow({ product }: { product: Product }) {
  const [value, setValue] = useState(product.promo_price ? String(product.promo_price).replace(".", ",") : "");
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const save = (price: number | null) =>
    start(async () => {
      const res = await setPromoPriceAction(product.id, price);
      toast(res.ok ? res.message! : res.error, res.ok ? "success" : "error");
      router.refresh();
    });

  const parsed = Number(value.replace(",", "."));
  const pct = parsed > 0 && parsed < product.price ? Math.round((1 - parsed / product.price) * 100) : null;

  return (
    <div className="flex flex-wrap items-center gap-3 p-4">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{product.name}</p>
        <p className="text-xs text-ink-500">Preço original: {formatCurrency(product.price)}</p>
      </div>
      {pct != null && <Badge tone="success">-{pct}%</Badge>}
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/[^0-9,\.]/g, ""))}
        inputMode="decimal"
        placeholder="Preço promo"
        className="h-10 w-32"
        aria-label={`Preço promocional de ${product.name}`}
      />
      <Button size="sm" loading={pending} disabled={!(parsed > 0)} onClick={() => save(parsed)}>
        Aplicar
      </Button>
      {product.promo_price && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => { setValue(""); save(null); }}>
          Remover
        </Button>
      )}
    </div>
  );
}

export function PromotionsManager({ label, products }: { label: string | null; products: Product[] }) {
  const [promoLabel, setPromoLabel] = useState(label ?? "");
  const [pending, start] = useTransition();
  const toast = useToast();
  const active = products.filter((p) => p.promo_price);

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="font-bold">Selo de promoção da loja</h2>
        <p className="text-sm text-ink-500">Aparece no card do restaurante e na seção “Promoções” da home.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Input
            value={promoLabel}
            onChange={(e) => setPromoLabel(e.target.value)}
            maxLength={40}
            placeholder="Ex.: 20% OFF em lanches"
            className="max-w-sm flex-1"
            aria-label="Selo de promoção"
          />
          <Button
            loading={pending}
            onClick={() =>
              start(async () => {
                const res = await setPromoLabelAction(promoLabel.trim() || null);
                toast(res.ok ? res.message! : res.error, res.ok ? "success" : "error");
              })
            }
          >
            Salvar selo
          </Button>
        </div>
      </Card>

      <div>
        <h2 className="mb-2 font-bold">
          Preços promocionais <span className="text-sm font-medium text-ink-500">({active.length} ativos)</span>
        </h2>
        <Card className="divide-y divide-ink-100">
          {products.map((p) => (
            <PromoRow key={p.id} product={p} />
          ))}
          {products.length === 0 && <p className="p-4 text-sm text-ink-500">Cadastre produtos no cardápio primeiro.</p>}
        </Card>
      </div>
    </div>
  );
}
