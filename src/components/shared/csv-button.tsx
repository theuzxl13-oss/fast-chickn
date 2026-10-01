"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toCsv } from "@/services/stats";

/** Exporta linhas para CSV (separador ";" para abrir corretamente no Excel pt-BR). */
export function CsvButton({ rows, filename }: { rows: Record<string, string | number | null>[]; filename: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={!rows.length}
      onClick={() => {
        const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }}
    >
      <Download className="h-4 w-4" aria-hidden /> Exportar CSV
    </Button>
  );
}
