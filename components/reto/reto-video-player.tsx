"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { RetoFeedItem } from "@/lib/mocks/reto-feed";
import { perfilHref } from "@/lib/mocks/perfil";

const CONTROLS_HIDE_MS = 2200;
/** Sin movimiento del ratón en pausa → ocultar UI. */
const PAUSE_IDLE_HIDE_MS = 5000;

type RetoVideoPlayerProps = {
  item: RetoFeedItem;
  retoNumero: string;
  retoTitulo: string;
  onClose: () => void;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function PauseIcon() {
  return (
    <span
      className="inline-flex h-14 w-14 items-center justify-center gap-[10px]"
      aria-hidden
    >
      <span className="h-12 w-[7px] bg-white" />
      <span className="h-12 w-[7px] bg-white" />
    </span>
  );
}

function PlayIcon() {
  return (
    <span
      className="inline-flex h-14 w-14 items-center justify-center"
      aria-hidden
    >
      <span className="ml-1 block h-0 w-0 border-y-[22px] border-l-[36px] border-y-transparent border-l-white" />
    </span>
  );
}

/**
 * Reproductor overlay:
 * - Al abrir: reproduce sin UI
 * - Ratón: HUD (título + play/pausa + barra)
 * - En pausa: ficha completa; a los 5s sin movimiento se oculta
 */
export function RetoVideoPlayer({
  item,
  retoNumero,
  retoTitulo,
  onClose,
}: RetoVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pauseIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrubbingRef = useRef(false);
  const durationRef = useRef(0);

  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showUi, setShowUi] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  const playingRef = useRef(false);
  const showUiRef = useRef(false);
  playingRef.current = playing;
  showUiRef.current = showUi;
  durationRef.current = duration;

  useEffect(() => {
    setMounted(true);
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const clearControlsHide = useCallback(() => {
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = null;
    }
  }, []);

  const clearPauseIdle = useCallback(() => {
    if (pauseIdleTimerRef.current) {
      clearTimeout(pauseIdleTimerRef.current);
      pauseIdleTimerRef.current = null;
    }
  }, []);

  const schedulePlayingHide = useCallback(() => {
    clearControlsHide();
    controlsTimerRef.current = setTimeout(() => {
      if (playingRef.current) setShowUi(false);
    }, CONTROLS_HIDE_MS);
  }, [clearControlsHide]);

  const schedulePauseIdleHide = useCallback(() => {
    clearPauseIdle();
    pauseIdleTimerRef.current = setTimeout(() => {
      if (!playingRef.current) setShowUi(false);
    }, PAUSE_IDLE_HIDE_MS);
  }, [clearPauseIdle]);

  const startPlayback = useCallback(
    async (opts?: { revealHud?: boolean }) => {
      clearPauseIdle();
      const video = videoRef.current;
      if (!video) return;
      const revealHud = opts?.revealHud === true;
      try {
        video.muted = true;
        await video.play();
        video.muted = false;
        setPlaying(true);
        if (revealHud) {
          setShowUi(true);
          schedulePlayingHide();
        } else {
          setShowUi(false);
        }
      } catch {
        try {
          video.muted = true;
          await video.play();
          setPlaying(true);
          if (revealHud) {
            setShowUi(true);
            schedulePlayingHide();
          } else {
            setShowUi(false);
          }
        } catch {
          setPlaying(false);
        }
      }
    },
    [clearPauseIdle, schedulePlayingHide],
  );

  const pausePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setPlaying(false);
    setShowUi(true);
    clearControlsHide();
    schedulePauseIdleHide();
  }, [clearControlsHide, schedulePauseIdleHide]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void startPlayback({ revealHud: !showUiRef.current });
    } else {
      pausePlayback();
    }
  }, [pausePlayback, startPlayback]);

  const onMouseActivity = useCallback(() => {
    if (scrubbingRef.current) {
      setShowUi(true);
      return;
    }
    setShowUi(true);
    if (playingRef.current) {
      clearPauseIdle();
      schedulePlayingHide();
    } else {
      clearControlsHide();
      schedulePauseIdleHide();
    }
  }, [
    clearControlsHide,
    clearPauseIdle,
    schedulePauseIdleHide,
    schedulePlayingHide,
  ]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    const kick = async () => {
      try {
        video.currentTime = 0;
        video.muted = true;
        await video.play();
        if (cancelled) return;
        video.muted = false;
        setPlaying(true);
        setShowUi(false);
      } catch {
        if (cancelled) return;
        try {
          video.muted = true;
          await video.play();
          if (!cancelled) {
            setPlaying(true);
            setShowUi(false);
          }
        } catch {
          if (!cancelled) setPlaying(false);
        }
      }
    };

    void kick();
    return () => {
      cancelled = true;
      clearControlsHide();
      clearPauseIdle();
    };
  }, [clearControlsHide, clearPauseIdle, item.videoUrl]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, togglePlay]);

  const onTimeUpdate = () => {
    if (scrubbingRef.current) return;
    const video = videoRef.current;
    if (!video) return;
    setCurrent(video.currentTime);
  };

  const onLoadedMeta = () => {
    const video = videoRef.current;
    if (!video) return;
    const d = video.duration || 0;
    setDuration(d);
    durationRef.current = d;
  };

  const seekToClientX = useCallback((clientX: number) => {
    const bar = barRef.current;
    const video = videoRef.current;
    const total = durationRef.current;
    if (!bar || !video || total <= 0) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const next = ratio * total;
    video.currentTime = next;
    setCurrent(next);
  }, []);

  const onBarPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    scrubbingRef.current = true;
    setShowUi(true);
    clearControlsHide();
    clearPauseIdle();
    event.currentTarget.setPointerCapture(event.pointerId);
    seekToClientX(event.clientX);
  };

  const onBarPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return;
    event.preventDefault();
    seekToClientX(event.clientX);
  };

  const onBarPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return;
    scrubbingRef.current = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
    onMouseActivity();
  };

  const progress = duration > 0 ? (current / duration) * 100 : 0;
  const showSheet = showUi && !playing;

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[200] bg-black text-white transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onMouseMove={onMouseActivity}
      onWheel={(event) => event.stopPropagation()}
      role="dialog"
      aria-modal
      aria-label={`${item.titulo} — ${item.username}`}
    >
      <div
        className="absolute inset-0 flex items-center justify-center bg-black"
        onClick={togglePlay}
      >
        <div
          className="relative aspect-video w-[min(100vw,calc(100vh*16/9))]"
          onClick={(event) => event.stopPropagation()}
        >
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full cursor-pointer object-cover"
            style={{ cursor: 'url("/xp_link_xl.cur"), pointer' }}
            src={item.videoUrl}
            poster={item.imageUrl}
            autoPlay
            playsInline
            preload="auto"
            onClick={(event) => {
              event.stopPropagation();
              togglePlay();
            }}
            onTimeUpdate={onTimeUpdate}
            onLoadedMetadata={onLoadedMeta}
            onPlay={() => setPlaying(true)}
            onPause={() => {
              if (!scrubbingRef.current) setPlaying(false);
            }}
            onEnded={() => {
              setPlaying(false);
              setShowUi(true);
              schedulePauseIdleHide();
            }}
          />
        </div>
      </div>

      <div
        className={`pointer-events-none absolute inset-0 z-[15] bg-black/70 transition-opacity duration-500 ${
          showSheet ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden={!showSheet}
      />

      <div
        className={`pointer-events-none absolute left-[18px] top-[22px] z-20 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-[20px] font-normal leading-none tracking-wide transition-opacity duration-300 ${
          showUi ? "opacity-100" : "opacity-0"
        }`}
      >
        <span>#{retoNumero}</span>
        <span>{retoTitulo}</span>
      </div>

      <div
        className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-300 ${
          showUi ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </div>

      <div
        className={`absolute bottom-[22%] left-[18px] z-20 max-w-[min(52vw,560px)] pr-6 transition-opacity duration-500 ${
          showSheet
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!showSheet}
        onClick={(event) => event.stopPropagation()}
      >
        <Link
          href={perfilHref(item.username)}
          className="inline-block text-[18px] font-normal leading-none tracking-wide hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          {item.username}
        </Link>
        <h2 className="mt-3 text-[32px] font-normal leading-tight tracking-wide">
          {item.titulo}
        </h2>
        <p className="mt-3 text-[16px] font-normal leading-relaxed tracking-wide text-white/95">
          {item.descripcion}
        </p>
      </div>

      <div
        className={`absolute inset-x-0 bottom-0 z-30 transition-opacity duration-300 ${
          showUi
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        } ${
          showSheet
            ? "bg-transparent"
            : "bg-gradient-to-t from-black/85 via-black/55 to-transparent"
        }`}
        onMouseMove={(event) => {
          event.stopPropagation();
          onMouseActivity();
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-5 pb-5 pt-10">
          <div
            ref={barRef}
            className="relative flex h-8 w-full items-center touch-none"
            style={{ cursor: 'url("/xp_link_xl.cur"), pointer' }}
            onPointerDown={onBarPointerDown}
            onPointerMove={onBarPointerMove}
            onPointerUp={onBarPointerUp}
            onPointerCancel={onBarPointerUp}
            role="slider"
            aria-label="Progreso del vídeo"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(current)}
            tabIndex={0}
            onKeyDown={(event) => {
              const video = videoRef.current;
              if (!video || duration <= 0) return;
              if (event.key === "ArrowRight") {
                const next = Math.min(duration, video.currentTime + 5);
                video.currentTime = next;
                setCurrent(next);
              }
              if (event.key === "ArrowLeft") {
                const next = Math.max(0, video.currentTime - 5);
                video.currentTime = next;
                setCurrent(next);
              }
            }}
          >
            <div className="relative h-2 w-full bg-white/25">
              <div
                className="absolute inset-y-0 left-0 bg-white"
                style={{ width: `${progress}%` }}
              />
              <div
                className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
                style={{ left: `${progress}%` }}
              />
            </div>
          </div>
          <div className="mt-1 flex items-center justify-between text-[14px] tabular-nums tracking-wide text-white/90">
            <span>{formatTime(current)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className={`absolute right-[18px] top-[22px] z-40 text-[20px] font-normal leading-none tracking-wide text-white/90 transition-opacity duration-300 hover:text-white ${
          showUi ? "opacity-100" : "opacity-0"
        }`}
        aria-label="Cerrar vídeo"
        tabIndex={showUi ? 0 : -1}
      >
        [Esc]
      </button>
    </div>,
    document.body,
  );
}
