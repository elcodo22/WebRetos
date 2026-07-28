"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "animate-to-archivos";

export function ArchivosLink() {
  const pathname = usePathname();

  return (
    <Link
      href="/?to=archivos"
      onClick={(event) => {
        if (pathname === "/") {
          event.preventDefault();
          // Solo anima si no estamos ya en archivos (lo decide HomeSnap)
          window.dispatchEvent(new Event("navigate-archivos-from-top"));
          return;
        }

        // Desde login u otra pantalla: marcar para animar al llegar a la home
        sessionStorage.setItem(STORAGE_KEY, "1");
      }}
    >
      [Archivos]
    </Link>
  );
}
