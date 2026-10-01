import { requirePartnerRestaurant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listCategories } from "@/services/catalog";
import { StoreSettingsForm } from "@/components/partner/store-settings-form";
import { OpeningHoursForm } from "@/components/partner/opening-hours-form";
import { Card, PageHeader } from "@/components/ui/misc";

export const metadata = { title: "Configurações" };

export default async function PartnerSettingsPage() {
  const restaurant = await requirePartnerRestaurant();
  const supabase = await createClient();
  const categories = await listCategories(supabase);

  return (
    <div className="animate-fade-up">
      <PageHeader title="Configurações da loja" description="Informações exibidas aos clientes, taxas e horário de funcionamento." />
      <div className="grid gap-6 2xl:grid-cols-[1fr_420px]">
        <Card className="p-5">
          <StoreSettingsForm restaurant={restaurant} categories={categories} />
        </Card>
        <Card className="p-5">
          <h2 className="mb-1 font-bold">Horário de funcionamento</h2>
          <p className="mb-4 text-sm text-ink-500">
            Fora do horário a loja aparece como “Restaurante fechado”: o cardápio fica visível, mas novos pedidos são bloqueados.
          </p>
          <OpeningHoursForm hours={restaurant.opening_hours} />
        </Card>
      </div>
    </div>
  );
}
