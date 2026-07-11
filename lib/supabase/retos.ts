import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Supabase = SupabaseClient<Database>;

function fechasRetoActivo() {
  const fechaInicio = new Date();
  const fechaFin = new Date();
  fechaFin.setDate(fechaFin.getDate() + 7);
  return {
    fecha_inicio: fechaInicio.toISOString(),
    fecha_fin: fechaFin.toISOString(),
  };
}

export async function getRetoActivo(supabase: Supabase) {
  const { data, error } = await supabase
    .from("retos")
    .select("id, titulo, descripcion, fecha_inicio, fecha_fin")
    .eq("estado", "activo")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function reordenarCola(supabase: Supabase) {
  const { data: enCola } = await supabase
    .from("retos")
    .select("id")
    .eq("estado", "en_cola")
    .order("orden_cola", { ascending: true });

  if (!enCola?.length) return;

  await Promise.all(
    enCola.map((reto, index) =>
      supabase
        .from("retos")
        .update({ orden_cola: index + 1 })
        .eq("id", reto.id)
    )
  );
}

export async function activarSiguienteEnCola(supabase: Supabase) {
  const { data: siguiente } = await supabase
    .from("retos")
    .select("id, titulo")
    .eq("estado", "en_cola")
    .order("orden_cola", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!siguiente) return null;

  const fechas = fechasRetoActivo();
  const { error } = await supabase
    .from("retos")
    .update({
      estado: "activo",
      orden_cola: null,
      ...fechas,
    })
    .eq("id", siguiente.id);

  if (error) throw new Error(error.message);

  await reordenarCola(supabase);
  return siguiente;
}
