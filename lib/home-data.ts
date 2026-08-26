import { unstable_cache } from "next/cache";
import { cache } from "react";
import { getRetoActivo } from "@/lib/supabase/retos";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

export type RetoActivoHome = {
  id: string;
  titulo: string;
  descripcion: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  creado_en: string | null;
  numero: string;
};

function formatearNumeroReto(totalAnteriores: number) {
  return (totalAnteriores + 1).toString().padStart(2, "0");
}

/**
 * Reto activo + número: datos públicos con revalidate corto.
 * Evita repetir 2–3 round-trips a Supabase en cada navegación.
 */
const fetchRetoActivoHome = unstable_cache(
  async (): Promise<RetoActivoHome | null> => {
    const supabase = createPublicClient();
    const reto = await getRetoActivo(supabase);
    if (!reto) return null;

    let numero = "001";
    try {
      const { count } = await supabase
        .from("retos")
        .select("id", { count: "exact", head: true })
        .lte("creado_en", reto.creado_en ?? new Date().toISOString())
        .in("estado", ["activo", "en_cola", "finalizado"]);

      numero = formatearNumeroReto(Math.max((count ?? 1) - 1, 0));
    } catch {
      numero = "001";
    }

    return {
      id: reto.id,
      titulo: reto.titulo,
      descripcion: reto.descripcion,
      fecha_inicio: reto.fecha_inicio ?? reto.creado_en,
      fecha_fin: reto.fecha_fin,
      creado_en: reto.creado_en,
      numero,
    };
  },
  ["reto-activo-home"],
  { revalidate: 30, tags: ["reto-activo"] },
);

/** Dedup dentro del mismo request RSC. */
export const getRetoActivoHome = cache(async () => {
  try {
    return await fetchRetoActivoHome();
  } catch {
    return null;
  }
});

/** Sesión del visitante (no cacheable). */
export const getCurrentUser = cache(async () => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
});
