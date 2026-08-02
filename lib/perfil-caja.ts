import type { PerfilObra } from "@/lib/mocks/perfil";

export const PERFIL_CAJA_KEY = "perfil-carpeta";

export type SavedObra = Pick<
  PerfilObra,
  | "id"
  | "username"
  | "titulo"
  | "descripcion"
  | "imageUrl"
  | "videoUrl"
  | "retoNumero"
  | "retoTitulo"
  | "retoId"
> & {
  /** Momento en que se guardó este vídeo. */
  savedAt?: number;
};

/** Una caja = un reto, con los vídeos guardados de ese reto. */
export type SavedCaja = {
  retoNumero: string;
  retoTitulo: string;
  /** Id del reto en archivo (`/reto/[id]`). */
  retoId?: string;
  obras: SavedObra[];
  /** Última vez que se guardó algo en esta caja (ordena el carrusel). */
  savedAt: number;
};

function retoKey(numero: string, titulo: string) {
  return `${numero.trim()}::${titulo.trim()}`.toLowerCase();
}

function isSavedObra(item: unknown): item is SavedObra {
  return (
    item != null &&
    typeof item === "object" &&
    typeof (item as SavedObra).id === "string" &&
    typeof (item as SavedObra).imageUrl === "string" &&
    typeof (item as SavedObra).retoNumero === "string"
  );
}

function isSavedCaja(item: unknown): item is SavedCaja {
  return (
    item != null &&
    typeof item === "object" &&
    Array.isArray((item as SavedCaja).obras)
  );
}

function normalizeCajas(raw: unknown): SavedCaja[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  // Lista antigua: solo ids
  if (raw.every((item) => typeof item === "string")) return [];

  // Formato cajas
  if (raw.every(isSavedCaja)) {
    return (raw as SavedCaja[])
      .map((caja, index) => {
        const obras = caja.obras.filter(isSavedObra).map((obra, i) => ({
          ...obra,
          retoNumero: obra.retoNumero || caja.retoNumero,
          retoTitulo: obra.retoTitulo || caja.retoTitulo,
          savedAt:
            typeof obra.savedAt === "number"
              ? obra.savedAt
              : (caja.savedAt ?? index),
        }));
        if (obras.length === 0) return null;
        const savedAt =
          typeof caja.savedAt === "number"
            ? caja.savedAt
            : Math.max(...obras.map((o) => o.savedAt ?? 0), 0);
        return {
          retoNumero: caja.retoNumero || obras[0].retoNumero,
          retoTitulo: caja.retoTitulo || obras[0].retoTitulo,
          retoId:
            caja.retoId ||
            obras.find((o) => o.retoId)?.retoId,
          obras: [...obras].sort(
            (a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0),
          ),
          savedAt,
        } satisfies SavedCaja;
      })
      .filter((caja): caja is SavedCaja => caja != null);
  }

  // Formato plano: SavedObra[]
  const flat = raw.filter(isSavedObra);
  const map = new Map<string, SavedCaja>();
  flat.forEach((obra, index) => {
    const key = retoKey(obra.retoNumero, obra.retoTitulo);
    const savedAt =
      typeof obra.savedAt === "number" ? obra.savedAt : index;
    const existing = map.get(key);
    if (existing) {
      if (!existing.obras.some((item) => item.id === obra.id)) {
        existing.obras.push({ ...obra, savedAt });
      }
      if (!existing.retoId && obra.retoId) existing.retoId = obra.retoId;
      existing.savedAt = Math.max(existing.savedAt, savedAt);
    } else {
      map.set(key, {
        retoNumero: obra.retoNumero,
        retoTitulo: obra.retoTitulo,
        retoId: obra.retoId,
        obras: [{ ...obra, savedAt }],
        savedAt,
      });
    }
  });

  for (const caja of map.values()) {
    caja.obras.sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
  }

  return Array.from(map.values());
}

/** Cajas ordenadas: la última en la que guardaste sale primero. */
export function readSavedCajas(): SavedCaja[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(PERFIL_CAJA_KEY);
    if (!raw) return [];
    const cajas = normalizeCajas(JSON.parse(raw) as unknown);
    return cajas.sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

function writeCajas(cajas: SavedCaja[]) {
  sessionStorage.setItem(PERFIL_CAJA_KEY, JSON.stringify(cajas));
}

export function saveObraToCaja(obra: PerfilObra) {
  if (typeof window === "undefined") return;
  try {
    const now = Date.now();
    const cajas = readSavedCajas();
    const key = retoKey(obra.retoNumero, obra.retoTitulo);
    const next: SavedObra = {
      id: obra.id,
      username: obra.username,
      titulo: obra.titulo,
      descripcion: obra.descripcion,
      imageUrl: obra.imageUrl,
      videoUrl: obra.videoUrl,
      retoNumero: obra.retoNumero,
      retoTitulo: obra.retoTitulo,
      retoId: obra.retoId,
      savedAt: now,
    };

    const idx = cajas.findIndex(
      (caja) => retoKey(caja.retoNumero, caja.retoTitulo) === key,
    );

    if (idx >= 0) {
      const caja = cajas[idx];
      if (!caja.retoId && obra.retoId) caja.retoId = obra.retoId;
      if (caja.obras.some((item) => item.id === next.id)) {
        // Ya estaba: solo refresca orden (caja al frente)
        caja.savedAt = now;
      } else {
        caja.obras = [next, ...caja.obras];
        caja.savedAt = now;
      }
      cajas.splice(idx, 1);
      cajas.unshift(caja);
    } else {
      cajas.unshift({
        retoNumero: obra.retoNumero,
        retoTitulo: obra.retoTitulo,
        retoId: obra.retoId,
        obras: [next],
        savedAt: now,
      });
    }

    writeCajas(cajas);
    window.dispatchEvent(new Event("perfil-caja-updated"));
  } catch {
    /* ignore */
  }
}

/** Quita un vídeo de guardados. Si la carpeta del reto queda vacía, se elimina. */
export function removeObraFromCaja(obraId: string) {
  if (typeof window === "undefined") return;
  try {
    const next = readSavedCajas()
      .map((caja) => ({
        ...caja,
        obras: caja.obras.filter((obra) => obra.id !== obraId),
      }))
      .filter((caja) => caja.obras.length > 0);
    writeCajas(next);
    window.dispatchEvent(new Event("perfil-caja-updated"));
  } catch {
    /* ignore */
  }
}
