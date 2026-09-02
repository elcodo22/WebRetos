export type RetoFeedItem = {
  id: string;
  username: string;
  /** Nombre visible del autor (sin @). */
  displayName?: string;
  titulo: string;
  descripcion: string;
  videoUrl: string;
  videoUid?: string;
  /** Imágenes de la ficha de descripción. */
  imagenes?: string[];
};

export const OBRA_DESC_DEFAULT_IMAGES = [
  "/images/obra-desc-1.png",
  "/images/obra-desc-2.png",
] as const;

const DISPLAY_NAMES = [
  "Luna Verde",
  "Pixel Mar",
  "Cinta VHS",
  "Neon Río",
  "Sombra Azul",
  "Faro Roto",
  "Vinilo Crudo",
  "Astro Papel",
  "Tren Nocturno",
  "Cristal Humo",
  "Mar Cobre",
  "Reloj Vacío",
  "Bosque Ácido",
  "Puerto Rojo",
  "Memoria Lata",
];

const USERNAMES = [
  "luna.verde",
  "pixelmar",
  "cinta_vhs",
  "neon.rio",
  "sombra_azul",
  "faro_roto",
  "vinilo.crudo",
  "astro.papel",
  "trennocturno",
  "cristal_humo",
  "mar.cobre",
  "relojvacio",
  "bosque.acido",
  "puerto_rojo",
  "memoria.lata",
];

const TITULOS = [
  "Una vez soñé",
  "Calle sin reloj",
  "Humedad eléctrica",
  "Mapa de ceniza",
  "Ventana invertida",
  "Eco de garaje",
  "Luz de servicio",
  "Cinta olvidada",
  "Puerto interno",
  "Noche de ensayo",
];

const DESCRIPCIONES = [
  "persona con la que tienes una relación de afecto, confianza y respeto mutuo, sin que existan lazos familiares",
  "registro de un trayecto corto filmado sin cortes, con sonido ambiente y poca luz",
  "pieza hecha con restos de archivo, reencuadres y una voz que no termina la frase",
  "ejercicio de observación: un mismo lugar a tres horas distintas del día",
  "montaje rápido a partir de planos fallidos que acabaron siendo el material bueno",
];

/** Clips de ejemplo locales para el mock (alternados en el feed). */
const SAMPLE_VIDEOS = [
  "/videos/videoplayback.mp4?v=4",
  "/videos/videoplayback-2.mp4?v=4",
  "/videos/videoplayback-3.mp4?v=4",
] as const;

/**
 * Genera un feed inventado con clips de muestra (miniatura = frame del vídeo).
 */
export function generarFeedRetoMock(retoId: string, count = 40): RetoFeedItem[] {
  const offset = hashSeed(retoId) % USERNAMES.length;

  return Array.from({ length: count }, (_, index) => {
    const userIndex = (offset + index) % USERNAMES.length;
    return {
      id: `${retoId}-obra-${index}`,
      username: `@${USERNAMES[userIndex]}`,
      displayName: DISPLAY_NAMES[userIndex],
      titulo: TITULOS[index % TITULOS.length],
      descripcion: DESCRIPCIONES[index % DESCRIPCIONES.length],
      videoUrl: SAMPLE_VIDEOS[index % SAMPLE_VIDEOS.length],
      imagenes:
        index === 0 ? [] : [...OBRA_DESC_DEFAULT_IMAGES],
    };
  });
}

function hashSeed(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}
