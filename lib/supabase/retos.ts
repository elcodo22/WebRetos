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
    .select("id, titulo, descripcion, fecha_inicio, fecha_fin, creado_en")
    .eq("estado", "activo")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export type RetoArchivo = {
  id: string;
  titulo: string;
  numero: string;
  fechaLabel: string;
  fechaOrden: number;
};

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function formatearFechaArchivo(iso: string) {
  const fecha = new Date(iso);
  return `${fecha.getDate()}, ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
}

/** Retos visibles en archivo (sin eliminados), numerados por antigüedad. */
export async function getRetosArchivo(supabase: Supabase): Promise<RetoArchivo[]> {
  const { data, error } = await supabase
    .from("retos")
    .select("id, titulo, fecha_fin, fecha_inicio, creado_en")
    .neq("estado", "eliminado")
    .order("creado_en", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((reto, index) => {
    const fechaIso = reto.fecha_fin ?? reto.fecha_inicio ?? reto.creado_en;
    return {
      id: reto.id,
      titulo: reto.titulo,
      numero: (index + 1).toString().padStart(2, "0"),
      fechaLabel: formatearFechaArchivo(fechaIso),
      fechaOrden: new Date(fechaIso).getTime(),
    };
  });
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
