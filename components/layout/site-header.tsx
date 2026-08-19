import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { HeaderNav } from "@/components/layout/header-nav";
import { HomeLogoLink } from "@/components/layout/home-logo-link";
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
    <header className="relative flex w-full flex-col gap-2 bg-transparent px-[var(--grid-margin)] pb-3 pt-[max(0.75rem,var(--safe-top))] text-current [background:transparent] md:flex-row md:items-center md:gap-4 md:pb-4 md:pt-[max(1.25rem,var(--safe-top))]">
      <div className="flex w-full items-center gap-4 md:contents">
        <div className="z-10 shrink-0">
          <HomeLogoLink>
            <LogoIcon />
          </HomeLogoLink>
        </div>

        <div className="z-10 min-w-0 shrink md:ml-auto">
          <HeaderNav
            user={user}
            variant={variant}
            profileUsername={profileUsername}
            onLoginClick={onLoginClick}
          />
        </div>
      </div>

      {hasCenter ? (
        <div className="z-10 flex w-full justify-center text-center font-normal leading-none tracking-wide md:pointer-events-none md:absolute md:left-1/2 md:top-1/2 md:w-max md:max-w-[min(70vw,36rem)] md:-translate-x-1/2 md:-translate-y-1/2">
          <div className="pointer-events-auto truncate text-[clamp(18px,3.8vw,25px)]">
            {center}
          </div>
        </div>
      ) : null}
    </header>
  );
}

/** Logo corto (Recurso 4). */
function LogoIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 50.7 26.67"
      width={53}
      height={28}
      className="h-[16px] w-auto md:h-[28px]"
      style={{ shapeRendering: "crispEdges", display: "block" }}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="m45.37,26.67h-16v-2.67h16v2.67Zm-16-2.67h-2.67v-2.67h2.67v2.67Zm18.67,0h-2.67v-2.67h2.67v2.67Zm-21.33-2.67h-2.67V5.33h2.67v16Zm13.33,0h-5.33v-2.67h5.33v2.67Zm10.67,0h-2.67V5.33h2.67v16Zm-16-2.67h-2.67v-2.67h2.67v2.67Zm8,0h-2.67v-10.67h-5.33v-2.67h8v13.33Zm-13.33-13.33h-2.67v-2.67h2.67v2.67Zm18.67,0h-2.67v-2.67h2.67v2.67Zm-2.67-2.67h-16V0h16v2.67Z"
      />
      <path
        fill="currentColor"
        d="m21.33,26.67H5.33v-2.67h16v2.67Zm-16-2.67h-2.67v-2.67h2.67v2.67Zm18.67,0h-2.67v-2.67h2.67v2.67Zm-21.33-2.67H0V5.33h2.67v16Zm14.67,0h-8v-2.67h8v2.67Zm-8-2.67h-2.67V6.67h2.67v12Zm10.67,0h-2.67V6.67h2.67v12ZM5.33,5.33h-2.67v-2.67h2.67v2.67Zm18.67,0h-2.67v-2.67h2.67v2.67Zm-2.67-2.67H5.33V0h16v2.67Z"
      />
    </svg>
  );
}
