"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RetoArchivo } from "@/lib/supabase/retos";

const ARCHIVO_WHEEL_EVENT = "archivo-wheel";
const HERO_REQUEST_EVENT = "carousel-request-hero";

/** Separación vertical entre carpetas en vh. */
const SLOT_VH = 34;

/** Nº máximo de carpetas alrededor del centro que renderizamos. */
const RENDER_RANGE = 3;

export function ArchivosCarousel({ retos }: { retos: RetoArchivo[] }) {
  /* La lista llega en orden ascendente por fecha; invertimos para mostrar
     el reto más reciente primero. */
  const items = useMemo(() => [...retos].reverse(), [retos]);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    if (items.length === 0) return;
    if (index >= items.length) setIndex(0);
  }, [items.length, index]);

  useEffect(() => {
    const onWheel = (event: Event) => {
      const detail = (event as CustomEvent<{ direction: number }>).detail;
      if (!detail) return;
      const current = indexRef.current;

      if (detail.direction > 0) {
        if (current >= items.length - 1) return;
        setIndex(current + 1);
      } else {
        if (current === 0) {
          window.dispatchEvent(new Event(HERO_REQUEST_EVENT));
          return;
        }
        setIndex(current - 1);
      }
    };

    window.addEventListener(ARCHIVO_WHEEL_EVENT, onWheel);
    return () => window.removeEventListener(ARCHIVO_WHEEL_EVENT, onWheel);
  }, [items.length]);

  if (items.length === 0) {
    return (
      <div className="site-grid h-full items-center text-white">
        <p className="col-start-2 col-span-8 text-[20px] tracking-wide text-white/70">
          No hay retos en el archivo.
        </p>
      </div>
    );
  }

  const current = items[index];

  return (
    <div className="relative h-full w-full overflow-hidden text-white">
      {/* Título y fecha totalmente anclados; su contenido cambia con el índice */}
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center">
        <div className="site-grid w-full items-center">
          <div className="col-start-2 col-span-2 self-center text-[20px] font-normal leading-none tracking-wide">
            {current.titulo}
          </div>
          <div className="col-start-8 col-span-2 self-center whitespace-nowrap text-right text-[20px] font-normal leading-none tracking-wide">
            {current.fechaLabel}
          </div>
        </div>
      </div>

      {/* Ribbon: cada carpeta se sitúa según su offset con respecto al índice
          actual. Al cambiar `index`, todas las carpetas transicionan a la vez. */}
      <div className="absolute inset-0">
        {items.map((item, i) => {
          const offset = i - index;
          if (Math.abs(offset) > RENDER_RANGE) return null;
          const isFocus = offset === 0;
          const isPeek = Math.abs(offset) === 1;
          const opacity = isFocus ? 1 : isPeek ? 0.25 : 0;

          return (
            <div
              key={item.id}
              aria-hidden={!isFocus}
              className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                top: `calc(50% + ${offset * SLOT_VH}vh)`,
                opacity,
                transition:
                  "top 380ms cubic-bezier(0.22, 0.9, 0.36, 1), opacity 380ms cubic-bezier(0.22, 0.9, 0.36, 1)",
                willChange: "top, opacity",
              }}
            >
              <div className="relative">
                <FolderIcon />
                <div
                  className="absolute inset-x-0 top-full mt-4 text-center text-[20px] leading-none tracking-wide"
                  style={{
                    opacity: isFocus ? 1 : 0,
                    transition: "opacity 260ms",
                  }}
                >
                  #{item.numero}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Icono de carpeta pixel-art construido con puntos en malla.
 * Pestaña arriba a la derecha, cuerpo rectangular abajo.
 */
function FolderIcon() {
  const cols = 18;
  const rows = 12;
  const dotSize = 7;
  const cellSize = 11;
  const tabRowEnd = 1;
  const tabColStart = 11;
  const tabColEnd = 16;

  const dots: Array<[number, number]> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const inTab = r <= tabRowEnd && c >= tabColStart && c <= tabColEnd;
      const inBody = r > tabRowEnd;
      if (inTab || inBody) {
        dots.push([c, r]);
      }
    }
  }

  return (
    <svg
      width={cols * cellSize}
      height={rows * cellSize}
      viewBox={`0 0 ${cols * cellSize} ${rows * cellSize}`}
      style={{ shapeRendering: "crispEdges" }}
      aria-hidden
    >
      {dots.map(([c, r]) => (
        <rect
          key={`${c}-${r}`}
          x={c * cellSize}
          y={r * cellSize}
          width={dotSize}
          height={dotSize}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}
