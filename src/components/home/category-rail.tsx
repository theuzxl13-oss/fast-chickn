import Link from "next/link";
import type { Category } from "@/types";
import { cn } from "@/utils/cn";

export function CategoryRail({ categories, active }: { categories: Category[]; active?: string | null }) {
  return (
    <nav aria-label="Categorias" className="-mx-4 md:mx-0">
      <ul className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1 md:flex-wrap md:px-0">
        {categories.map((c) => {
          const isActive = active === c.slug;
          return (
            <li key={c.id}>
              <Link
                href={isActive ? "/busca" : `/busca?categoria=${c.slug}`}
                className="group flex w-[4.75rem] flex-col items-center gap-1.5"
                aria-current={isActive ? "true" : undefined}
              >
                <span
                  className={cn(
                    "grid h-16 w-16 place-items-center rounded-3xl text-3xl transition duration-200 group-hover:-translate-y-0.5",
                    isActive ? "bg-brand-500 shadow-glow" : "bg-white shadow-soft group-hover:shadow-lift",
                  )}
                  aria-hidden
                >
                  {c.icon}
                </span>
                <span className={cn("text-center text-xs font-semibold", isActive ? "text-brand-600" : "text-ink-700")}>
                  {c.name}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
