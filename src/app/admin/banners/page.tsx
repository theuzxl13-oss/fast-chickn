import { createClient } from "@/lib/supabase/server";
import { BannerManager } from "@/components/admin/banner-manager";
import { PageHeader } from "@/components/ui/misc";
import type { Banner } from "@/types";

export const metadata = { title: "Banners" };

export default async function AdminBannersPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("banners").select("*").order("sort_order");
  return (
    <div className="animate-fade-up">
      <PageHeader title="Banners" description="Carrossel promocional da página inicial." />
      <BannerManager banners={(data ?? []) as Banner[]} />
    </div>
  );
}
