import type { RetoArchivo } from "@/lib/supabase/retos";
import { RETO_DESCRIPCION_EJEMPLO } from "@/lib/reto-descripcion";

/**
 * Retos ficticios para poblar el archivo mientras la base está vacía.
 * Cuando haya suficientes retos reales, elimina esta importación en app/page.tsx.
 */

const TITULOS = [
  "Neón Bosque Nocturno",
  "Puerto Silencio Rojo",
  "Cristal Memoria Ácida",
  "Sombra Litoral Herido",
  "Tren Fantasma Fugaz",
  "Astro Cemento Roto",
  "Papel Ceniza Volátil",
  "Estación Reloj Vacío",
  "Faro Vidrio Muerto",
  "Río Mercurio Espeso",
  "Cielo Cobre Ardiente",
  "Vinilo Túnel Álgido",
];

const DESCRIPCIONES = TITULOS.map(() => RETO_DESCRIPCION_EJEMPLO);

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function formatearFecha(fecha: Date) {
  return `${fecha.getDate()}, ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
}

export function generarRetosArchivoMock(): RetoArchivo[] {
  const base = new Date("2025-01-15T12:00:00Z").getTime();
  const dia = 24 * 60 * 60 * 1000;
  const espaciado = 42;

  return TITULOS.map((titulo, index) => {
    const fecha = new Date(base + index * espaciado * dia);
    return {
      id: `mock-${index}`,
      titulo,
      descripcion: DESCRIPCIONES[index % DESCRIPCIONES.length],
      numero: "00",
      fechaLabel: formatearFecha(fecha),
      fechaOrden: fecha.getTime(),
    };
  });
}
