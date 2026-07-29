import { NextResponse } from "next/server";
import { generarRetosArchivoMock } from "@/lib/mocks/retos-archivo";
import { getRetosArchivo } from "@/lib/supabase/retos";
import { createClient } from "@/lib/supabase/server";

const MOSTRAR_MOCKS_ARCHIVO = true;

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();

  let retosArchivo: Awaited<ReturnType<typeof getRetosArchivo>> = [];
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

  return NextResponse.json(retosArchivo);
}
