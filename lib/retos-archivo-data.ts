import { unstable_cache } from "next/cache";
import { cache } from "react";
import { generarRetosArchivoMock } from "@/lib/mocks/retos-archivo";
import { getRetosArchivo, type RetoArchivo } from "@/lib/supabase/retos";
import { createPublicClient } from "@/lib/supabase/public";

/** Incluye mocks de desarrollo/relleno junto a los retos reales. */
const MOSTRAR_MOCKS_ARCHIVO = true;

function numerar(retos: RetoArchivo[]): RetoArchivo[] {
  return [...retos]
    .sort((a, b) => a.fechaOrden - b.fechaOrden)
    .map((reto, i) => ({
      ...reto,
      numero: (i + 1).toString().padStart(2, "0"),
    }));
}

const fetchRetosArchivoDb = unstable_cache(
  async (): Promise<RetoArchivo[]> => {
    const supabase = createPublicClient();
    try {
      return await getRetosArchivo(supabase);
    } catch {
      return [];
    }
  },
  ["retos-archivo-db"],
  { revalidate: 60, tags: ["retos-archivo"] },
);

/**
 * Lista del archivo (mocks + DB), cacheada y deduplicada por request.
 */
export const loadRetosArchivo = cache(async (): Promise<RetoArchivo[]> => {
  const reales = await fetchRetosArchivoDb();

  if (!MOSTRAR_MOCKS_ARCHIVO) {
    return numerar(reales);
  }

  const mocks = generarRetosArchivoMock();
  return numerar([...mocks, ...reales]);
});

export const getRetoArchivoById = cache(
  async (id: string): Promise<RetoArchivo | null> => {
    const retos = await loadRetosArchivo();
    return retos.find((reto) => reto.id === id) ?? null;
  },
);
