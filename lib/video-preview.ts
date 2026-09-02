export const PREVIEW_LOOP_SECONDS = 7;

export function previewLoopRange(duration: number) {
  if (!Number.isFinite(duration) || duration <= 0) {
    return { start: 0, end: PREVIEW_LOOP_SECONDS };
  }
  if (duration <= PREVIEW_LOOP_SECONDS) {
    return { start: 0, end: duration };
  }
  const start = (duration - PREVIEW_LOOP_SECONDS) / 2;
  return { start, end: start + PREVIEW_LOOP_SECONDS };
}

export function seekPreviewLoopStart(video: HTMLVideoElement) {
  const { start } = previewLoopRange(video.duration);
  try {
    video.currentTime = start;
  } catch {
    /* ignore seek while loading */
  }
}

export function startPreviewPlayback(
  video: HTMLVideoElement,
  initialTime?: number,
) {
  video.muted = true;
  video.loop = true;

  const applyTime = () => {
    if (initialTime != null && Number.isFinite(initialTime) && initialTime > 0) {
      try {
        video.currentTime = initialTime;
      } catch {
        seekPreviewLoopStart(video);
      }
    } else {
      seekPreviewLoopStart(video);
    }
    void video.play().catch(() => {
      /* autoplay bloqueado */
    });
  };

  if (video.readyState >= 1) {
    applyTime();
  } else {
    video.addEventListener("loadedmetadata", applyTime, { once: true });
  }
}

export function attachPreviewLoopHandlers(video: HTMLVideoElement) {
  const onTimeUpdate = () => {
    const { start, end } = previewLoopRange(video.duration);
    if (video.currentTime >= end - 0.05) {
      video.currentTime = start;
      void video.play().catch(() => {});
    }
  };

  const onEnded = () => {
    seekPreviewLoopStart(video);
    void video.play().catch(() => {});
  };

  video.addEventListener("timeupdate", onTimeUpdate);
  video.addEventListener("ended", onEnded);

  return () => {
    video.removeEventListener("timeupdate", onTimeUpdate);
    video.removeEventListener("ended", onEnded);
  };
}

export function getRetoPlayerTargetRect() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return { left: 0, top: 0, width: vw, height: vh };
}

export function domRectToFrame(rect: DOMRect) {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

export type VideoStageFrame = ReturnType<typeof getRetoPlayerTargetRect>;

export const PROFILE_EXPAND_MS = 720;
export const PROFILE_ZOOM_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";
export const PROFILE_ZOOM_TO_TRANSFORM = "translate3d(0, 0, 0) scale(1)";

/** Transform inicial para un zoom suave desde miniatura → reproductor (FLIP). */
export function profileZoomFromTransform(
  from: VideoStageFrame,
  to: VideoStageFrame,
) {
  const fromCx = from.left + from.width / 2;
  const fromCy = from.top + from.height / 2;
  const toCx = to.left + to.width / 2;
  const toCy = to.top + to.height / 2;
  const scale = from.width / to.width;
  const dx = fromCx - toCx;
  const dy = fromCy - toCy;
  return `translate3d(${dx}px, ${dy}px, 0) scale(${scale})`;
}
