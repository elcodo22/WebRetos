import { NextResponse } from "next/server";
import { loadRetosArchivo } from "@/lib/retos-archivo-data";

export async function GET() {
  try {
    const retosArchivo = await loadRetosArchivo();
    return NextResponse.json(retosArchivo, {
      headers: {
        // Alineado con revalidate de la caché de archivo
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch {
    return NextResponse.json([]);
  }
}
