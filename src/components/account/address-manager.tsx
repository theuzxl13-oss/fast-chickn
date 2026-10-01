"use client";

import { useFormAction } from "@/hooks/use-form-action";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Crosshair, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteAddressAction, saveAddressAction, setDefaultAddressAction } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select } from "@/components/ui/form";
import { Badge, Card } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { ADDRESS_LABEL, BR_STATES } from "@/lib/constants";
import type { Address, AddressLabel } from "@/types";
import { formatCep } from "@/utils/format";
import { cn } from "@/utils/cn";

const EMPTY = {
  cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "SP", reference: "",
  label: "home" as AddressLabel, label_custom: "", latitude: "", longitude: "",
};

function AddressForm({ address, onDone, next }: { address: Address | null; onDone: () => void; next: string | null }) {
  const { state, onSubmit, pending } = useFormAction(saveAddressAction);
  const [v, setV] = useState(() =>
    address
      ? {
          ...EMPTY,
          ...Object.fromEntries(Object.entries(address).map(([k, val]) => [k, val == null ? "" : String(val)])),
          label: address.label,
        }
      : EMPTY,
  );
  const [cepStatus, setCepStatus] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  useEffect(() => {
    if (state?.ok) {
      toast(state.message ?? "Endereço salvo!");
      if (next) router.push(next);
      else {
        router.refresh();
        onDone();
      }
    }
  }, [state, next, router, onDone, toast]);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setV((prev) => ({ ...prev, [k]: e.target.value }));

  async function lookupCep(raw: string) {
    const cep = raw.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setCepStatus("Buscando CEP…");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepStatus("CEP não encontrado. Preencha manualmente.");
        return;
      }
      setV((prev) => ({
        ...prev,
        street: data.logradouro || prev.street,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
      }));
      setCepStatus(null);
    } catch {
      setCepStatus("Não foi possível consultar o CEP. Preencha manualmente.");
    }
  }

  function captureLocation() {
    if (!navigator.geolocation) return toast("Seu navegador não suporta localização.", "error");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setV((prev) => ({ ...prev, latitude: String(pos.coords.latitude), longitude: String(pos.coords.longitude) }));
        toast("Localização capturada para calcular distâncias.");
      },
      () => toast("Não foi possível obter sua localização.", "error"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {address && <input type="hidden" name="id" value={address.id} />}
      <input type="hidden" name="latitude" value={v.latitude} />
      <input type="hidden" name="longitude" value={v.longitude} />

      <div className="grid grid-cols-[1fr_auto] items-end gap-2">
        <Field label="CEP" htmlFor="cep" error={fe?.cep} hint={cepStatus ?? undefined}>
          <Input
            id="cep"
            name="cep"
            inputMode="numeric"
            maxLength={9}
            value={formatCep(v.cep)}
            onChange={(e) => {
              setV((p) => ({ ...p, cep: e.target.value.replace(/\D/g, "").slice(0, 8) }));
              lookupCep(e.target.value);
            }}
            placeholder="00000-000"
            required
          />
        </Field>
        <Button type="button" variant="outline" onClick={captureLocation} className="h-12" title="Usar minha localização">
          <Crosshair className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">{v.latitude ? "Localização ✓" : "Localização"}</span>
        </Button>
      </div>
      <Field label="Rua" htmlFor="street" error={fe?.street}>
        <Input id="street" name="street" value={v.street} onChange={set("street")} required maxLength={150} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Número" htmlFor="number" error={fe?.number}>
          <Input id="number" name="number" value={v.number} onChange={set("number")} required maxLength={20} />
        </Field>
        <Field label="Complemento" htmlFor="complement" error={fe?.complement}>
          <Input id="complement" name="complement" value={v.complement} onChange={set("complement")} maxLength={100} placeholder="Apto, bloco…" />
        </Field>
      </div>
      <Field label="Bairro" htmlFor="neighborhood" error={fe?.neighborhood}>
        <Input id="neighborhood" name="neighborhood" value={v.neighborhood} onChange={set("neighborhood")} required maxLength={100} />
      </Field>
      <div className="grid grid-cols-[1fr_100px] gap-3">
        <Field label="Cidade" htmlFor="city" error={fe?.city}>
          <Input id="city" name="city" value={v.city} onChange={set("city")} required maxLength={100} />
        </Field>
        <Field label="Estado" htmlFor="state" error={fe?.state}>
          <Select id="state" name="state" value={v.state} onChange={set("state")}>
            {BR_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Ponto de referência" htmlFor="reference" error={fe?.reference}>
        <Input id="reference" name="reference" value={v.reference} onChange={set("reference")} maxLength={150} placeholder="Ex.: Em frente à padaria" />
      </Field>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Salvar como</legend>
        <div className="flex gap-2">
          {(Object.keys(ADDRESS_LABEL) as AddressLabel[]).map((key) => (
            <label
              key={key}
              className={cn(
                "flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-2xl border px-3 py-3 text-sm font-semibold",
                v.label === key ? "border-brand-400 bg-brand-50 text-brand-700" : "border-ink-200",
              )}
            >
              <input type="radio" name="label" value={key} checked={v.label === key} onChange={set("label")} className="sr-only" />
              {ADDRESS_LABEL[key].icon} {ADDRESS_LABEL[key].label}
            </label>
          ))}
        </div>
      </fieldset>
      {v.label === "other" && (
        <Field label="Nome do endereço" htmlFor="label_custom" error={fe?.label_custom}>
          <Input id="label_custom" name="label_custom" value={v.label_custom} onChange={set("label_custom")} maxLength={40} placeholder="Ex.: Casa da mãe" />
        </Field>
      )}

      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="is_default" defaultChecked={address?.is_default ?? true} className="h-4 w-4 accent-brand-500" />
        Usar como endereço padrão
      </label>

      <FormMessage error={state && !state.ok ? state.error : null} />
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1" loading={pending}>
          Salvar endereço
        </Button>
      </div>
    </form>
  );
}

export function AddressManager({ addresses, startOpen, next }: { addresses: Address[]; startOpen: boolean; next: string | null }) {
  const [editing, setEditing] = useState<Address | "new" | null>(startOpen ? "new" : null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const res = await fn();
      toast(res.ok ? res.message ?? "Pronto!" : res.error ?? "Erro", res.ok ? "success" : "error");
      router.refresh();
    });

  if (editing) {
    return (
      <Card className="p-5">
        <h2 className="mb-4 font-bold">{editing === "new" ? "Novo endereço" : "Editar endereço"}</h2>
        <AddressForm address={editing === "new" ? null : editing} onDone={() => setEditing(null)} next={next} />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {addresses.map((a) => (
        <Card key={a.id} className={cn("p-4", a.is_default && "border-brand-300")}>
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden>{ADDRESS_LABEL[a.label].icon}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold">{a.label_custom || ADDRESS_LABEL[a.label].label}</p>
                {a.is_default && <Badge tone="brand">Padrão</Badge>}
              </div>
              <p className="text-sm text-ink-600">
                {a.street}, {a.number}
                {a.complement ? ` - ${a.complement}` : ""}
              </p>
              <p className="text-xs text-ink-500">
                {a.neighborhood}, {a.city}/{a.state} · {formatCep(a.cep)}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 border-t border-ink-100 pt-3">
            {!a.is_default && (
              <Button size="sm" variant="soft" disabled={pending} onClick={() => run(() => setDefaultAddressAction(a.id))}>
                Definir como padrão
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setEditing(a)}>
              <Pencil className="h-4 w-4" aria-hidden /> Editar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:bg-red-50"
              disabled={pending}
              onClick={() => {
                if (confirm("Remover este endereço?")) run(() => deleteAddressAction(a.id));
              }}
            >
              <Trash2 className="h-4 w-4" aria-hidden /> Remover
            </Button>
          </div>
        </Card>
      ))}
      <Button variant="outline" className="w-full" onClick={() => setEditing("new")}>
        <Plus className="h-4 w-4" aria-hidden /> Adicionar endereço
      </Button>
      {next && addresses.length > 0 && (
        <Button className="w-full" onClick={() => router.push(next)}>
          Continuar
        </Button>
      )}
    </div>
  );
}
