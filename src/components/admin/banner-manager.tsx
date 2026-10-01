"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { deleteBannerAction, saveBannerAction } from "@/app/actions/admin";
import { useFormAction } from "@/hooks/use-form-action";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { Badge, Card } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import type { Banner } from "@/types";

function BannerForm({ banner, onDone }: { banner: Banner | null; onDone: () => void }) {
  const { state, onSubmit, pending, fieldErrors: fe, error } = useFormAction(saveBannerAction);
  const [preview, setPreview] = useState({
    title: banner?.title ?? "Frete grátis hoje",
    subtitle: banner?.subtitle ?? "",
    bg_color: banner?.bg_color ?? "#FF5A1F",
    emoji: banner?.emoji ?? "🛵",
  });
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      toast(state.message ?? "Salvo!");
      router.refresh();
      onDone();
    }
  }, [state, toast, router, onDone]);

  const bind = (k: keyof typeof preview) => ({
    value: preview[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setPreview((p) => ({ ...p, [k]: e.target.value })),
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {banner && <input type="hidden" name="id" value={banner.id} />}
      <div className="speed-lines flex h-32 items-center justify-between rounded-3xl px-6 text-white" style={{ backgroundColor: preview.bg_color }}>
        <div>
          <p className="text-2xl font-black italic">{preview.title || "Título"}</p>
          <p className="text-sm text-white/90">{preview.subtitle}</p>
        </div>
        <span className="text-5xl" aria-hidden>{preview.emoji}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Título" htmlFor="b-title" error={fe?.title}>
          <Input id="b-title" name="title" required maxLength={60} {...bind("title")} />
        </Field>
        <Field label="Subtítulo" htmlFor="b-sub" error={fe?.subtitle}>
          <Input id="b-sub" name="subtitle" maxLength={120} {...bind("subtitle")} />
        </Field>
        <Field label="Link interno" htmlFor="b-link" error={fe?.link_url} hint="Ex.: /busca?gratis=1">
          <Input id="b-link" name="link_url" defaultValue={banner?.link_url ?? ""} placeholder="/busca?promo=1" />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Cor" htmlFor="b-color" error={fe?.bg_color}>
            <Input id="b-color" name="bg_color" type="color" className="h-12 p-1" {...bind("bg_color")} />
          </Field>
          <Field label="Emoji" htmlFor="b-emoji" error={fe?.emoji}>
            <Input id="b-emoji" name="emoji" maxLength={16} className="text-center text-lg" {...bind("emoji")} />
          </Field>
          <Field label="Ordem" htmlFor="b-sort" error={fe?.sort_order}>
            <Input id="b-sort" name="sort_order" type="number" min={0} max={999} defaultValue={banner?.sort_order ?? 0} />
          </Field>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="is_active" defaultChecked={banner?.is_active ?? true} className="h-4 w-4 accent-brand-500" /> Ativo
      </label>
      <FormMessage error={error} />
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onDone}>Cancelar</Button>
        <Button type="submit" loading={pending}>Salvar banner</Button>
      </div>
    </form>
  );
}

export function BannerManager({ banners }: { banners: Banner[] }) {
  const [editing, setEditing] = useState<Banner | "new" | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  return (
    <div className="space-y-4">
      {editing ? (
        <Card className="p-5">
          <BannerForm banner={editing === "new" ? null : editing} onDone={() => setEditing(null)} />
        </Card>
      ) : (
        <Button onClick={() => setEditing("new")}><Plus className="h-4 w-4" aria-hidden /> Novo banner</Button>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {banners.map((b) => (
          <Card key={b.id} className="overflow-hidden">
            <div className="speed-lines flex h-24 items-center justify-between px-5 text-white" style={{ backgroundColor: b.bg_color }}>
              <div>
                <p className="text-lg font-black italic">{b.title}</p>
                {b.subtitle && <p className="text-xs text-white/90">{b.subtitle}</p>}
              </div>
              <span className="text-4xl" aria-hidden>{b.emoji}</span>
            </div>
            <div className="flex items-center gap-2 p-3 text-sm">
              {b.is_active ? <Badge tone="success">Ativo</Badge> : <Badge>Inativo</Badge>}
              <span className="flex-1 truncate text-xs text-ink-500">{b.link_url ?? "Sem link"} · ordem {b.sort_order}</span>
              <Button size="icon" variant="ghost" onClick={() => setEditing(b)} aria-label="Editar banner"><Pencil className="h-4 w-4" /></Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-red-600 hover:bg-red-50"
                disabled={pending}
                aria-label="Excluir banner"
                onClick={() =>
                  confirm("Excluir este banner?") &&
                  start(async () => {
                    const res = await deleteBannerAction(b.id);
                    toast(res.ok ? res.message! : res.error, res.ok ? "success" : "error");
                    router.refresh();
                  })
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
