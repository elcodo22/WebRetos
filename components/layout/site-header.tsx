import Link from "next/link";
import Image from "next/image";
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
    <header className="site-grid relative items-center bg-transparent py-6 text-white [background:transparent]">
      <HomeLogoLink>
        <LogoIcon />
      </HomeLogoLink>

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

/**
 * Logo de la app: "plunger" en blanco.
 */
function LogoIcon() {
  return (
    <Image
      src="/icons/plunger-word-white.png"
      alt="plunger"
      width={96}
      height={24}
      priority
      style={{ imageRendering: "pixelated" }}
    />
  );
}
