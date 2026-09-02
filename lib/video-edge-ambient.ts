export type LateralColors = {
  left: string;
  right: string;
};

const SAMPLE_W = 48;
const SAMPLE_H = 27;
const LATERAL_STRIP = 4;

let sampleCanvas: HTMLCanvasElement | null = null;

function getSampleCanvas() {
  if (typeof document === "undefined") return null;
  if (!sampleCanvas) sampleCanvas = document.createElement("canvas");
  return sampleCanvas;
}

function rgbToCss(r: number, g: number, b: number) {
  return `rgb(${r}, ${g}, ${b})`;
}

function averageStrip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const { data, width, height } = ctx.getImageData(x, y, w, h);
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const i = (row * width + col) * 4;
      const alpha = data[i + 3] ?? 0;
      if (alpha < 8) continue;
      r += data[i] ?? 0;
      g += data[i + 1] ?? 0;
      b += data[i + 2] ?? 0;
      count += 1;
    }
  }

  if (count === 0) return "rgb(0, 0, 0)";
  return rgbToCss(
    Math.round(r / count),
    Math.round(g / count),
    Math.round(b / count),
  );
}

/** Dibuja el medio en 16:9 con contain (respeta barras negras laterales). */
function drawMediaContained(
  ctx: CanvasRenderingContext2D,
  media: HTMLVideoElement | HTMLImageElement,
  destW: number,
  destH: number,
) {
  const vw =
    "videoWidth" in media ? media.videoWidth : media.naturalWidth;
  const vh =
    "videoHeight" in media ? media.videoHeight : media.naturalHeight;
  if (!vw || !vh) return false;

  const destAspect = destW / destH;
  const srcAspect = vw / vh;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, destW, destH);

  let dw = destW;
  let dh = destH;
  let dx = 0;
  let dy = 0;

  if (srcAspect > destAspect) {
    dh = destW / srcAspect;
    dy = (destH - dh) / 2;
  } else {
    dw = destH * srcAspect;
    dx = (destW - dw) / 2;
  }

  ctx.drawImage(media, 0, 0, vw, vh, dx, dy, dw, dh);
  return true;
}

/** Muestra solo los laterales izquierdo y derecho del frame visible. */
export function sampleMediaLateralColors(
  media: HTMLVideoElement | HTMLImageElement,
): LateralColors | null {
  const canvas = getSampleCanvas();
  if (!canvas) return null;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  if ("readyState" in media && media.readyState < 2) return null;
  if ("complete" in media && !media.complete) return null;

  canvas.width = SAMPLE_W;
  canvas.height = SAMPLE_H;

  if (!drawMediaContained(ctx, media, SAMPLE_W, SAMPLE_H)) return null;

  const left = averageStrip(ctx, 0, 0, LATERAL_STRIP, SAMPLE_H);
  const right = averageStrip(
    ctx,
    SAMPLE_W - LATERAL_STRIP,
    0,
    LATERAL_STRIP,
    SAMPLE_H,
  );

  return { left, right };
}

export function lateralColorsToBackground(colors: LateralColors) {
  const { left, right } = colors;
  return [
    `radial-gradient(90% 140% at 0% 50%, ${left} 0%, transparent 68%)`,
    `radial-gradient(90% 140% at 100% 50%, ${right} 0%, transparent 68%)`,
    `linear-gradient(to right, ${left} 0%, transparent 42%, transparent 58%, ${right} 100%)`,
  ].join(", ");
}

export const DEFAULT_EDGE_AMBIENT_BG = "rgb(0, 0, 0)";
