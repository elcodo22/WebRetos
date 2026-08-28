"use client";

import type { ReactNode } from "react";
import { RetoTimeBar } from "@/components/reto/reto-time-bar";
import { useRetoActivoFechaFin } from "@/components/layout/reto-activo-context";

export function HeaderTime({ fechaFin }: { fechaFin: string }) {
  return (
    <RetoTimeBar
      fechaFin={fechaFin}
      active
      size="nav"
      align="center"
      format="units"
    />
  );
}

/** Centro del header: explícito o contador del reto activo. */
export function useHeaderCenter(center?: ReactNode): ReactNode {
  const fechaFin = useRetoActivoFechaFin();
  if (center !== undefined) return center;
  if (!fechaFin) return null;
  return <HeaderTime fechaFin={fechaFin} />;
}
