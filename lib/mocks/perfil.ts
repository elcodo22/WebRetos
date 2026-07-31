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

const NOMBRES: Record<string, string> = {
  "luna.verde": "LUNA VERDE",
  pixelmar: "MARÍA PIXELS",
  cinta_vhs: "CARLOS VHS",
  "neon.rio": "NEÓN RÍO",
  sombra_azul: "SOMBRA AZUL",
  faro_roto: "FARO ROTO",
  "vinilo.crudo": "VINILO CRUDO",
  "astro.papel": "ASTRO PAPEL",
  trennocturno: "TREN NOCTURNO",
  cristal_humo: "CRISTAL HUMO",
  "mar.cobre": "MAR COBRE",
  relojvacio: "RELOJ VACÍO",
  "bosque.acido": "BOSQUE ÁCIDO",
  puerto_rojo: "PUERTO ROJO",
  "memoria.lata": "MEMORIA LATA",
};

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

type RetoRef = { numero: string; titulo: string; id?: string };

/**
 * Perfil mock: obras del usuario. El texto del póster usa el título del reto.
 */
export function getPerfilMock(
  usernameRaw: string,
  retosArchivo: RetoArchivo[] = [],
): PerfilData | null {
  const username = slugUsername(usernameRaw);
  if (!username) return null;

  const retos: RetoRef[] =
    retosArchivo.length > 0
      ? retosArchivo.map((r) => ({
          id: r.id,
          numero: r.numero,
          titulo: r.titulo,
        }))
      : RETOS_FALLBACK;

  const obras: PerfilObra[] = [];

  for (let r = 0; r < retos.length; r++) {
    const reto = retos[r];
    const seed = reto.id ?? `perfil-${reto.numero}-${username}`;
    const feed = generarFeedRetoMock(seed, 15);
    const match = feed.find(
      (item) => slugUsername(item.username) === username,
    );
    if (!match) continue;

    obras.push({
      ...match,
      id: `${username}-obra-${reto.numero}`,
      username: formatUsername(username),
      retoNumero: reto.numero,
      retoTitulo: reto.titulo,
    });
  }

  if (obras.length === 0) {
    const feed = generarFeedRetoMock(`perfil-fallback-${username}`, 8);
    for (let i = 0; i < feed.length; i++) {
      const reto = retos[i % retos.length];
      obras.push({
        ...feed[i],
        id: `${username}-obra-${i}`,
        username: formatUsername(username),
        retoNumero: reto.numero,
        retoTitulo: reto.titulo,
      });
    }
  }

  const nombreCompleto =
    NOMBRES[username] ??
    username.replace(/[._]/g, " ").toUpperCase();

  return {
    username,
    nombreCompleto,
    participaciones: Math.max(obras.length, 12) * 12 + obras.length,
    obras,
  };
}
