"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const HERO_REQUEST_EVENT = "carousel-request-hero";

export function HomeLogoLink({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <Link
      href="/#reto"
      aria-label="Ir a la pantalla principal"
      className="absolute left-[18px] top-1/2 z-10 inline-flex -translate-y-1/2 items-center leading-none"
      onClick={(event) => {
        if (pathname !== "/") return;

        // En home: subir al reto con la animación del snap (desde archivos).
        event.preventDefault();
        window.dispatchEvent(new Event(HERO_REQUEST_EVENT));
      }}
    >
      {children}
    </Link>
  );
}
