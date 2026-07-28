"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/supabase/auth";

export type GuardarObraState = {
  error?: string;
  success?: string;
};

export async function guardarObra(formData: FormData): Promise<GuardarObraState> {
  const user = await getSession();

  if (!user) {
    return { error: "Debes iniciar sesión." };
  }

  const idReto = formData.get("id_reto")?.toString();
  const titulo = formData.get("titulo")?.toString().trim();
  const idCloudflare = formData.get("id_cloudflare")?.toString().trim();

  if (!idReto || !titulo || !idCloudflare) {
    return { error: "Faltan datos para guardar la obra." };
  }

  const supabase = await createClient();

  const { data: retoActivo } = await supabase
    .from("retos")
    .select("id")
    .eq("id", idReto)
    .eq("estado", "activo")
    .maybeSingle();

  if (!retoActivo) {
    return { error: "Este reto ya no está activo." };
  }

  const { data: obraExistente } = await supabase
    .from("obras")
    .select("id")
    .eq("id_reto", idReto)
    .eq("id_usuario", user.id)
    .maybeSingle();

  if (obraExistente) {
    return { error: "Ya has subido una obra para este reto." };
  }

  const { error } = await supabase.from("obras").insert({
    id_reto: idReto,
    id_usuario: user.id,
    titulo,
    id_cloudflare: idCloudflare,
    estado: "pendiente",
    comprobado: false,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/subir");
  revalidatePath("/");
  return { success: "Obra guardada correctamente." };
}

export async function requireUploadAccess() {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();

  const { data: retoActivo } = await supabase
    .from("retos")
    .select("id, titulo, descripcion, fecha_fin")
    .eq("estado", "activo")
    .maybeSingle();

  if (!retoActivo) {
    return { user, retoActivo: null, obraExistente: null };
  }

  const { data: obraExistente } = await supabase
    .from("obras")
    .select("id, titulo, id_cloudflare, estado, creado_en")
    .eq("id_reto", retoActivo.id)
    .eq("id_usuario", user.id)
    .maybeSingle();

  return { user, retoActivo, obraExistente };
}
