import Link from "next/link";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { ArchivosLink } from "@/components/layout/archivos-link";
import { HomeLogoLink } from "@/components/layout/home-logo-link";
import { StopwatchCursorZone } from "@/components/layout/stopwatch-cursor-zone";
import { CountdownCompact } from "@/components/reto/countdown";
import { ArchivosSearch } from "@/components/archivos/archivos-search";

type SiteHeaderVariant = "default" | "login" | "registro";

export function SiteHeader({
  user,
  fechaFin,
  variant = "default",
  showCountdown = true,
  center,
}: {
  user: User | null;
  fechaFin?: string | null;
  variant?: SiteHeaderVariant;
  showCountdown?: boolean;
  /** Contenido centrado (sustituye al temporizador si se pasa). */
  center?: ReactNode;
}) {
  const isAuthPage = variant === "login" || variant === "registro";
  const showTimer = !isAuthPage && showCountdown && center == null;

  return (
    <header className="site-grid relative items-center bg-transparent py-6 text-white">
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
        {variant === "default" && (
          <>
            <ArchivosLink />
            {user ? (
              <form action="/auth/signout" method="post" className="inline">
                <button type="submit" className="cursor-pointer">
                  [Salir]
                </button>
              </form>
            ) : (
              <>
                <Link href="/login">[Login]</Link>
                <Link href="/registro">[Registro]</Link>
              </>
            )}
            <ArchivosSearch />
          </>
        )}
      </nav>
    </header>
  );
}

/**
 * Logo oficial Pixelarticons `letter-r-circle`. Blanco vía `currentColor`.
 */
function LogoIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      style={{ shapeRendering: "crispEdges" }}
      aria-hidden
    >
      <path
        d="M18 22H6V20H18V22ZM6 20H4V18H6V20ZM20 20H18V18H20V20ZM4 18H2L2 6H4L4 18ZM14 8H10V12H14V16H12V14H10V18H8L8 6L14 6V8ZM16 18H14V16H16V18ZM22 18H20V6H22V18ZM16 12H14V8H16V12ZM6 6H4V4H6V6ZM20 6H18V4H20V6ZM18 4L6 4V2L18 2V4Z"
        fill="currentColor"
      />
    </svg>
  );
}
