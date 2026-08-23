import Link from "next/link";
import { SitePageShell } from "@/components/layout/site-page-shell";
import { getCurrentUser } from "@/lib/home-data";
import { redirect } from "next/navigation";

export default async function EditarPerfilPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <SitePageShell
      user={user}
      menuTone="black"
      hideMenu
      showDesktopHeader={false}
      className="bg-black text-white"
    >
      <div className="relative flex min-h-0 flex-1 flex-col bg-black pb-[var(--safe-bottom)] text-white">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-end px-[var(--header-inset-x)] pt-[var(--header-inset-top)]">
          <Link
            href="/ajustes"
            className="pointer-events-auto ui-btn-text font-normal leading-none tracking-wide transition-opacity hover:opacity-80"
          >
            [CERRAR]
          </Link>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-[var(--grid-margin)]">
          <p className="text-[clamp(22px,5vw,30px)] font-normal tracking-wide">
            editar perfil
          </p>
          <p className="mt-4 max-w-md text-center text-[clamp(16px,4vw,22px)] tracking-wide text-white/70">
            Pronto podrás editar tu cuenta desde aquí.
          </p>
        </div>
      </div>
    </SitePageShell>
  );
}
