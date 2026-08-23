"use client";

import { useSearchOverlay } from "./search-overlay-provider";

type ArchivosSearchProps = {
  className?: string;
};

const defaultNavClass = "ui-btn-text";

export function ArchivosSearch({ className }: ArchivosSearchProps) {
  const { open } = useSearchOverlay();

  return (
    <button
      type="button"
      onClick={open}
      aria-label="Buscar en archivos"
      className={`inline-flex shrink-0 items-center self-center whitespace-nowrap font-normal leading-none tracking-wide ${className ?? defaultNavClass}`}
    >
      [BUSCAR]
    </button>
  );
}
