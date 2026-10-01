"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useFormAction } from "@/hooks/use-form-action";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select } from "@/components/ui/form";
import { Badge, Card, EmptyState } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import type { ActionResult, Coupon } from "@/types";
import { formatCurrency, formatDate } from "@/utils/format";

type SaveFn = (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;
type DeleteFn = (id: string) => Promise<ActionResult>;

export interface CouponRow extends Coupon {
  restaurant_ids?: string[];
  owner_name?: string | null;
}

function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function CouponForm({
  coupon,
  saveAction,
  restaurants,
  onDone,
}: {
  coupon: CouponRow | null;
  saveAction: SaveFn;
  restaurants?: { id: string; name: string }[];
  onDone: () => void;
}) {
  const { state, onSubmit, pending, fieldErrors: fe, error } = useFormAction(saveAction);
  const [type, setType] = useState(coupon?.discount_type ?? "percent");
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      toast(state.message ?? "Salvo!");
      router.refresh();
      onDone();
    }
  }, [state, toast, router, onDone]);

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-3">
      {coupon && <input type="hidden" name="id" value={coupon.id} />}
      <input type="hidden" name="tz_offset" value={new Date().getTimezoneOffset()} suppressHydrationWarning />
      <Field label="Código" htmlFor="code" error={fe?.code}>
        <Input id="code" name="code" defaultValue={coupon?.code} required maxLength={30} className="uppercase" placeholder="FAST10" />
      </Field>
      <Field label="Tipo de desconto" htmlFor="discount_type" error={fe?.discount_type}>
        <Select id="discount_type" name="discount_type" value={type} onChange={(e) => setType(e.target.value as "percent" | "fixed")}>
          <option value="percent">Porcentagem (%)</option>
          <option value="fixed">Valor fixo (R$)</option>
        </Select>
      </Field>
      <Field label={type === "percent" ? "Porcentagem" : "Valor (R$)"} htmlFor="discount_value" error={fe?.discount_value}>
        <Input id="discount_value" name="discount_value" inputMode="decimal" defaultValue={coupon?.discount_value ?? ""} required />
      </Field>
      <Field label="Valor mínimo do pedido" htmlFor="min_order_value" error={fe?.min_order_value}>
        <Input id="min_order_value" name="min_order_value" inputMode="decimal" defaultValue={coupon?.min_order_value ?? 0} />
      </Field>
      <Field label="Desconto máximo (R$)" htmlFor="max_discount" error={fe?.max_discount} hint="Opcional">
        <Input id="max_discount" name="max_discount" inputMode="decimal" defaultValue={coupon?.max_discount ?? ""} />
      </Field>
      <Field label="Descrição" htmlFor="description" error={fe?.description}>
        <Input id="description" name="description" defaultValue={coupon?.description ?? ""} maxLength={200} placeholder="10% OFF no primeiro pedido" />
      </Field>
      <Field label="Data inicial" htmlFor="starts_at" error={fe?.starts_at}>
        <Input id="starts_at" name="starts_at" type="datetime-local" required defaultValue={toLocalInput(coupon?.starts_at ?? new Date().toISOString())} />
      </Field>
      <Field label="Data final" htmlFor="ends_at" error={fe?.ends_at} hint="Vazio = sem prazo">
        <Input id="ends_at" name="ends_at" type="datetime-local" defaultValue={toLocalInput(coupon?.ends_at)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Qtd. disponível" htmlFor="usage_limit" error={fe?.usage_limit} hint="Vazio = ilimitado">
          <Input id="usage_limit" name="usage_limit" type="number" min={1} defaultValue={coupon?.usage_limit ?? ""} />
        </Field>
        <Field label="Por usuário" htmlFor="usage_per_user" error={fe?.usage_per_user}>
          <Input id="usage_per_user" name="usage_per_user" type="number" min={1} max={100} defaultValue={coupon?.usage_per_user ?? 1} />
        </Field>
      </div>

      {restaurants && (
        <fieldset className="md:col-span-3">
          <legend className="mb-2 text-sm font-semibold">Restaurantes participantes (nenhum marcado = todos)</legend>
          <div className="grid max-h-44 gap-1 overflow-y-auto rounded-2xl border border-ink-100 p-3 sm:grid-cols-2 lg:grid-cols-3">
            {restaurants.map((r) => (
              <label key={r.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="restaurant_ids" value={r.id} defaultChecked={coupon?.restaurant_ids?.includes(r.id)} className="accent-brand-500" />
                {r.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex flex-wrap gap-4 md:col-span-3">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="is_active" defaultChecked={coupon?.is_active ?? true} className="h-4 w-4 accent-brand-500" />
          Ativo
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="is_public" defaultChecked={coupon?.is_public ?? true} className="h-4 w-4 accent-brand-500" />
          Exibir na lista de cupons do cliente
        </label>
      </div>
      <div className="md:col-span-3">
        <FormMessage error={error} />
        <div className="mt-2 flex gap-2">
          <Button variant="ghost" onClick={onDone}>Cancelar</Button>
          <Button type="submit" loading={pending}>{coupon ? "Salvar cupom" : "Criar cupom"}</Button>
        </div>
      </div>
    </form>
  );
}

export function CouponManager({
  coupons,
  saveAction,
  deleteAction,
  restaurants,
}: {
  coupons: CouponRow[];
  saveAction: SaveFn;
  deleteAction: DeleteFn;
  restaurants?: { id: string; name: string }[];
}) {
  const [editing, setEditing] = useState<CouponRow | "new" | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const now = new Date();

  return (
    <div className="space-y-4">
      {editing ? (
        <Card className="p-5">
          <h2 className="mb-4 font-bold">{editing === "new" ? "Novo cupom" : `Editar ${editing.code}`}</h2>
          <CouponForm coupon={editing === "new" ? null : editing} saveAction={saveAction} restaurants={restaurants} onDone={() => setEditing(null)} />
        </Card>
      ) : (
        <Button onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" aria-hidden /> Novo cupom
        </Button>
      )}

      {coupons.length === 0 ? (
        <EmptyState emoji="🎟️" title="Nenhum cupom criado" description="Cupons ajudam a atrair e fidelizar clientes." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Desconto</th>
                <th className="px-4 py-3">Mínimo</th>
                <th className="px-4 py-3">Uso</th>
                <th className="px-4 py-3">Validade</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {coupons.map((c) => {
                const expired = c.ends_at && new Date(c.ends_at) < now;
                return (
                  <tr key={c.id}>
                    <td className="px-4 py-3">
                      <p className="font-black tracking-wide">{c.code}</p>
                      {c.owner_name && <p className="text-xs text-ink-500">{c.owner_name}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {c.discount_type === "percent" ? `${Number(c.discount_value)}%` : formatCurrency(c.discount_value)}
                      {c.max_discount ? <span className="block text-xs text-ink-500">até {formatCurrency(c.max_discount)}</span> : null}
                    </td>
                    <td className="px-4 py-3">{formatCurrency(c.min_order_value)}</td>
                    <td className="px-4 py-3">
                      {c.used_count}
                      {c.usage_limit ? ` / ${c.usage_limit}` : ""}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {formatDate(c.starts_at)}
                      {c.ends_at ? ` – ${formatDate(c.ends_at)}` : " · sem prazo"}
                    </td>
                    <td className="px-4 py-3">
                      {!c.is_active ? <Badge>Inativo</Badge> : expired ? <Badge tone="danger">Expirado</Badge> : <Badge tone="success">Ativo</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditing(c)} aria-label={`Editar ${c.code}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50"
                          disabled={pending}
                          aria-label={`Excluir ${c.code}`}
                          onClick={() =>
                            confirm(`Excluir o cupom ${c.code}?`) &&
                            start(async () => {
                              const res = await deleteAction(c.id);
                              toast(res.ok ? res.message! : res.error, res.ok ? "success" : "error");
                              router.refresh();
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
