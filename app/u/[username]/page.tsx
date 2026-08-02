import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { PerfilScreen } from "@/components/perfil/perfil-screen";
import { getPerfilMock, slugUsername } from "@/lib/mocks/perfil";
import { getCurrentUser } from "@/lib/home-data";
import { loadRetosArchivo } from "@/lib/retos-archivo-data";

type PageProps = {
  params: Promise<{ username: string }>;
};

function usernameFromUser(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}) {
  const meta = user.user_metadata;
  const raw =
    (typeof meta?.nombre_usuario === "string" && meta.nombre_usuario) ||
    (typeof meta?.username === "string" && meta.username) ||
    "";
  const slug = slugUsername(raw);
  if (slug) return slug;
  if (user.email) return slugUsername(user.email.split("@")[0] ?? "");
  return null;
}

export default async function PerfilPage({ params }: PageProps) {
  const { username } = await params;
  const decoded = decodeURIComponent(username);
  const [retos, user] = await Promise.all([
    loadRetosArchivo(),
    getCurrentUser(),
  ]);

  const ownUsername = user ? usernameFromUser(user) : null;
  const isOwnProfile =
    Boolean(ownUsername) &&
    slugUsername(decoded) === slugUsername(ownUsername!);

  const perfil = getPerfilMock(
    decoded,
    retos,
    isOwnProfile ? { minParticipaciones: 6 } : undefined,
  );

  if (!perfil) notFound();

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-50 bg-transparent">
        <div className="pointer-events-auto bg-transparent">
          <SiteHeader user={user} showCountdown={false} />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col pt-[88px]">
        <PerfilScreen perfil={perfil} isOwnProfile={isOwnProfile} user={user} />
      </div>
    </div>
  );
}
