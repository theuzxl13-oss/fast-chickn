import { createClient } from "@/lib/supabase/server";
import { deleteAdminCouponAction, saveAdminCouponAction } from "@/app/actions/admin";
import { CouponManager, type CouponRow } from "@/components/shared/coupon-manager";
import { PageHeader } from "@/components/ui/misc";

export const metadata = { title: "Cupons" };

export default async function AdminCouponsPage() {
  const supabase = await createClient();
  const [{ data: coupons }, { data: restaurants }] = await Promise.all([
    supabase
      .from("coupons")
      .select("*, participants:coupon_restaurants(restaurant_id), owner:restaurants!coupons_owner_restaurant_id_fkey(name)")
      .order("created_at", { ascending: false }),
    supabase.from("restaurants").select("id, name").eq("status", "active").order("name"),
  ]);

  const rows: CouponRow[] = ((coupons ?? []) as (CouponRow & {
    participants: { restaurant_id: string }[];
    owner: { name: string } | null;
  })[]).map((c) => ({
    ...c,
    restaurant_ids: c.participants.map((p) => p.restaurant_id),
    owner_name: c.owner ? `Cupom da loja ${c.owner.name}` : null,
  }));

  return (
    <div className="animate-fade-up">
      <PageHeader title="Cupons" description="Cupons da plataforma e visão dos cupons criados pelos restaurantes." />
      <CouponManager
        coupons={rows}
        saveAction={saveAdminCouponAction}
        deleteAction={deleteAdminCouponAction}
        restaurants={(restaurants ?? []) as { id: string; name: string }[]}
      />
    </div>
  );
}
