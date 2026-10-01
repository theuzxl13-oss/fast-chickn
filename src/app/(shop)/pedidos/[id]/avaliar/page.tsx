import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOrder } from "@/services/orders";
import { ReviewForm } from "@/components/orders/review-form";
import { Card } from "@/components/ui/misc";
import { RestaurantLogo } from "@/components/ui/food-image";

export const metadata = { title: "Avaliar pedido" };

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireUser(`/pedidos/${id}/avaliar`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const order = await getOrder(supabase, id);
  if (!order || order.user_id !== user.id) notFound();
  if (order.status !== "delivered" || order.review) redirect(`/pedido/${id}`);

  return (
    <div className="mx-auto max-w-lg animate-fade-up">
      <Card className="p-6">
        <div className="mb-6 flex items-center gap-3">
          <RestaurantLogo src={order.restaurant?.logo_url} name={order.restaurant?.name ?? "?"} color={order.restaurant?.brand_color} className="h-14 w-14" />
          <div>
            <h1 className="text-xl font-extrabold">Como foi seu pedido?</h1>
            <p className="text-sm text-ink-500">
              {order.restaurant?.name} · #{order.code}
            </p>
          </div>
        </div>
        <ReviewForm orderId={order.id} />
      </Card>
    </div>
  );
}
