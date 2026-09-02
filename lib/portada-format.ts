import type { CSSProperties } from "react";

/** Contenedor de miniatura: relación fija 16:9, mismo tamaño para cualquier vídeo. */
export const VIDEO_THUMBNAIL_CLASS =
  "aspect-video w-full overflow-hidden rounded-none";

/** Imagen recortada: cubre todo el rectángulo sin bandas laterales. */
export const VIDEO_THUMBNAIL_IMG_CLASS =
  "absolute left-1/2 top-1/2 min-h-full min-w-full -translate-x-1/2 -translate-y-1/2 object-cover object-center";

/** Celda del feed de retos: ocupa todo el track del grid. */
export const FEED_THUMB_ITEM_CLASS = "h-full w-full min-h-0 min-w-0 overflow-hidden";

/** Contenedor de miniatura dentro de una celda con altura fijada. */
export const FEED_THUMB_FILL_CLASS =
  "relative h-full w-full overflow-hidden rounded-none";

/** Grid del feed de retos (columnas vía style). */
export const RETO_FEED_GRID_CLASS =
  "m-0 box-border grid list-none content-start items-stretch";

export const RETO_FEED_COLUMNS = 4;
/** Gap estrictamente uniforme en todas las direcciones. */
export const RETO_FEED_GAP_PX = 16;
export const RETO_FEED_THUMB_RATIO = 9 / 16;

export type RetoFeedGridMetrics = {
  gap: number;
  cellW: number;
  cellH: number;
  rows: number;
  gridW: number;
  gridH: number;
  tileW: number;
  tileH: number;
};

/**
 * viewport = cols·cellW + (cols+1)·gap
 * → mismo hueco en bordes y entre miniaturas.
 */
export function computeRetoFeedGridMetrics(
  itemCount: number,
  viewportWidth: number,
): RetoFeedGridMetrics {
  const gap = RETO_FEED_GAP_PX;
  const cols = RETO_FEED_COLUMNS;

  const cellW = Math.floor((viewportWidth - (cols + 1) * gap) / cols);
  const cellH = Math.floor(cellW * RETO_FEED_THUMB_RATIO);
  const rows = Math.ceil(itemCount / cols);

  const gridW = cols * cellW + (cols - 1) * gap;
  const gridH = rows * cellH + Math.max(0, rows - 1) * gap;
  const tileW = cols * (cellW + gap);
  const tileH = rows * (cellH + gap);

  return {
    gap,
    cellW,
    cellH,
    rows,
    gridW,
    gridH,
    tileW,
    tileH,
  };
}

export function retoFeedGridStyle(metrics: RetoFeedGridMetrics): CSSProperties {
  const gap = metrics.gap;
  return {
    width: `${metrics.gridW}px`,
    marginLeft: `${gap}px`,
    marginTop: `${gap}px`,
    gridTemplateColumns: `repeat(${RETO_FEED_COLUMNS}, ${metrics.cellW}px)`,
    gridTemplateRows: `repeat(${metrics.rows}, ${metrics.cellH}px)`,
    columnGap: `${gap}px`,
    rowGap: `${gap}px`,
  };
}

export function retoFeedCellStyle(metrics: RetoFeedGridMetrics): CSSProperties {
  return {
    width: `${metrics.cellW}px`,
    height: `${metrics.cellH}px`,
  };
}

/** @deprecated Usar computeRetoFeedGridMetrics */
export function computeRetoFeedTileSize(
  itemCount: number,
  viewportWidth: number,
): { w: number; h: number } {
  const { tileW, tileH } = computeRetoFeedGridMetrics(itemCount, viewportWidth);
  return { w: tileW, h: tileH };
}

/** @deprecated Usar RETO_FEED_GAP_PX */
export const RETO_FEED_SPACE_PX = RETO_FEED_GAP_PX;

/** @deprecated Usar VIDEO_THUMBNAIL_CLASS */
export const PORTADA_IMAGE_CLASS = VIDEO_THUMBNAIL_CLASS;
