import { createClient } from "@/lib/supabase/server";
import { CategoryManager } from "@/components/admin/category-manager";
import { PageHeader } from "@/components/ui/misc";
import type { Category } from "@/types";

export const metadata = { title: "Categorias" };

export default async function AdminCategoriesPage() {
  const supabase = await createClient();
  const [{ data: categories }, { data: restaurants }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("restaurants").select("category_id"),
  ]);
  const counts: Record<string, number> = {};
  (restaurants ?? []).forEach((r) => {
    if (r.category_id) counts[r.category_id] = (counts[r.category_id] ?? 0) + 1;
  });
  return (
    <div className="animate-fade-up">
      <PageHeader title="Categorias" description="Tipos de cozinha exibidos na home e usados nos filtros." />
      <CategoryManager categories={(categories ?? []) as Category[]} counts={counts} />
    </div>
  );
}
