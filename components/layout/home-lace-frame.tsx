"use client";

import { useLayoutEffect, useState } from "react";

type HomeLaceFrameProps = {
  visible?: boolean;
  /** Marco claro (blanco) sobre fondo azul; oscuro (negro) sobre fondo blanco. */
  tone?: "light" | "dark";
};

const FRAME_SRC = "/frames/home-lace-frame.png?v=12";

/**
 * Marco ornamental a pantalla completa.
 * Desktop: imagen completa. Móvil: border-image (una sola capa).
 * Solo se monta en cliente para evitar doble marco por hidratación SSR.
 */
export function HomeLaceFrame({
  visible = true,
  tone = "light",
}: HomeLaceFrameProps) {
  const [mode, setMode] = useState<"idle" | "desktop" | "mobile">("idle");

  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setMode(mq.matches ? "desktop" : "mobile");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  if (mode === "idle") {
    return null;
  }

  const dark = tone === "dark";

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-[15] overflow-hidden transition-opacity ease-[cubic-bezier(0.33,1,0.68,1)] duration-[380ms] ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden
    >
      {mode === "desktop" ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={FRAME_SRC}
          alt=""
          className={`h-full w-full object-fill object-center ${
            dark ? "brightness-0" : ""
          }`}
          draggable={false}
        />
      ) : (
        <div
          className={`home-lace-frame__mobile absolute inset-0 box-border ${
            dark ? "brightness-0" : ""
          }`}
        />
      )}
    </div>
  );
}
