"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type TransitionEvent,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import type { RetoFeedItem } from "@/lib/mocks/reto-feed";
import type { PerfilObra } from "@/lib/mocks/perfil";
import {
  isOwnUsername,
  perfilHref,
  viewerUsernameFromUser,
} from "@/lib/mocks/perfil";
import { AuthRequiredPopup } from "@/components/auth/auth-required-popup";
import { saveObraToCaja } from "@/lib/perfil-caja";
import {
  RetoVideoThumbnailStrip,
  type MediaSelection,
} from "@/components/reto/reto-video-thumbnail-strip";
import { RetoVideoViewCursor } from "@/components/reto/reto-video-view-cursor";
import {
  attachPreviewLoopHandlers,
  domRectToFrame,
  getRetoPlayerTargetRect,
  PROFILE_EXPAND_MS,
  PROFILE_ZOOM_EASING,
  PROFILE_ZOOM_TO_TRANSFORM,
  profileZoomFromTransform,
  seekPreviewLoopStart,
  startPreviewPlayback,
  type VideoStageFrame,
} from "@/lib/video-preview";
import {
  RETO_DESCRIPCION_CLASS_VIDEO,
  RETO_TITULO_CLASS,
} from "@/lib/reto-descripcion";
import { GeistMono } from "geist/font/mono";
import {
  DEFAULT_EDGE_AMBIENT_BG,
  lateralColorsToBackground,
  sampleMediaLateralColors,
} from "@/lib/video-edge-ambient";

function mediaPageStride(root: HTMLElement) {
  const gap = Number.parseFloat(getComputedStyle(root).rowGap || "0") || 0;
  return root.clientHeight + gap;
}

function mediaIndexFromScrollTop(root: HTMLElement, count: number) {
  const stride = mediaPageStride(root);
  if (stride <= 0 || count <= 0) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(root.scrollTop / stride)));
}

function mediaScrollTopForIndex(root: HTMLElement, index: number) {
  return index * mediaPageStride(root);
}

type WebKitVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
};

function isVideoFullscreen(video: HTMLVideoElement) {
  const webkitVideo = video as WebKitVideo;
  return (
    document.fullscreenElement === video ||
    webkitVideo.webkitDisplayingFullscreen === true
  );
}

async function openNativeVideoPlayer(video: HTMLVideoElement) {
  video.pause();
  try {
    video.currentTime = 0;
  } catch {
    /* ignore seek while loading */
  }
  video.loop = false;
  video.muted = false;
  video.controls = true;

  const webkitVideo = video as WebKitVideo;
  if (typeof webkitVideo.webkitEnterFullscreen === "function") {
    try {
      await video.play();
    } catch {
      /* el usuario puede pulsar play en los controles nativos */
    }
    webkitVideo.webkitEnterFullscreen();
    return true;
  }

  if (typeof video.requestFullscreen === "function") {
    try {
      const fullscreenPromise = video.requestFullscreen();
      void video.play().catch(() => {
        /* el usuario puede pulsar play en los controles nativos */
      });
      await fullscreenPromise;
      return isVideoFullscreen(video);
    } catch {
      return false;
    }
  }

  return false;
}

function resetNativeVideoPlayer(video: HTMLVideoElement) {
  video.controls = false;
  video.pause();
  resetPreviewVideo(video);
}

function resetPreviewVideo(video: HTMLVideoElement) {
  video.pause();
  seekPreviewLoopStart(video);
}

function resumePreviewAfterPlayer(video: HTMLVideoElement) {
  video.controls = false;
  video.muted = true;
  video.loop = true;

  const playPreview = () => {
    void video.play().catch(() => {});
  };

  seekPreviewLoopStart(video);
  if (video.readyState >= 2) {
    playPreview();
  } else {
    video.addEventListener("seeked", playPreview, { once: true });
    video.addEventListener("loadeddata", playPreview, { once: true });
  }
}

type RetoVideoPlayerProps = {
  item: RetoFeedItem;
  items?: RetoFeedItem[];
  onChangeItem?: (item: RetoFeedItem) => void;
  retoNumero: string;
  retoTitulo: string;
  retoDescripcion?: string;
  retoId?: string;
  user?: User | null;
  onClose: () => void;
  skipEnterFade?: boolean;
  profileEntry?: { fromRect: DOMRect; currentTime: number } | null;
};

export function RetoVideoPlayer({
  item,
  retoNumero,
  retoTitulo,
  retoDescripcion,
  retoId,
  user = null,
  onClose,
  skipEnterFade = false,
  profileEntry = null,
}: RetoVideoPlayerProps) {
  const fromProfile = profileEntry != null;
  const profileResumeTime = profileEntry?.currentTime;

  const videoRef = useRef<HTMLVideoElement>(null);
  const videoSectionRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cinemaRef = useRef<HTMLDivElement>(null);
  const wheelLockRef = useRef(false);
  const initialTimeAppliedRef = useRef(false);
  const returningFromPlayerRef = useRef(false);

  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(skipEnterFade || fromProfile);
  const [showChrome, setShowChrome] = useState(!fromProfile);
  const [expandComplete, setExpandComplete] = useState(!fromProfile);
  const [targetFrame, setTargetFrame] = useState<VideoStageFrame | null>(() => {
    if (!fromProfile) return null;
    return getRetoPlayerTargetRect();
  });
  const [zoomTransform, setZoomTransform] = useState(() => {
    if (!fromProfile || !profileEntry) return PROFILE_ZOOM_TO_TRANSFORM;
    const to = getRetoPlayerTargetRect();
    const from = domRectToFrame(profileEntry.fromRect);
    return profileZoomFromTransform(from, to);
  });
  const [zoomAnimating, setZoomAnimating] = useState(false);
  const [backdropReady, setBackdropReady] = useState(!fromProfile);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [activeMedia, setActiveMedia] = useState<MediaSelection>("video");
  const [authPopup, setAuthPopup] = useState(false);
  const [ambientBackground, setAmbientBackground] = useState(
    DEFAULT_EDGE_AMBIENT_BG,
  );

  const photos = useMemo(
    () => (item.imagenes ?? []).map((url) => url.trim()).filter(Boolean),
    [item.imagenes],
  );

  const mediaIds = useMemo(
    () => ["video", ...photos] as MediaSelection[],
    [photos],
  );

  const viewerUsername = useMemo(
    () => viewerUsernameFromUser(user),
    [user],
  );
  const resolvedRetoId = retoId ?? (item as PerfilObra).retoId;
  const canSave = !isOwnUsername(item.username, viewerUsername);
  const onVideoSlide = activeMedia === "video";
  const ambientImageUrl =
    !onVideoSlide && activeMedia !== "video" ? activeMedia : null;
  const isExpanding = fromProfile && !expandComplete;
  const showViewCursor = showChrome && !playerOpen && onVideoSlide;

  const handleSave = useCallback(() => {
    if (!canSave) return;
    if (!user) {
      setAuthPopup(true);
      return;
    }
    const obra: PerfilObra = {
      ...item,
      retoNumero,
      retoTitulo,
      retoDescripcion,
      retoId: resolvedRetoId,
    };
    saveObraToCaja(obra);
  }, [
    canSave,
    item,
    retoDescripcion,
    retoNumero,
    retoTitulo,
    resolvedRetoId,
    user,
  ]);

  const closePlayer = useCallback(() => {
    returningFromPlayerRef.current = true;
    setPlayerOpen(false);

    const video = videoRef.current;
    if (!video) return;

    const resume = () => resumePreviewAfterPlayer(video);
    requestAnimationFrame(() => {
      requestAnimationFrame(resume);
    });
  }, []);

  const openPlayer = useCallback(() => {
    const video = videoRef.current;
    if (!video || playerOpen) return;

    setPlayerOpen(true);

    void openNativeVideoPlayer(video).then((enteredFullscreen) => {
      if (!enteredFullscreen) {
        if (video) resetNativeVideoPlayer(video);
        returningFromPlayerRef.current = true;
        setPlayerOpen(false);
        if (video) resumePreviewAfterPlayer(video);
      }
    });
  }, [playerOpen]);

  const finishExpand = useCallback(() => {
    setShowChrome(true);
    setExpandComplete(true);
  }, []);

  const handleZoomTransitionEnd = useCallback(
    (event: TransitionEvent<HTMLDivElement>) => {
      if (!zoomAnimating || event.propertyName !== "transform") return;
      finishExpand();
    },
    [finishExpand, zoomAnimating],
  );

  const resolveActiveFromScrollTop = useCallback(() => {
    const root = scrollRef.current;
    if (!root || playerOpen || mediaIds.length <= 1) return;

    const index = mediaIndexFromScrollTop(root, mediaIds.length);
    const next = mediaIds[index]!;
    setActiveMedia((current) => (current === next ? current : next));
  }, [mediaIds, playerOpen]);

  const snapToNearestPage = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const root = scrollRef.current;
      if (!root || playerOpen || mediaIds.length <= 1) return;

      const index = mediaIndexFromScrollTop(root, mediaIds.length);
      const targetTop = mediaScrollTopForIndex(root, index);

      if (Math.abs(root.scrollTop - targetTop) > 1) {
        root.scrollTo({ top: targetTop, behavior });
      }

      const next = mediaIds[index]!;
      setActiveMedia((current) => (current === next ? current : next));
    },
    [mediaIds, playerOpen],
  );

  const handleScroll = useCallback(() => {
    resolveActiveFromScrollTop();
  }, [resolveActiveFromScrollTop]);

  const scrollToMedia = useCallback((id: MediaSelection) => {
    const root = scrollRef.current;
    if (!root) return;
    const index = mediaIds.indexOf(id);
    if (index < 0) return;
    root.scrollTo({
      top: mediaScrollTopForIndex(root, index),
      behavior: "smooth",
    });
    setActiveMedia(id);
  }, [mediaIds]);

  useEffect(() => {
    setMounted(true);
    if (skipEnterFade || fromProfile) return;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [fromProfile, skipEnterFade]);

  useLayoutEffect(() => {
    if (!fromProfile || !profileEntry) return;

    const section = videoSectionRef.current;
    const to = section
      ? domRectToFrame(section.getBoundingClientRect())
      : getRetoPlayerTargetRect();
    const from = domRectToFrame(profileEntry.fromRect);
    const invert = profileZoomFromTransform(from, to);

    setTargetFrame(to);
    setZoomTransform(invert);
    setZoomAnimating(false);
    setBackdropReady(false);

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      setBackdropReady(true);
      raf2 = requestAnimationFrame(() => {
        setZoomAnimating(true);
        setZoomTransform(PROFILE_ZOOM_TO_TRANSFORM);
      });
    });

    const chromeTimer = window.setTimeout(() => {
      setShowChrome(true);
      setExpandComplete(true);
    }, PROFILE_EXPAND_MS + 40);

    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      window.clearTimeout(chromeTimer);
    };
  }, [fromProfile, profileEntry]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    setAmbientBackground(DEFAULT_EDGE_AMBIENT_BG);
  }, [item.id, item.videoUrl]);

  useEffect(() => {
    closePlayer();
    setActiveMedia("video");
    scrollRef.current?.scrollTo({ top: 0 });
    initialTimeAppliedRef.current = false;
  }, [closePlayer, item.videoUrl, item.id]);

  useEffect(() => {
    if (playerOpen || !onVideoSlide) return;

    const video = videoRef.current;
    if (!video) return;

    if (returningFromPlayerRef.current) {
      returningFromPlayerRef.current = false;
      return attachPreviewLoopHandlers(video);
    }

    const resumeTime =
      !initialTimeAppliedRef.current &&
      profileResumeTime != null &&
      Number.isFinite(profileResumeTime) &&
      profileResumeTime > 0
        ? profileResumeTime
        : undefined;

    if (resumeTime != null) {
      initialTimeAppliedRef.current = true;
    }

    startPreviewPlayback(video, resumeTime);
    const detach = attachPreviewLoopHandlers(video);

    return detach;
  }, [onVideoSlide, playerOpen, profileResumeTime, item.videoUrl, item.id]);

  useEffect(() => {
    let raf = 0;
    let lastSample = 0;
    const SAMPLE_MS = 160;

    const sampleAmbient = (now: number) => {
      raf = requestAnimationFrame(sampleAmbient);
      if (now - lastSample < SAMPLE_MS) return;
      lastSample = now;

      if (onVideoSlide || playerOpen) {
        const video = videoRef.current;
        if (!video) return;
        const colors = sampleMediaLateralColors(video);
        if (colors) {
          setAmbientBackground(lateralColorsToBackground(colors));
        }
        return;
      }

      if (!ambientImageUrl) return;
      const slideImg = scrollRef.current?.querySelector<HTMLImageElement>(
        `[data-media-id="${ambientImageUrl}"] img`,
      );
      if (!slideImg?.complete) return;
      const colors = sampleMediaLateralColors(slideImg);
      if (colors) {
        setAmbientBackground(lateralColorsToBackground(colors));
      }
    };

    raf = requestAnimationFrame(sampleAmbient);
    return () => cancelAnimationFrame(raf);
  }, [ambientImageUrl, item.id, item.videoUrl, onVideoSlide, playerOpen]);

  useEffect(() => {
    if (onVideoSlide || playerOpen) return;
    videoRef.current?.pause();
  }, [onVideoSlide, playerOpen]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || playerOpen || photos.length === 0) return;

    const onScrollEnd = () => {
      snapToNearestPage();
    };

    root.addEventListener("scrollend", onScrollEnd, { passive: true });
    resolveActiveFromScrollTop();

    return () => {
      root.removeEventListener("scrollend", onScrollEnd);
    };
  }, [item.id, photos.length, playerOpen, resolveActiveFromScrollTop, snapToNearestPage]);

  useEffect(() => {
    const root = scrollRef.current;
    const cinema = cinemaRef.current;
    if (!root || !cinema || playerOpen || photos.length === 0) return;

    const onWheel = (event: WheelEvent) => {
      const target = event.target as Element | null;
      if (target?.closest("[data-thumbnail-strip-scroll]")) return;
      if (target?.closest("[data-no-view-cursor] button, [data-no-view-cursor] a")) {
        return;
      }

      event.preventDefault();

      if (wheelLockRef.current) return;

      const delta = event.deltaY;
      if (Math.abs(delta) < 8) return;

      const currentIndex = mediaIndexFromScrollTop(root, mediaIds.length);
      const nextIndex =
        delta > 0
          ? Math.min(mediaIds.length - 1, currentIndex + 1)
          : Math.max(0, currentIndex - 1);

      if (nextIndex === currentIndex) return;

      wheelLockRef.current = true;
      root.scrollTo({
        top: mediaScrollTopForIndex(root, nextIndex),
        behavior: "smooth",
      });
      setActiveMedia(mediaIds[nextIndex]!);

      window.setTimeout(() => {
        wheelLockRef.current = false;
      }, 420);
    };

    cinema.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      cinema.removeEventListener("wheel", onWheel);
    };
  }, [item.id, mediaIds, photos.length, playerOpen]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playerOpen) return;

    const onFullscreenChange = () => {
      if (!isVideoFullscreen(video)) {
        closePlayer();
      }
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    video.addEventListener("webkitendfullscreen", onFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      video.removeEventListener("webkitendfullscreen", onFullscreenChange);
    };
  }, [closePlayer, playerOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !playerOpen) {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, playerOpen]);

  if (!mounted) return null;

  const videoWrapperStyle: React.CSSProperties | undefined =
    isExpanding && targetFrame
      ? {
          position: "fixed",
          left: targetFrame.left,
          top: targetFrame.top,
          width: targetFrame.width,
          height: targetFrame.height,
          zIndex: 25,
          transform: zoomTransform,
          transformOrigin: "center center",
          transition: zoomAnimating
            ? `transform ${PROFILE_EXPAND_MS}ms ${PROFILE_ZOOM_EASING}`
            : "none",
          willChange: "transform",
        }
      : undefined;

  const chromeReveal =
    showChrome ? "opacity-100" : "pointer-events-none opacity-0";

  const chromeTextSm =
    "text-[clamp(11px,1.65vw,13px)] font-normal uppercase leading-none tracking-wide";

  const displayUsername = (() => {
    const handle = item.username.replace(/^@/, "").toUpperCase();
    return `[@${handle}]`;
  })();

  const ambientBackdrop = (
    <div
      className={`pointer-events-none absolute inset-0 z-0 overflow-hidden transition-opacity duration-[680ms] ease-out ${
        backdropReady ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden
    >
      <div
        className="absolute -inset-[18%] scale-110 blur-[72px] saturate-[1.45] transition-[background] duration-300 ease-out"
        style={{ background: ambientBackground }}
      />
      <div className="absolute inset-0 bg-black/18 backdrop-blur-[1px]" />
    </div>
  );

  const portal = createPortal(
    <div
      ref={cinemaRef}
      data-video-cinema=""
      className={`${GeistMono.className} fixed inset-0 z-[200] overflow-hidden bg-black text-white transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      } ${showViewCursor ? "cursor-none" : ""}`}
      role="dialog"
      aria-modal
      aria-label={item.titulo}
    >
      {ambientBackdrop}

      <div className="absolute inset-0">
        {!playerOpen ? (
          <div
            className={`pointer-events-none absolute inset-x-0 top-0 z-10 px-4 pt-[max(1rem,var(--safe-top,0px))] transition-opacity duration-300 md:px-8 md:pt-8 ${chromeReveal}`}
          >
            <div className="flex max-w-[min(70vw,34rem)] flex-col items-start gap-2 text-left uppercase text-white">
              <h2
                className={`${RETO_TITULO_CLASS} text-left drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]`}
              >
                {item.titulo}
              </h2>
              {retoDescripcion ? (
                <p
                  className={`${RETO_DESCRIPCION_CLASS_VIDEO} text-white/90 drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]`}
                >
                  {retoDescripcion}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
        {!playerOpen ? (
          <div
            data-no-view-cursor=""
            className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pb-[max(1rem,var(--safe-bottom,0px))] transition-opacity duration-300 md:px-8 md:pb-8 ${chromeReveal}`}
          >
            <div className="flex flex-col items-start gap-2">
              <Link
                href={perfilHref(item.username)}
                onClick={onClose}
                className={`${chromeTextSm} pointer-events-auto border-0 bg-transparent p-0 text-left text-white/90 transition-opacity hover:opacity-80`}
              >
                {displayUsername}
              </Link>
              {canSave ? (
                <button
                  type="button"
                  onClick={handleSave}
                  className={`${chromeTextSm} pointer-events-auto border-0 bg-transparent p-0 text-left text-white transition-opacity hover:opacity-80`}
                  aria-label="Guardar obra"
                >
                  [GUARDAR]
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        <div
              ref={scrollRef}
              onScroll={handleScroll}
              data-media-scroll=""
              className={`relative z-0 flex h-full w-full flex-col overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
                photos.length === 0
                  ? "overflow-hidden"
                  : "snap-y snap-mandatory overflow-y-auto"
              }`}
            >
              <section
                ref={videoSectionRef}
                data-media-id="video"
                className="relative h-full w-full shrink-0 snap-start snap-always bg-black"
                onClick={(event) => {
                  if (!onVideoSlide || isExpanding || playerOpen) return;
                  const target = event.target as Element;
                  if (target.closest("[data-no-view-cursor]")) return;
                  openPlayer();
                }}
              >
                <div
                  data-video-view-zone=""
                  style={videoWrapperStyle}
                  onTransitionEnd={handleZoomTransitionEnd}
                  className="absolute left-1/2 top-1/2 flex h-[min(52dvh,400px)] w-[min(72vw,580px)] max-h-[calc(100%-5rem)] max-w-[calc(100%-1.5rem)] -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                >
                  <video
                    ref={videoRef}
                    src={item.videoUrl}
                    playsInline
                    preload="auto"
                    muted
                    loop
                    autoPlay={onVideoSlide}
                    controls={false}
                    controlsList="nodownload noplaybackrate noremoteplayback"
                    disablePictureInPicture
                    className="h-full w-full object-contain"
                    onLoadedMetadata={() => {
                      const video = videoRef.current;
                      if (!video || !Number.isFinite(video.duration)) return;
                      if (onVideoSlide && !playerOpen) {
                        startPreviewPlayback(video);
                      }
                    }}
                  />
                </div>
              </section>

              {photos.map((url) => (
                <section
                  key={url}
                  data-media-id={url}
                  className="relative flex h-full w-full shrink-0 snap-start snap-always items-center justify-center bg-black"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className="h-auto w-auto max-h-[min(68dvh,26rem)] max-w-[min(88vw,46rem)] object-contain"
                  />
                </section>
              ))}
            </div>
      </div>

      <button
        type="button"
        onClick={() => {
          if (document.fullscreenElement) {
            void document.exitFullscreen();
          }
          onClose();
        }}
        data-no-view-cursor=""
        className={`fixed right-4 top-4 z-[30] ${chromeTextSm} text-white transition-opacity duration-300 md:right-8 md:top-6 ${
          !playerOpen ? chromeReveal : "pointer-events-none opacity-0"
        }`}
        aria-label="Cerrar"
      >
        [cerrar]
      </button>

      <RetoVideoViewCursor active={showViewCursor} />

      {!playerOpen ? (
        <div
          data-no-view-cursor=""
          className={`absolute right-1.5 top-1/2 z-20 -translate-y-1/2 transition-opacity duration-300 md:right-3 ${chromeReveal}`}
        >
          <RetoVideoThumbnailStrip
            videoUrl={item.videoUrl}
            videoUid={item.videoUid}
            imagenes={item.imagenes}
            videoTitle={item.titulo}
            selected={activeMedia}
            onSelect={scrollToMedia}
          />
        </div>
      ) : null}
    </div>,
    document.body,
  );

  return (
    <>
      {portal}
      <AuthRequiredPopup
        open={authPopup}
        onClose={() => setAuthPopup(false)}
      />
    </>
  );
}
