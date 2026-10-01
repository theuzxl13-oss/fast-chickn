import Link from "next/link";
import { cn } from "@/utils/cn";

export const PERIODS = [7, 30, 90] as const;

export function parsePeriod(value: string | undefined) {
  const n = Number(value);
  return (PERIODS as readonly number[]).includes(n) ? n : 30;
}

export function PeriodTabs({ basePath, current }: { basePath: string; current: number }) {
  return (
    <div className="inline-flex rounded-2xl bg-white p-1 shadow-soft" role="tablist" aria-label="Período">
      {PERIODS.map((p) => (
        <Link
          key={p}
          href={`${basePath}?dias=${p}`}
          role="tab"
          aria-selected={current === p}
          className={cn(
            "rounded-xl px-4 py-2 text-sm font-semibold transition",
            current === p ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-50",
          )}
        >
          {p} dias
        </Link>
      ))}
    </div>
  );
}
