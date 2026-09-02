import {
  FEED_THUMB_ASPECT,
  FEED_THUMB_FRAME_SECONDS,
} from "@/lib/feed-video-constants";

const MAX_CONCURRENT = 3;
const JPEG_QUALITY = 0.78;
const MAX_FRAME_WIDTH = 960;
const FILMSTRIP_MAX_FRAME_WIDTH = 220;
const FILMSTRIP_JPEG_QUALITY = 0.72;
const SEEK_TIMEOUT_MS = 5000;
/** Recorte extra para eliminar letterbox incrustado en el vídeo. */
const COVER_ZOOM = 1.08;
/** Invalida miniaturas cacheadas cuando cambia la lógica o el archivo de vídeo. */
const FRAME_CACHE_VERSION = "v4";

type FrameKey = string;

const frameCache = new Map<FrameKey, string>();
const pending = new Map<FrameKey, Promise<string>>();
const listeners = new Map<FrameKey, Set<(src: string) => void>>();
const waitQueue: Array<() => void> = [];
let activeJobs = 0;

type VideoSession = {
  video: HTMLVideoElement;
  ready: Promise<void>;
  chain: Promise<void>;
};

const sessions = new Map<string, VideoSession>();

function thumbCacheKey(videoUrl: string): FrameKey {
  return `${videoUrl}@${FRAME_CACHE_VERSION}@thumb`;
}

function frameKey(videoUrl: string, seconds: number): FrameKey {
  return `${videoUrl}@${FRAME_CACHE_VERSION}@cover16x9@${seconds.toFixed(2)}`;
}

function notify(key: FrameKey, src: string) {
  const subs = listeners.get(key);
  if (!subs) return;
  for (const fn of subs) fn(src);
}

function clampSeekTime(video: HTMLVideoElement, seconds: number) {
  const duration = video.duration;
  if (!Number.isFinite(duration) || duration <= 0) {
    return Math.max(0, seconds);
  }
  return Math.min(seconds, Math.max(0, duration - 0.05));
}

function thumbSeekTimes(video: HTMLVideoElement): number[] {
  const duration = video.duration;
  const preferred = FEED_THUMB_FRAME_SECONDS;

  if (!Number.isFinite(duration) || duration <= 0) {
    return [preferred, 1, 3, 5, 8];
  }

  const fromDuration = [0.08, 0.14, 0.22, 0.32, 0.45].map((ratio) =>
    clampSeekTime(video, duration * ratio),
  );

  return [...new Set([preferred, ...fromDuration])];
}

function isLowDetailFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): boolean {
  const step = Math.max(4, Math.floor(Math.min(width, height) / 28));
  const { data } = ctx.getImageData(0, 0, width, height);

  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const lum =
        0.299 * (data[i] ?? 0) +
        0.587 * (data[i + 1] ?? 0) +
        0.114 * (data[i + 2] ?? 0);
      sum += lum;
      sumSq += lum * lum;
      count += 1;
    }
  }

  if (count === 0) return true;

  const mean = sum / count;
  const variance = Math.max(0, sumSq / count - mean * mean);
  const std = Math.sqrt(variance);

  if (std < 8) return true;
  if (mean > 235 && std < 22) return true;
  if (mean < 12 && std < 22) return true;
  return false;
}

function captureFrameFromVideo(
  video: HTMLVideoElement,
  maxWidth: number,
  jpegQuality: number,
): string {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) {
    throw new Error("video dimensions unavailable");
  }

  const videoAspect = vw / vh;
  let sx = 0;
  let sy = 0;
  let sw = vw;
  let sh = vh;

  if (videoAspect > FEED_THUMB_ASPECT) {
    sh = vh;
    sw = vh * FEED_THUMB_ASPECT;
    sx = (vw - sw) / 2;
  } else if (videoAspect < FEED_THUMB_ASPECT) {
    sw = vw;
    sh = vw / FEED_THUMB_ASPECT;
    sy = (vh - sh) / 2;
  }

  const zoomW = sw / COVER_ZOOM;
  const zoomH = sh / COVER_ZOOM;
  sx += (sw - zoomW) / 2;
  sy += (sh - zoomH) / 2;
  sw = zoomW;
  sh = zoomH;

  const scale = Math.min(1, maxWidth / sw);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("canvas unavailable");
  }
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  if (isLowDetailFrame(ctx, canvas.width, canvas.height)) {
    throw new Error("blank frame");
  }

  return canvas.toDataURL("image/jpeg", jpegQuality);
}

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function waitForVideoData(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("video data unavailable"));
    };
    const cleanup = () => {
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("loadeddata", onReady, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

async function primeVideoDecoder(video: HTMLVideoElement): Promise<void> {
  try {
    await video.play();
    await waitForNextPaint();
    video.pause();
  } catch {
    /* Autoplay bloqueado: el seek puede bastar. */
  }
}

function seekVideo(video: HTMLVideoElement, seconds: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const target = clampSeekTime(video, seconds);
    let settled = false;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      if (error) reject(error);
      else resolve();
    };

    const onSeeked = () => finish();
    const onError = () => finish(new Error("seek failed"));
    const timeoutId = window.setTimeout(
      () => finish(new Error("seek timeout")),
      SEEK_TIMEOUT_MS,
    );

    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError, { once: true });

    void waitForVideoData(video)
      .then(() => {
        if (Math.abs(video.currentTime - target) < 0.04) {
          finish();
          return;
        }
        video.currentTime = target;
      })
      .catch((error) => finish(error instanceof Error ? error : new Error("seek failed")));
  });
}

function destroySession(videoUrl: string) {
  const session = sessions.get(videoUrl);
  if (!session) return;
  session.video.removeAttribute("src");
  session.video.load();
  sessions.delete(videoUrl);
}

function createVideoSession(videoUrl: string): VideoSession {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.crossOrigin = "anonymous";

  const ready = new Promise<void>((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      destroySession(videoUrl);
      reject(new Error("video load failed"));
    };
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("loadedmetadata", onReady, { once: true });
    video.addEventListener("error", onError, { once: true });
    video.src = videoUrl;
  });

  return { video, ready, chain: Promise.resolve() };
}

function getVideoSession(videoUrl: string): VideoSession {
  const existing = sessions.get(videoUrl);
  if (existing) return existing;

  const session = createVideoSession(videoUrl);
  sessions.set(videoUrl, session);
  return session;
}

function enqueueSessionJob<T>(
  videoUrl: string,
  job: (video: HTMLVideoElement) => Promise<T>,
): Promise<T> {
  const session = getVideoSession(videoUrl);
  const run = session.chain.then(async () => {
    await session.ready;
    return job(session.video);
  });
  session.chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function captureAtTime(
  video: HTMLVideoElement,
  seconds: number,
  maxWidth: number,
  jpegQuality: number,
): Promise<string> {
  await waitForVideoData(video);
  await seekVideo(video, seconds);
  await waitForVideoData(video);
  await waitForNextPaint();
  return captureFrameFromVideo(video, maxWidth, jpegQuality);
}

async function captureBestThumb(
  video: HTMLVideoElement,
  maxWidth: number,
  jpegQuality: number,
): Promise<string> {
  await waitForVideoData(video);
  await primeVideoDecoder(video);

  const times = thumbSeekTimes(video);
  let lastError: unknown;

  for (const seconds of times) {
    try {
      return await captureAtTime(video, seconds, maxWidth, jpegQuality);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("frame extraction failed");
}

function storeFrame(key: FrameKey, src: string) {
  frameCache.set(key, src);
  notify(key, src);
  return src;
}

export function getCachedFeedVideoFrame(
  videoUrl: string,
  _seconds = FEED_THUMB_FRAME_SECONDS,
): string | null {
  return frameCache.get(thumbCacheKey(videoUrl)) ?? null;
}

export function subscribeFeedVideoFrame(
  videoUrl: string,
  onFrame: (src: string) => void,
  _seconds = FEED_THUMB_FRAME_SECONDS,
): () => void {
  const key = thumbCacheKey(videoUrl);
  const cached = frameCache.get(key);
  if (cached) {
    onFrame(cached);
    return () => {};
  }

  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(onFrame);

  return () => {
    set?.delete(onFrame);
    if (set?.size === 0) listeners.delete(key);
  };
}

function drainQueue() {
  while (activeJobs < MAX_CONCURRENT && waitQueue.length > 0) {
    const next = waitQueue.shift();
    next?.();
  }
}

function runLegacyExtraction(
  videoUrl: string,
  key: FrameKey,
  maxWidth = MAX_FRAME_WIDTH,
  jpegQuality = JPEG_QUALITY,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const startJob = () => {
      activeJobs += 1;
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      video.crossOrigin = "anonymous";

      const cleanup = () => {
        video.removeAttribute("src");
        video.load();
        activeJobs -= 1;
        drainQueue();
      };

      const fail = (error?: unknown) => {
        cleanup();
        reject(error ?? new Error("frame extraction failed"));
      };

      const succeed = (src: string) => {
        cleanup();
        resolve(storeFrame(key, src));
      };

      video.addEventListener("error", () => fail(), { once: true });
      video.addEventListener(
        "loadedmetadata",
        () => {
          void captureBestThumb(video, maxWidth, jpegQuality)
            .then(succeed)
            .catch(fail);
        },
        { once: true },
      );

      video.src = videoUrl;
    };

    if (activeJobs < MAX_CONCURRENT) {
      startJob();
    } else {
      waitQueue.push(startJob);
    }
  });
}

async function extractThumb(
  videoUrl: string,
  maxWidth: number,
  jpegQuality: number,
): Promise<string> {
  const key = thumbCacheKey(videoUrl);
  const cached = frameCache.get(key);
  if (cached) return cached;

  try {
    const src = await enqueueSessionJob(videoUrl, (video) =>
      captureBestThumb(video, maxWidth, jpegQuality),
    );
    return storeFrame(key, src);
  } catch {
    destroySession(videoUrl);
    return runLegacyExtraction(videoUrl, key, maxWidth, jpegQuality);
  }
}

async function extractFrame(
  videoUrl: string,
  seconds: number,
  maxWidth: number,
  jpegQuality: number,
): Promise<string> {
  const key = frameKey(videoUrl, seconds);
  const cached = frameCache.get(key);
  if (cached) return cached;

  try {
    const src = await enqueueSessionJob(videoUrl, async (video) => {
      await waitForVideoData(video);
      await primeVideoDecoder(video);
      return captureAtTime(video, seconds, maxWidth, jpegQuality);
    });
    return storeFrame(key, src);
  } catch {
    destroySession(videoUrl);
    return runLegacyExtraction(videoUrl, key, maxWidth, jpegQuality);
  }
}

/** Extrae un frame estático del vídeo (sin reproducir en la UI). */
export function requestFeedVideoFrame(
  videoUrl: string,
  _seconds = FEED_THUMB_FRAME_SECONDS,
): Promise<string> {
  const key = thumbCacheKey(videoUrl);
  const cached = frameCache.get(key);
  if (cached) return Promise.resolve(cached);

  const inflight = pending.get(key);
  if (inflight) return inflight;

  const promise = extractThumb(videoUrl, MAX_FRAME_WIDTH, JPEG_QUALITY);
  pending.set(key, promise);
  void promise.finally(() => {
    pending.delete(key);
  });
  return promise;
}

type FilmstripOptions = {
  onFrame?: (index: number, src: string) => void;
};

/** Extrae varios frames reutilizando el mismo vídeo (más rápido para la tira). */
export async function requestFilmstripFrames(
  videoUrl: string,
  times: number[],
  options: FilmstripOptions = {},
): Promise<string[]> {
  const { onFrame } = options;
  const results: string[] = new Array(times.length);

  for (let index = 0; index < times.length; index += 1) {
    const seconds = times[index]!;
    try {
      const src = await extractFrame(
        videoUrl,
        seconds,
        FILMSTRIP_MAX_FRAME_WIDTH,
        FILMSTRIP_JPEG_QUALITY,
      );
      results[index] = src;
      onFrame?.(index, src);
    } catch {
      results[index] = "";
    }
  }

  return results;
}
