import { requireUser } from "@/lib/auth";
import { BackHeader } from "@/components/layout/back-header";
import { ProfileForm } from "@/components/account/profile-form";
import { Card } from "@/components/ui/misc";

export const metadata = { title: "Meu perfil" };

export default async function ProfilePage() {
  const { profile } = await requireUser("/conta/perfil");
  return (
    <div className="mx-auto max-w-lg animate-fade-up">
      <BackHeader href="/conta" title="Meu perfil" />
      <Card className="p-5">
        <ProfileForm fullName={profile.full_name} email={profile.email ?? ""} phone={profile.phone ?? ""} />
      </Card>
    </div>
  );
}
