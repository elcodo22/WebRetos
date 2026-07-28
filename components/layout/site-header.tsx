import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { ArchivosLink } from "@/components/layout/archivos-link";
import { StopwatchCursorZone } from "@/components/layout/stopwatch-cursor-zone";
import { CountdownCompact } from "@/components/reto/countdown";

export function SiteHeader({
  user,
  fechaFin,
}: {
  user: User | null;
  fechaFin?: string | null;
}) {
  return (
    <header className="site-grid relative items-center py-6 text-white">
      <div
        className="col-start-1 col-span-1 text-[20px] leading-none"
        aria-hidden
      >
        ✦
      </div>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[40px] font-normal leading-none tracking-wide">
        <StopwatchCursorZone>
          {fechaFin ? (
            <CountdownCompact fechaFin={fechaFin} />
          ) : (
            <span className="inline-flex items-baseline gap-3 tabular-nums">
              <span>
                00<span className="text-[28px]">d</span>
              </span>
              <span>
                00<span className="text-[28px]">h</span>
              </span>
              <span>
                00<span className="text-[28px]">m</span>
              </span>
              <span>
                00<span className="text-[28px]">s</span>
              </span>
            </span>
          )}
        </StopwatchCursorZone>
      </div>

      {/* [Archivos] queda a 18px del borde derecho; [Login] a su izquierda */}
      <nav className="absolute right-[18px] top-1/2 flex -translate-y-1/2 items-center gap-4 text-[20px] font-normal leading-none">
        {user ? (
          <form action="/auth/signout" method="post" className="inline">
            <button type="submit" className="cursor-pointer">
              [Salir]
            </button>
          </form>
        ) : (
          <Link href="/login">[Login]</Link>
        )}
        <ArchivosLink />
      </nav>
    </header>
  );
}
