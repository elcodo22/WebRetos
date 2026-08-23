import { SitePageShell } from "@/components/layout/site-page-shell";
import { PerfilScreen } from "@/components/perfil/perfil-screen";
import { getPerfilMock, slugUsername } from "@/lib/mocks/perfil";
import { getCurrentUser } from "@/lib/home-data";
import { loadRetosArchivo } from "@/lib/retos-archivo-data";
import { notFound } from "next/navigation";

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
    <SitePageShell user={user} desktopOverlay menuTone="black" className="overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col pb-[var(--safe-bottom)] md:pt-[var(--header-offset)]">
        <PerfilScreen perfil={perfil} isOwnProfile={isOwnProfile} user={user} />
      </div>
    </SitePageShell>
  );
}
