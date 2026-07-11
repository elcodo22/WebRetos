"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { activarSiguienteEnCola, reordenarCola } from "@/lib/supabase/retos";

export type AdminActionState = {
  error?: string;
  success?: string;
};

export async function crearReto(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();

  const titulo = formData.get("titulo")?.toString().trim();
  const descripcion = formData.get("descripcion")?.toString().trim();

  if (!titulo) {
    return { error: "El título es obligatorio." };
  }

  if (!descripcion) {
    return { error: "La descripción es obligatoria." };
  }

  const supabase = await createClient();

  const { data: retoActivo } = await supabase
    .from("retos")
    .select("id")
    .eq("estado", "activo")
    .maybeSingle();

  if (retoActivo) {
    const { data: ultimoEnCola } = await supabase
      .from("retos")
      .select("orden_cola")
      .eq("estado", "en_cola")
      .order("orden_cola", { ascending: false })
      .limit(1)
      .maybeSingle();

    const ordenCola = (ultimoEnCola?.orden_cola ?? 0) + 1;

    const { error } = await supabase.from("retos").insert({
      titulo,
      descripcion,
      estado: "en_cola",
      orden_cola: ordenCola,
      fecha_inicio: null,
      fecha_fin: null,
    });

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/admin");
    return {
      success: `Reto añadido a la cola (posición ${ordenCola}). Se activará cuando termine el reto actual.`,
    };
  }

  const fechaInicio = new Date();
  const fechaFin = new Date();
  fechaFin.setDate(fechaFin.getDate() + 7);

  const { error } = await supabase.from("retos").insert({
    titulo,
    descripcion,
    estado: "activo",
    orden_cola: null,
    fecha_inicio: fechaInicio.toISOString(),
    fecha_fin: fechaFin.toISOString(),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
  return { success: "Reto creado y activado correctamente." };
}

export async function actualizarReto(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();

  const id = formData.get("id")?.toString();
  const titulo = formData.get("titulo")?.toString().trim();
  const descripcion = formData.get("descripcion")?.toString().trim();

  if (!id) {
    return { error: "Reto no encontrado." };
  }

  if (!titulo) {
    return { error: "El título es obligatorio." };
  }

  if (!descripcion) {
    return { error: "La descripción es obligatoria." };
  }

  const supabase = await createClient();

  const { data: reto } = await supabase
    .from("retos")
    .select("estado")
    .eq("id", id)
    .single();

  if (!reto || reto.estado === "finalizado" || reto.estado === "eliminado") {
    return { error: "Este reto no se puede editar." };
  }

  const { error } = await supabase
    .from("retos")
    .update({ titulo, descripcion })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
  return { success: "Reto actualizado correctamente." };
}

export async function eliminarReto(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();

  const id = formData.get("id")?.toString();

  if (!id) {
    return { error: "Reto no encontrado." };
  }

  const supabase = await createClient();

  const { data: reto } = await supabase
    .from("retos")
    .select("id, titulo, estado")
    .eq("id", id)
    .single();

  if (!reto) {
    return { error: "Reto no encontrado." };
  }

  if (reto.estado === "finalizado" || reto.estado === "eliminado") {
    return { error: "Este reto no se puede eliminar." };
  }

  const eraActivo = reto.estado === "activo";

  const { error } = await supabase
    .from("retos")
    .update({
      estado: "eliminado",
      orden_cola: null,
      fecha_inicio: null,
      fecha_fin: null,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  if (eraActivo) {
    const siguiente = await activarSiguienteEnCola(supabase);

    revalidatePath("/admin");
    return siguiente
      ? {
          success: `Reto marcado como eliminado. "${siguiente.titulo}" se ha activado automáticamente.`,
        }
      : { success: "Reto marcado como eliminado. No hay más retos en cola." };
  }

  await reordenarCola(supabase);

  revalidatePath("/admin");
  return { success: "Reto marcado como eliminado." };
}
