import Link from "next/link";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { ArchivosLink } from "@/components/layout/archivos-link";
import { HomeLogoLink } from "@/components/layout/home-logo-link";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { StopwatchCursorZone } from "@/components/layout/stopwatch-cursor-zone";
import { CountdownCompact } from "@/components/reto/countdown";
import { ArchivosSearch } from "@/components/archivos/archivos-search";
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
  fechaFin,
  variant = "default",
  showCountdown = true,
  center,
  onLoginClick,
}: {
  user: User | null;
  fechaFin?: string | null;
  variant?: SiteHeaderVariant;
  showCountdown?: boolean;
  /** Contenido centrado (sustituye al temporizador si se pasa). */
  center?: ReactNode;
  /** Si se pasa en pantallas auth, [Login] llama a esto en lugar de navegar. */
  onLoginClick?: () => void;
}) {
  const isAuthPage =
    variant === "login" || variant === "registro" || variant === "forgot";
  const showTimer = !isAuthPage && showCountdown && center == null;
  const profileUsername = user ? usernameFromUser(user) : null;

  return (
    <header className="site-grid relative items-center bg-transparent pb-6 pt-10 text-white [background:transparent]">
      <HomeLogoLink>
        <LogoIcon />
      </HomeLogoLink>

      <div className="col-span-10 h-7" aria-hidden />

      {center != null && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 max-w-[min(52vw,640px)] -translate-x-1/2 -translate-y-1/2 truncate text-center text-[20px] font-normal leading-none tracking-wide">
          {center}
        </div>
      )}

      {showTimer && fechaFin ? (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[40px] font-normal leading-none tracking-wide">
          <StopwatchCursorZone>
            <CountdownCompact fechaFin={fechaFin} />
          </StopwatchCursorZone>
        </div>
      ) : null}

      <nav className="absolute right-[18px] top-1/2 flex -translate-y-1/2 items-center gap-4 text-[20px] font-normal leading-none">
        {variant === "login" && <Link href="/registro">[Registro]</Link>}
        {variant === "registro" && <Link href="/login">[Login]</Link>}
        {variant === "forgot" && (
          <>
            {onLoginClick ? (
              <button
                type="button"
                onClick={onLoginClick}
                className="cursor-pointer"
              >
                [Login]
              </button>
            ) : (
              <Link href="/login">[Login]</Link>
            )}
            <Link href="/registro">[Registro]</Link>
          </>
        )}
        {variant === "default" && (
          <>
            <ArchivosLink />
            {user ? (
              <>
                <ArchivosSearch />
                <ProfileMenu username={profileUsername} />
              </>
            ) : (
              <>
                <Link href="/login">[Login]</Link>
                <Link href="/registro">[Registro]</Link>
                <ArchivosSearch />
              </>
            )}
          </>
        )}
      </nav>
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
      style={{ shapeRendering: "crispEdges", display: "block" }}
      aria-hidden
    >
      <path
        fill="#fff"
        d="m45.37,26.67h-16v-2.67h16v2.67Zm-16-2.67h-2.67v-2.67h2.67v2.67Zm18.67,0h-2.67v-2.67h2.67v2.67Zm-21.33-2.67h-2.67V5.33h2.67v16Zm13.33,0h-5.33v-2.67h5.33v2.67Zm10.67,0h-2.67V5.33h2.67v16Zm-16-2.67h-2.67v-2.67h2.67v2.67Zm8,0h-2.67v-10.67h-5.33v-2.67h8v13.33Zm-13.33-13.33h-2.67v-2.67h2.67v2.67Zm18.67,0h-2.67v-2.67h2.67v2.67Zm-2.67-2.67h-16V0h16v2.67Z"
      />
      <path
        fill="#fff"
        d="m21.33,26.67H5.33v-2.67h16v2.67Zm-16-2.67h-2.67v-2.67h2.67v2.67Zm18.67,0h-2.67v-2.67h2.67v2.67Zm-21.33-2.67H0V5.33h2.67v16Zm14.67,0h-8v-2.67h8v2.67Zm-8-2.67h-2.67V6.67h2.67v12Zm10.67,0h-2.67V6.67h2.67v12ZM5.33,5.33h-2.67v-2.67h2.67v2.67Zm18.67,0h-2.67v-2.67h2.67v2.67Zm-2.67-2.67H5.33V0h16v2.67Z"
      />
    </svg>
  );
}
