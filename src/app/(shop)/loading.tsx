import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-8 w-64" />
      <div className="flex gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-16 rounded-3xl" />
        ))}
      </div>
      <Skeleton className="h-44 rounded-4xl" />
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
