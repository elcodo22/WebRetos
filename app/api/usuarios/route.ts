import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UsuarioBusqueda } from "@/lib/usuario-busqueda";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("perfiles")
      .select("nombre_usuario, nombre_completo")
      .order("nombre_usuario", { ascending: true })
      .limit(500);

    if (error) throw error;

    const usuarios: UsuarioBusqueda[] = (data ?? []).map((row) => ({
      username: row.nombre_usuario,
      nombreCompleto: row.nombre_completo,
    }));

    return NextResponse.json(usuarios, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch {
    return NextResponse.json([]);
  }
}
