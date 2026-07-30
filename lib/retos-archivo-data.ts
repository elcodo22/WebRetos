import { generarRetosArchivoMock } from "@/lib/mocks/retos-archivo";
import { getRetosArchivo, type RetoArchivo } from "@/lib/supabase/retos";
import { createClient } from "@/lib/supabase/server";

/** Debe coincidir con `MOSTRAR_MOCKS_ARCHIVO` en `app/page.tsx`. */
const MOSTRAR_MOCKS_ARCHIVO = true;

/**
 * Lista de retos del archivo (mocks + reales), numerados por antigüedad.
 */
export async function loadRetosArchivo(): Promise<RetoArchivo[]> {
  const supabase = await createClient();

  let retosArchivo: RetoArchivo[] = [];
  try {
    retosArchivo = await getRetosArchivo(supabase);
  } catch {
    retosArchivo = [];
  }

  if (MOSTRAR_MOCKS_ARCHIVO) {
    const mocks = generarRetosArchivoMock();
    retosArchivo = [...mocks, ...retosArchivo]
      .sort((a, b) => a.fechaOrden - b.fechaOrden)
      .map((reto, i) => ({
        ...reto,
        numero: (i + 1).toString().padStart(2, "0"),
      }));
  }

  return retosArchivo;
}

export async function getRetoArchivoById(
  id: string,
): Promise<RetoArchivo | null> {
  const retos = await loadRetosArchivo();
  return retos.find((reto) => reto.id === id) ?? null;
}
