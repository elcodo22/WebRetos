"use client";

import { useSearchOverlay } from "./search-overlay-provider";

export function ArchivosSearch() {
  const { open } = useSearchOverlay();

  return (
    <button
      type="button"
      onClick={open}
      aria-label="Buscar en archivos"
      className="inline-flex items-center justify-center leading-none"
    >
      <LupaIcon />
    </button>
  );
}

/**
 * Lupa oficial de Pixelarticons (`pixelarticons/search`). Se pinta en blanco
 * heredando el color del padre a través de `currentColor`.
 */
function LupaIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      className="block h-[18px] w-[18px] md:h-[24px] md:w-[24px]"
      style={{ shapeRendering: "crispEdges" }}
      aria-hidden
    >
      <path
        d="M6 2h8v2H6V2zM4 6V4h2v2H4zm0 8H2V6h2v8zm2 2H4v-2h2v2zm8 0v2H6v-2h8zm2-2h-2v2h2v2h2v2h2v2h2v-2h-2v-2h-2v-2h-2v-2zm0-8h2v8h-2V6zm0 0V4h-2v2h2z"
        fill="currentColor"
      />
    </svg>
  );
}
