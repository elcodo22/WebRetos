import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { PerfilScreen } from "@/components/perfil/perfil-screen";
import { getPerfilMock } from "@/lib/mocks/perfil";
import { getCurrentUser } from "@/lib/home-data";
import { loadRetosArchivo } from "@/lib/retos-archivo-data";

type PageProps = {
  params: Promise<{ username: string }>;
};

export default async function PerfilPage({ params }: PageProps) {
  const { username } = await params;
  const decoded = decodeURIComponent(username);
  const [retos, user] = await Promise.all([
    loadRetosArchivo(),
    getCurrentUser(),
  ]);
  const perfil = getPerfilMock(decoded, retos);

  if (!perfil) notFound();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SiteHeader user={user} showCountdown={false} />
      <div className="min-h-0 flex-1">
        <PerfilScreen perfil={perfil} />
      </div>
    </div>
  );
}
