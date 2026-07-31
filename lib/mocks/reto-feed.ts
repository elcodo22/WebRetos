export type RetoFeedItem = {
  id: string;
  username: string;
  titulo: string;
  descripcion: string;
  imageUrl: string;
  videoUrl: string;
};

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

/**
 * Pósters verticales locales (formato cine ~2:3).
 */
const FRAMES_PELICULA = Array.from(
  { length: 28 },
  (_, i) => `/posters/poster-${String(i + 1).padStart(2, "0")}.png`,
);

/** Clip de ejemplo local para todas las miniaturas del mock. */
const SAMPLE_VIDEO = "/videos/six-men-getting-sick.mp4";

/**
 * Genera un feed inventado con frames estáticos y clips de muestra.
 */
export function generarFeedRetoMock(retoId: string, count = 40): RetoFeedItem[] {
  const offset = hashSeed(retoId) % FRAMES_PELICULA.length;

  return Array.from({ length: count }, (_, index) => {
    const frame = FRAMES_PELICULA[(offset + index) % FRAMES_PELICULA.length];
    return {
      id: `${retoId}-obra-${index}`,
      username: `@${USERNAMES[index % USERNAMES.length]}`,
      titulo: TITULOS[index % TITULOS.length],
      descripcion: DESCRIPCIONES[index % DESCRIPCIONES.length],
      imageUrl: frame,
      videoUrl: SAMPLE_VIDEO,
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
