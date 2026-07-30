import type { CSSProperties } from "react";

const DOT_COUNT = 12;

type PageLoadingProps = {
  /** Fondo de la pantalla de reto (negro). Por defecto azul de marca. */
  variant?: "brand" | "black";
};

/**
 * Pantalla de carga a pantalla completa + rueda de puntos.
 */
export function PageLoading({ variant = "brand" }: PageLoadingProps) {
  const bg =
    variant === "black" ? "bg-black" : "bg-[var(--background)]";

  return (
    <div
      className={`page-loading flex h-full items-center justify-center text-white ${bg}`}
      role="status"
      aria-live="polite"
      aria-label="Cargando"
    >
      <div className="page-loading-wheel" aria-hidden>
        {Array.from({ length: DOT_COUNT }, (_, i) => (
          <span
            key={i}
            className="page-loading-dot"
            style={{ "--i": i } as CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}
