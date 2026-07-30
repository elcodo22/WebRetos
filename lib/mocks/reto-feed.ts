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
 * Fotogramas / backdrops reales de películas (CDN de TMDB).
 * Estáticos (no GIF).
 */
const FRAMES_PELICULA = [
  "https://image.tmdb.org/t/p/w500/8UlWHLMpgZm9bx6QYh0NFoq67TZ.jpg",
  "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
  "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
  "https://image.tmdb.org/t/p/w500/2uNW4WbgBXL25BAbXGLnLqX71Sw.jpg",
  "https://image.tmdb.org/t/p/w500/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg",
  "https://image.tmdb.org/t/p/w500/hZkgoQYus5vegHoetLkCJzb17zJ.jpg",
  "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
  "https://image.tmdb.org/t/p/w500/bOGkgRGdhrBYJSLpXaxhXVstddV.jpg",
  "https://image.tmdb.org/t/p/w500/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg",
  "https://image.tmdb.org/t/p/w500/iNh3BivHyg5sQRPP1KOkzguEX0H.jpg",
  "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
  "https://image.tmdb.org/t/p/w500/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg",
  "https://image.tmdb.org/t/p/w500/8Y43POKjjKDGI9MH89NW0NAzzp8.jpg",
  "https://image.tmdb.org/t/p/w500/1E5baAaEse26fej7uHcjOgEE2t2.jpg",
];

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
