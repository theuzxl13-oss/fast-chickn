import { requirePartnerRestaurant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listRestaurantOrders } from "@/services/orders";
import { sinceDays } from "@/services/stats";
import { OrdersBoard } from "@/components/partner/orders-board";
import { PageHeader } from "@/components/ui/misc";

export const metadata = { title: "Pedidos" };

export default async function PartnerOrdersPage() {
  const restaurant = await requirePartnerRestaurant();
  const supabase = await createClient();
  const orders = await listRestaurantOrders(supabase, restaurant.id, { since: sinceDays(2), limit: 200 });

  return (
    <div className="animate-fade-up">
      <PageHeader title="Pedidos" description="Novos pedidos chegam automaticamente nesta tela." />
      <OrdersBoard restaurantId={restaurant.id} orders={orders} />
    </div>
  );
}
