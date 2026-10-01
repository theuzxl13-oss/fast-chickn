import { requirePartnerRestaurant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deletePartnerCouponAction, savePartnerCouponAction } from "@/app/actions/partner";
import { CouponManager, type CouponRow } from "@/components/shared/coupon-manager";
import { PageHeader } from "@/components/ui/misc";

export const metadata = { title: "Cupons" };

export default async function PartnerCouponsPage() {
  const restaurant = await requirePartnerRestaurant();
  const supabase = await createClient();
  const { data } = await supabase
    .from("coupons")
    .select("*")
    .eq("owner_restaurant_id", restaurant.id)
    .order("created_at", { ascending: false });

  return (
    <div className="animate-fade-up">
      <PageHeader title="Cupons da loja" description="Cupons válidos apenas no seu restaurante. O desconto é custeado pela loja." />
      <CouponManager coupons={(data ?? []) as CouponRow[]} saveAction={savePartnerCouponAction} deleteAction={deletePartnerCouponAction} />
    </div>
  );
}
