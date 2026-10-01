"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/utils/cn";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Upload direto para o Supabase Storage (bucket "images"). O RLS do Storage só
 * permite gravar em restaurants/<id do restaurante do usuário>/...
 */
export function ImageUpload({
  name,
  restaurantId,
  folder,
  defaultUrl,
  label,
  aspect = "aspect-square",
}: {
  name: string;
  restaurantId: string;
  folder: string;
  defaultUrl?: string | null;
  label: string;
  aspect?: string;
}) {
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setError(null);
    if (!TYPES.includes(file.type)) return setError("Use JPG, PNG ou WEBP.");
    if (file.size > MAX_BYTES) return setError("A imagem deve ter até 5 MB.");
    setBusy(true);
    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const path = `restaurants/${restaurantId}/${folder}/${crypto.randomUUID()}.${ext}`;
    const supabase = createClient();
    const { error: upErr } = await supabase.storage.from("images").upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type,
    });
    setBusy(false);
    if (upErr) return setError("Falha no envio da imagem.");
    setUrl(supabase.storage.from("images").getPublicUrl(path).data.publicUrl);
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-ink-800">{label}</p>
      <input type="hidden" name={name} value={url} />
      <div className={cn("relative overflow-hidden rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50", aspect)}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-1 text-sm text-ink-500 hover:text-brand-600"
          >
            {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
            {busy ? "Enviando…" : "Adicionar foto"}
          </button>
        )}
        {url && (
          <div className="absolute bottom-2 right-2 flex gap-1">
            <button type="button" onClick={() => input.current?.click()} className="rounded-xl bg-white/95 px-2 py-1 text-xs font-semibold shadow">
              Trocar
            </button>
            <button type="button" onClick={() => setUrl("")} className="grid h-7 w-7 place-items-center rounded-xl bg-white/95 text-red-600 shadow" aria-label="Remover foto">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
