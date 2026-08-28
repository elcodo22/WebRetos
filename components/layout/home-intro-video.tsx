"use client";

import { useEffect, useRef, useState } from "react";

/** Tras dejar de scrollear, volver a mostrar el hint. */
const HINT_IDLE_MS = 900;

type Props = {
  /** 0 = vídeo a pantalla completa, 1 = fuera (home visible). */
  progress: number;
};

/**
 * Vídeo a pantalla completa previo al home.
 * Un deslizamiento lo saca y deja la home principal debajo.
 */
export function HomeIntroVideo({ progress }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevProgressRef = useRef(progress);
  const p = Math.min(1, Math.max(0, progress));
  const gone = p >= 0.999;
  const [hintVisible, setHintVisible] = useState(true);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (gone) {
      el.pause();
      return;
    }
    const play = el.play();
    if (play && typeof play.catch === "function") {
      play.catch(() => {
        /* autoplay bloqueado: el usuario ya puede deslizar */
      });
    }
  }, [gone]);

  // Al scrollear se oculta; al parar (y seguir en el vídeo) vuelve.
  useEffect(() => {
    if (gone) {
      setHintVisible(false);
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current);
        hintTimerRef.current = null;
      }
      prevProgressRef.current = progress;
      return;
    }

    const prev = prevProgressRef.current;
    prevProgressRef.current = progress;

    // Primera pintura / sin cambio: mantener hint.
    if (prev === progress) {
      setHintVisible(true);
      return;
    }

    setHintVisible(false);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => {
      hintTimerRef.current = null;
      setHintVisible(true);
    }, HINT_IDLE_MS);

    return () => {
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current);
        hintTimerRef.current = null;
      }
    };
  }, [progress, gone]);

  return (
    <div
      className="absolute inset-0 z-[5] overflow-hidden bg-black"
      style={{
        transform: `translate3d(0, ${-p * 100}%, 0)`,
        willChange: p > 0.001 && p < 0.999 ? "transform" : undefined,
        pointerEvents: gone ? "none" : "auto",
      }}
      aria-hidden={gone}
    >
      <video
        ref={videoRef}
        className="absolute left-1/2 top-1/2 h-[100vw] w-[100vh] max-w-none -translate-x-1/2 -translate-y-1/2 rotate-[270deg] object-cover object-center md:inset-0 md:h-full md:w-full md:max-w-full md:translate-x-0 md:translate-y-0 md:rotate-0 md:object-[center_78%]"
        src="/branding/home-intro-v10.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-label="Vídeo de introducción"
      />
      <p
        className={`pointer-events-none absolute inset-x-0 bottom-[max(1.5rem,calc(var(--safe-bottom)+0.75rem))] z-10 text-center ui-btn-text font-normal tracking-wide text-white transition-opacity duration-300 md:bottom-10 ${
          hintVisible && !gone ? "opacity-100" : "opacity-0"
        }`}
      >
        SCROLL TO SEE
      </p>
    </div>
  );
}
