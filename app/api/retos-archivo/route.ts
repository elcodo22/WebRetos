import { NextResponse } from "next/server";
import { loadRetosArchivo } from "@/lib/retos-archivo-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const retosArchivo = await loadRetosArchivo();
    return NextResponse.json(retosArchivo);
  } catch {
    return NextResponse.json([]);
  }
}
