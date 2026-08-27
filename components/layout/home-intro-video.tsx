"use client";

import { useEffect, useRef } from "react";

/** Segundos a saltar al inicio del clip. */
const START_AT_S = 2;

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
  const p = Math.min(1, Math.max(0, progress));
  const gone = p >= 0.999;

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const seekToStart = () => {
      if (el.currentTime < START_AT_S) {
        el.currentTime = START_AT_S;
      }
    };

    const onLoaded = () => {
      seekToStart();
    };

    const onTimeUpdate = () => {
      // Evita mostrar/reproducir los primeros segundos.
      if (el.currentTime > 0 && el.currentTime < START_AT_S) {
        el.currentTime = START_AT_S;
      }
    };

    const onEnded = () => {
      el.currentTime = START_AT_S;
      void el.play().catch(() => {});
    };

    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("ended", onEnded);
    seekToStart();

    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("ended", onEnded);
    };
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (gone) {
      el.pause();
      return;
    }
    if (el.currentTime < START_AT_S) {
      el.currentTime = START_AT_S;
    }
    const play = el.play();
    if (play && typeof play.catch === "function") {
      play.catch(() => {
        /* autoplay bloqueado: el usuario ya puede deslizar */
      });
    }
  }, [gone]);

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
        className="absolute inset-0 h-full w-full object-cover object-[center_78%]"
        src="/branding/home-intro.mp4?v=6"
        autoPlay
        muted
        playsInline
        preload="auto"
        aria-label="Vídeo de introducción"
      />
    </div>
  );
}
