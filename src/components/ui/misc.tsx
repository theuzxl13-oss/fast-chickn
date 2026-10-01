import { Star } from "lucide-react";
import { cn } from "@/utils/cn";

const tones = {
  neutral: "bg-ink-100 text-ink-700",
  info: "bg-sky-100 text-sky-800",
  warning: "bg-accent-100 text-accent-600",
  success: "bg-emerald-100 text-emerald-800",
  danger: "bg-red-100 text-red-700",
  brand: "bg-brand-100 text-brand-700",
  dark: "bg-ink-900 text-white",
} as const;

export type Tone = keyof typeof tones;

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-3xl border border-ink-100 bg-white shadow-soft", className)}>{children}</div>;
}

export function EmptyState({
  emoji = "🍗",
  title,
  description,
  action,
}: {
  emoji?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center animate-fade-up">
      <div className="mb-4 grid h-20 w-20 place-items-center rounded-full bg-brand-50 text-4xl" aria-hidden>
        {emoji}
      </div>
      <h2 className="text-lg font-bold text-ink-900">{title}</h2>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function RatingStars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Nota ${value} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          width={size}
          height={size}
          className={i <= Math.round(value) ? "fill-accent-400 text-accent-400" : "text-ink-200"}
          aria-hidden
        />
      ))}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-ink-100", className)} />;
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon?: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
        {icon && <span className="text-brand-500">{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-extrabold text-ink-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </Card>
  );
}
