"use client";

type HomeLaceFrameProps = {
  visible?: boolean;
  /** Marco claro (blanco) sobre fondo azul; oscuro (negro) sobre fondo blanco. */
  tone?: "light" | "dark";
};

/**
 * Marco ornamental a pantalla completa.
 * Usa border-image (9-slice): las esquinas conservan proporción;
 * solo se estiran las líneas de los lados (evita deformación en móvil).
 */
export function HomeLaceFrame({
  visible = true,
  tone = "light",
}: HomeLaceFrameProps) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-[15] transition-opacity ease-[cubic-bezier(0.33,1,0.68,1)] duration-[380ms] ${
        visible ? "opacity-100" : "opacity-0"
      } ${tone === "dark" ? "brightness-0" : ""}`}
      style={{
        borderStyle: "solid",
        borderColor: "transparent",
        borderWidth: "clamp(72px, 22vmin, 180px)",
        borderImageSource: 'url("/frames/home-lace-frame.png?v=7")',
        borderImageSlice: 120,
        borderImageRepeat: "stretch",
        borderImageWidth: "clamp(72px, 22vmin, 180px)",
      }}
      aria-hidden
    />
  );
}
