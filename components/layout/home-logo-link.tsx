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
      className="inline-flex items-center leading-none"
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
