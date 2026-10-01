"use client";

import { Copy } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export function CopyButton({ value, label = "Copiar" }: { value: string; label?: string }) {
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          toast(`${value} copiado!`);
        } catch {
          toast("Não foi possível copiar.", "error");
        }
      }}
      className="inline-flex items-center gap-1 rounded-xl bg-ink-900 px-3 py-2 text-xs font-bold text-white hover:bg-ink-800"
    >
      <Copy className="h-3.5 w-3.5" aria-hidden /> {label}
    </button>
  );
}
