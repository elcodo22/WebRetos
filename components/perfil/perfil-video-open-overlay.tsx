"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PerfilObra } from "@/lib/mocks/perfil";
import {
  attachPreviewLoopHandlers,
  getRetoPlayerTargetRect,
  startPreviewPlayback,
} from "@/lib/video-preview";

const OPEN_MS = 520;
const FADE_OUT_MS = 280;

type PerfilVideoOpenOverlayProps = {
  obra: PerfilObra;
  fromRect: DOMRect;
  currentTime: number;
  onComplete: () => void;
};

function rectToStyle(rect: DOMRect) {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

export function PerfilVideoOpenOverlay({
  obra,
  fromRect,
  currentTime,
  onComplete,
}: PerfilVideoOpenOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mounted, setMounted] = useState(false);
  const [backdropVisible, setBackdropVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [frameStyle, setFrameStyle] = useState(() => rectToStyle(fromRect));

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    const target = getRetoPlayerTargetRect();
    const id = requestAnimationFrame(() => {
      setBackdropVisible(true);
      setFrameStyle({
        left: target.left,
        top: target.top,
        width: target.width,
        height: target.height,
      });
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    startPreviewPlayback(video, currentTime);
    const detach = attachPreviewLoopHandlers(video);

    const expandTimer = window.setTimeout(() => {
      setExiting(true);
    }, OPEN_MS);
    const completeTimer = window.setTimeout(onComplete, OPEN_MS + FADE_OUT_MS);

    return () => {
      detach();
      window.clearTimeout(expandTimer);
      window.clearTimeout(completeTimer);
    };
  }, [currentTime, onComplete, obra.videoUrl]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[201] bg-black transition-opacity duration-300 ${
        exiting ? "opacity-0" : backdropVisible ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden
    >
      <div
        className="absolute overflow-hidden bg-black transition-[left,top,width,height] duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={frameStyle}
      >
        <video
          ref={videoRef}
          src={obra.videoUrl}
          playsInline
          preload="auto"
          muted
          loop
          autoPlay
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </div>,
    document.body,
  );
}
