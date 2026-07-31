import type { RetoFeedItem } from "@/lib/mocks/reto-feed";
import { generarFeedRetoMock } from "@/lib/mocks/reto-feed";
import type { RetoArchivo } from "@/lib/supabase/retos";

export type PerfilObra = RetoFeedItem & {
  retoNumero: string;
  /** Título del reto (no el de la obra). */
  retoTitulo: string;
};

export type PerfilData = {
  /** Sin @ */
  username: string;
  nombreCompleto: string;
  participaciones: number;
  obras: PerfilObra[];
};

const RETOS_FALLBACK = [
  { numero: "01", titulo: "Camión Utopía Incendios" },
  { numero: "02", titulo: "Noche de ensayo" },
  { numero: "03", titulo: "Puerto interno" },
  { numero: "04", titulo: "Mapa de ceniza" },
  { numero: "05", titulo: "Ventana invertida" },
  { numero: "06", titulo: "Humedad eléctrica" },
  { numero: "07", titulo: "Luz de servicio" },
  { numero: "08", titulo: "Cinta olvidada" },
  { numero: "09", titulo: "Calle sin reloj" },
  { numero: "10", titulo: "Eco de garaje" },
  { numero: "11", titulo: "Faro roto" },
  { numero: "12", titulo: "Bosque ácido" },
];

/** Nombre realista + nº de participaciones (coincide con obras mostradas). */
const PERFILES: Record<string, { nombre: string; count: number }> = {
  "luna.verde": { nombre: "LAURA MENDOZA", count: 6 },
  pixelmar: { nombre: "MARÍA PAREDES", count: 1 },
  cinta_vhs: { nombre: "CARLOS IBÁÑEZ", count: 0 },
  "neon.rio": { nombre: "DIEGO NAVARRO", count: 9 },
  sombra_azul: { nombre: "SOFÍA RAMÍREZ", count: 3 },
  faro_roto: { nombre: "ANDRÉS MOLINA", count: 1 },
  "vinilo.crudo": { nombre: "ELENA CASTRO", count: 0 },
  "astro.papel": { nombre: "PABLO SERRANO", count: 4 },
  trennocturno: { nombre: "NURIA VEGA", count: 8 },
  cristal_humo: { nombre: "JAVIER ORTEGA", count: 2 },
  "mar.cobre": { nombre: "ANA BELÉN RUIZ", count: 5 },
  relojvacio: { nombre: "HUGO DELGADO", count: 0 },
  "bosque.acido": { nombre: "IRENE CAMPOS", count: 12 },
  puerto_rojo: { nombre: "TOMÁS HERRERA", count: 1 },
  "memoria.lata": { nombre: "CLARA FUENTES", count: 7 },
};

const NOMBRES_EXTRA = [
  "ALEJANDRO CODOÑER",
  "LUCÍA FERNÁNDEZ",
  "MIGUEL ÁNGEL TORRES",
  "CARMEN GIL",
  "ROBERTO SAINZ",
  "PATRICIA LEÓN",
  "DANIEL PRIETO",
  "BEATRIZ MORALES",
];

/** Conteos variados para usuarios sin ficha fija. */
const COUNT_PATTERNS = [0, 0, 1, 1, 2, 3, 4, 5, 8, 10];

/** Quita @ y normaliza para URL / lookup. */
export function slugUsername(username: string) {
  return username.replace(/^@/, "").trim().toLowerCase();
}

export function perfilHref(username: string) {
  return `/u/${encodeURIComponent(slugUsername(username))}`;
}

export function formatUsername(username: string) {
  const slug = slugUsername(username);
  return slug ? `@${slug}` : "@";
}

function hashSeed(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function perfilMeta(username: string): { nombre: string; count: number } {
  const fixed = PERFILES[username];
  if (fixed) return fixed;

  const h = hashSeed(username);
  return {
    nombre: NOMBRES_EXTRA[h % NOMBRES_EXTRA.length],
    count: COUNT_PATTERNS[h % COUNT_PATTERNS.length],
  };
}

type RetoRef = { numero: string; titulo: string; id?: string };

/**
 * Perfil mock: obras del usuario. participaciones === obras.length.
 */
export function getPerfilMock(
  usernameRaw: string,
  retosArchivo: RetoArchivo[] = [],
): PerfilData | null {
  const username = slugUsername(usernameRaw);
  if (!username) return null;

  const meta = perfilMeta(username);

  const retos: RetoRef[] =
    retosArchivo.length > 0
      ? retosArchivo.map((r) => ({
          id: r.id,
          numero: r.numero,
          titulo: r.titulo,
        }))
      : RETOS_FALLBACK;

  const obras: PerfilObra[] = [];
  const target = Math.min(meta.count, Math.max(retos.length, meta.count));

  if (target > 0 && retos.length > 0) {
    const pool = [...retos];
    // Mezcla determinista por usuario
    const h = hashSeed(username);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = (h + i * 17) % (i + 1);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const take = Math.min(target, pool.length);
    for (let i = 0; i < take; i++) {
      const reto = pool[i];
      const seed = `${reto.id ?? reto.numero}-${username}-obra`;
      const feed = generarFeedRetoMock(seed, 8);
      const frame = feed[i % feed.length];

      obras.push({
        ...frame,
        id: `${username}-obra-${reto.numero}`,
        username: formatUsername(username),
        imageUrl: frame.imageUrl,
        retoNumero: reto.numero,
        retoTitulo: reto.titulo,
      });
    }
  }

  return {
    username,
    nombreCompleto: meta.nombre,
    participaciones: obras.length,
    obras,
  };
}
