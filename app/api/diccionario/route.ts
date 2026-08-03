import { NextRequest, NextResponse } from "next/server";
import type { DiccionarioResult, DiccionarioSense } from "@/lib/diccionario";

const WORD_RE = /^[\p{L}\p{M}']{1,40}$/u;

function normalizePalabra(raw: string): string | null {
  const cleaned = raw
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/^[^\p{L}\p{M}']+|[^\p{L}\p{M}']+$/gu, "");
  if (!cleaned || !WORD_RE.test(cleaned)) return null;
  return cleaned;
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("palabra") ?? "";
  const palabra = normalizePalabra(raw);
  if (!palabra) {
    return NextResponse.json(
      { error: "INVALID", message: "Palabra no válida." },
      { status: 400 },
    );
  }

  const headers: HeadersInit = { Accept: "application/json" };
  const apiKey = process.env.RAE_API_KEY;
  if (apiKey) headers["X-API-Key"] = apiKey;

  try {
    const upstream = await fetch(
      `https://rae-api.com/api/words/${encodeURIComponent(palabra)}`,
      {
        headers,
        next: { revalidate: 86_400 },
      },
    );

    if (upstream.status === 404) {
      return NextResponse.json(
        { error: "NOT_FOUND", word: palabra },
        { status: 404 },
      );
    }

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "UPSTREAM", message: "No se pudo consultar el diccionario." },
        { status: 502 },
      );
    }

    const body = (await upstream.json()) as {
      data?: {
        word?: string;
        meanings?: Array<{
          senses?: Array<{
            meaning_number?: number;
            category?: string;
            description?: string;
          }>;
        }>;
      };
    };

    const senses: DiccionarioSense[] = [];
    for (const meaning of body.data?.meanings ?? []) {
      for (const sense of meaning.senses ?? []) {
        const description = sense.description?.trim();
        if (!description) continue;
        senses.push({
          n: sense.meaning_number ?? senses.length + 1,
          category: sense.category ?? "",
          description,
        });
      }
    }

    if (senses.length === 0) {
      return NextResponse.json(
        { error: "NOT_FOUND", word: palabra },
        { status: 404 },
      );
    }

    const result: DiccionarioResult = {
      word: body.data?.word ?? palabra,
      senses,
    };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "UPSTREAM", message: "No se pudo consultar el diccionario." },
      { status: 502 },
    );
  }
}
