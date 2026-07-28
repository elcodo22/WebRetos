import { NextResponse } from "next/server";
import { crearUrlSubidaDirecta, getMaxVideoDurationSeconds } from "@/lib/cloudflare/stream";
import { getSession } from "@/lib/supabase/auth";

export async function POST() {
  const user = await getSession();

  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  try {
    const upload = await crearUrlSubidaDirecta();

    return NextResponse.json({
      uploadURL: upload.uploadURL,
      uid: upload.uid,
      maxDurationSeconds: getMaxVideoDurationSeconds(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al preparar la subida.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
