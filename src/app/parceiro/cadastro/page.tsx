import { redirect } from "next/navigation";
import { requireRole, getPartnerRestaurant } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listCategories } from "@/services/catalog";
import { RestaurantSignupForm } from "@/components/partner/restaurant-signup-form";
import { Logo } from "@/components/brand/logo";
import { Card } from "@/components/ui/misc";

export const metadata = { title: "Cadastre seu restaurante" };

export default async function PartnerSignupPage() {
  await requireRole(["restaurant"], "/parceiro/cadastro");
  if (await getPartnerRestaurant()) redirect("/parceiro");
  const supabase = await createClient();
  const categories = await listCategories(supabase);

  return (
    <div className="mx-auto max-w-2xl animate-fade-up">
      <Logo />
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Cadastre seu restaurante</h1>
      <p className="mt-1 text-ink-500">
        Preencha os dados da sua loja. Depois da aprovação da equipe FAST CHICKN, ela aparece para os clientes.
      </p>
      <Card className="mt-6 p-6">
        <RestaurantSignupForm categories={categories} />
      </Card>
    </div>
  );
}
