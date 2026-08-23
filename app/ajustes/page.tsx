import { SitePageShell } from "@/components/layout/site-page-shell";
import { AjustesScreen } from "@/components/ajustes/ajustes-screen";
import { getCurrentUser } from "@/lib/home-data";
import { getPerfil } from "@/lib/supabase/auth";
import { perfilHref, slugUsername } from "@/lib/mocks/perfil";
import { redirect } from "next/navigation";

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

export default async function AjustesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const perfil = await getPerfil(user.id);
  const isAdmin = Boolean(perfil?.es_admin);
  const username = usernameFromUser(user);
  const closeHref = username ? perfilHref(username) : "/";

  return (
    <SitePageShell
      user={user}
      menuTone="black"
      hideMenu
      showDesktopHeader={false}
      className="bg-black text-white"
    >
      <div className="flex min-h-0 flex-1 flex-col bg-black pb-[var(--safe-bottom)]">
        <AjustesScreen isAdmin={isAdmin} closeHref={closeHref} />
      </div>
    </SitePageShell>
  );
}
