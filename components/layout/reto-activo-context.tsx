"use client";

import { createContext, useContext, type ReactNode } from "react";

const RetoActivoContext = createContext<string | null>(null);

export function RetoActivoProvider({
  fechaFin,
  children,
}: {
  fechaFin: string | null;
  children: ReactNode;
}) {
  return (
    <RetoActivoContext.Provider value={fechaFin}>
      {children}
    </RetoActivoContext.Provider>
  );
}

export function useRetoActivoFechaFin() {
  return useContext(RetoActivoContext);
}
