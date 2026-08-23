import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { HeaderNav } from "@/components/layout/header-nav";
import { slugUsername } from "@/lib/mocks/perfil";

type SiteHeaderVariant = "default" | "login" | "registro" | "forgot";

function usernameFromUser(user: User) {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const raw =
    (typeof meta?.nombre_usuario === "string" && meta.nombre_usuario) ||
    (typeof meta?.username === "string" && meta.username) ||
    "";
  const slug = slugUsername(raw);
  if (slug) return slug;
  if (user.email) return slugUsername(user.email.split("@")[0] ?? "");
  return null;
}

export function SiteHeader({
  user,
  variant = "default",
  center,
  onLoginClick,
}: {
  user: User | null;
  /** @deprecated El temporizador está en el hero del home. */
  fechaFin?: string | null;
  variant?: SiteHeaderVariant;
  /** @deprecated */
  showCountdown?: boolean;
  /** Contenido centrado opcional. */
  center?: ReactNode;
  /** Si se pasa en pantallas auth, [Login] llama a esto en lugar de navegar. */
  onLoginClick?: () => void;
}) {
  const profileUsername = user ? usernameFromUser(user) : null;
  const hasCenter = center != null;

  return (
    <header className="relative flex w-full flex-col gap-2 bg-transparent px-[var(--grid-margin)] pb-3 pt-[max(1.125rem,var(--safe-top))] text-current [background:transparent] md:pb-4 md:pt-[max(1.625rem,var(--safe-top))]">
      <div className="z-10 w-full">
        <HeaderNav
          user={user}
          variant={variant}
          profileUsername={profileUsername}
          onLoginClick={onLoginClick}
        />
      </div>

      {hasCenter ? (
        <div className="z-10 flex w-full justify-center text-center font-normal leading-none tracking-wide">
          <div className="pointer-events-auto truncate text-[clamp(18px,3.8vw,25px)]">
            {center}
          </div>
        </div>
      ) : null}
    </header>
  );
}
