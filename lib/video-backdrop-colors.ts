export type VideoBackdropColors = {
  primary: string;
  secondary: string;
  accent: string;
};

const FALLBACK: VideoBackdropColors = {
  primary: "rgb(28, 28, 32)",
  secondary: "rgb(18, 18, 22)",
  accent: "rgb(38, 36, 44)",
};

function rgb(r: number, g: number, b: number) {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function averageRegion(
  data: Uint8ClampedArray,
  width: number,
  xStart: number,
  xEnd: number,
) {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (let y = 0; y < data.length / (width * 4); y += 1) {
    for (let x = xStart; x < xEnd; x += 1) {
      const i = (y * width + x) * 4;
      const alpha = (data[i + 3] ?? 0) / 255;
      if (alpha < 0.12) continue;
      r += data[i] ?? 0;
      g += data[i + 1] ?? 0;
      b += data[i + 2] ?? 0;
      count += 1;
    }
  }

  if (count === 0) return { r: 24, g: 24, b: 28 };
  return { r: r / count, g: g / count, b: b / count };
}

/** Extrae una paleta suave del frame actual (sin mostrar el vídeo). */
export function sampleVideoBackdropColors(
  video: HTMLVideoElement,
): VideoBackdropColors {
  if (!video.videoWidth || !video.videoHeight) return FALLBACK;

  const canvas = document.createElement("canvas");
  const width = 24;
  const height = 14;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return FALLBACK;

  try {
    ctx.drawImage(video, 0, 0, width, height);
  } catch {
    return FALLBACK;
  }

  const { data } = ctx.getImageData(0, 0, width, height);
  const third = Math.floor(width / 3);

  const left = averageRegion(data, width, 0, third);
  const center = averageRegion(data, width, third, third * 2);
  const right = averageRegion(data, width, third * 2, width);

  return {
    primary: rgb(center.r, center.g, center.b),
    secondary: rgb(left.r, left.g, left.b),
    accent: rgb(right.r, right.g, right.b),
  };
}

export function backdropGradient(colors: VideoBackdropColors) {
  return [
    `radial-gradient(ellipse 85% 70% at 18% 38%, color-mix(in srgb, ${colors.secondary} 72%, transparent) 0%, transparent 72%)`,
    `radial-gradient(ellipse 80% 65% at 82% 62%, color-mix(in srgb, ${colors.accent} 68%, transparent) 0%, transparent 70%)`,
    `linear-gradient(145deg, ${colors.secondary} 0%, ${colors.primary} 48%, ${colors.accent} 100%)`,
  ].join(", ");
}

export const VIDEO_BACKDROP_FALLBACK = FALLBACK;
