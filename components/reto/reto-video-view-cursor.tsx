"use client";

import { useEffect, useRef, useState } from "react";

type RetoVideoViewCursorProps = {
  active: boolean;
};

/** Sustituye el cursor por [VER VIDEO] en la ficha del vídeo (desktop). */
export function RetoVideoViewCursor({ active }: RetoVideoViewCursorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }

    const isFinePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches;
    if (!isFinePointer) return;

    const onMove = (event: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      el.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%)`;
      const target = event.target as Element | null;
      const inCinema = target?.closest("[data-video-cinema]") != null;
      const blocked =
        target?.closest(
          "button, a, input, textarea, [data-no-view-cursor]",
        ) != null;
      setVisible(inCinema && !blocked);
    };

    const onLeave = () => setVisible(false);

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, [active]);

  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none fixed left-0 top-0 z-[220] hidden select-none text-[clamp(10px,1.15vw,12px)] font-light uppercase leading-none tracking-[0.16em] text-white transition-opacity duration-150 md:block ${
        visible && active ? "opacity-100" : "opacity-0"
      }`}
    >
      [VER VIDEO]
    </div>
  );
}
