"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RetoArchivo } from "@/lib/supabase/retos";

const ARCHIVO_WHEEL_EVENT = "archivo-wheel";
const HERO_REQUEST_EVENT = "carousel-request-hero";

/** Separación vertical entre carpetas en vh. */
const SLOT_VH = 34;

/** Nº de carpetas a cada lado del foco que se renderizan en reposo. */
const REST_RANGE = 3;

/** Factor de easing exponencial por frame (~60fps). Más alto = más ágil. */
const EASE_FACTOR = 0.38;

/** Umbral (en carpetas) para dar por asentada la posición y mostrar el nº. */
const NEAR_REST_EPS = 0.55;

/** Umbral (en carpetas) para hacer el snap final y detener la animación. */
const SNAP_EPS = 0.0025;

/** Duración (ms) del fade del nº #XX en cada dirección. */
const NUMBER_FADE_MS = 90;

export function ArchivosCarousel({ retos }: { retos: RetoArchivo[] }) {
  /* La lista llega en orden ascendente por fecha; invertimos para mostrar
     el reto más reciente primero. */
  const items = useMemo(() => [...retos].reverse(), [retos]);
  const total = items.length;

  const [index, setIndex] = useState(0);
  const [isSettled, setIsSettled] = useState(true);
  const [renderMin, setRenderMin] = useState(0);
  const [renderMax, setRenderMax] = useState(() =>
    Math.min(REST_RANGE, Math.max(0, total - 1)),
  );

  const positionRef = useRef(0);
  const targetRef = useRef(0);
  const indexRef = useRef(0);
  const isSettledRef = useRef(true);
  const rafRef = useRef<number | null>(null);
  const ribbonRef = useRef<HTMLDivElement>(null);
  const totalRef = useRef(total);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    totalRef.current = total;
  }, [total]);

  useEffect(() => {
    if (total === 0) return;
    if (indexRef.current >= total) {
      indexRef.current = 0;
      positionRef.current = 0;
      targetRef.current = 0;
      setIndex(0);
    }
    setRenderMin((prev) => Math.max(0, Math.min(prev, total - 1)));
    setRenderMax((prev) => Math.max(0, Math.min(prev, total - 1)));
  }, [total]);

  useEffect(() => {
    const applyTransform = () => {
      const node = ribbonRef.current;
      if (!node) return;
      node.style.transform = `translate3d(0, ${-positionRef.current * SLOT_VH}vh, 0)`;
    };

    const settleTo = (target: number) => {
      positionRef.current = target;
      applyTransform();
      if (indexRef.current !== target) {
        indexRef.current = target;
        setIndex(target);
      }
      const lo = Math.max(0, target - REST_RANGE);
      const hi = Math.min(totalRef.current - 1, target + REST_RANGE);
      setRenderMin(lo);
      setRenderMax(hi);
      if (!isSettledRef.current) {
        isSettledRef.current = true;
        setIsSettled(true);
      }
      rafRef.current = null;
    };

    const animate = () => {
      const target = targetRef.current;
      const current = positionRef.current;
      const diff = target - current;
      const absDiff = Math.abs(diff);

      if (absDiff < SNAP_EPS) {
        settleTo(target);
        return;
      }

      positionRef.current = current + diff * EASE_FACTOR;
      applyTransform();

      const nearest = Math.round(positionRef.current);
      if (nearest !== indexRef.current) {
        indexRef.current = nearest;
        setIndex(nearest);
      }

      /* En cuanto estamos muy cerca del target damos por asentada la vista
         (peek/foco/número entran en modo reposo) aunque el rAF siga afinando
         los últimos píxeles. Así el nº aparece sin esperar al snap final. */
      const isNearRest = absDiff < NEAR_REST_EPS;
      if (isNearRest !== isSettledRef.current) {
        isSettledRef.current = isNearRest;
        setIsSettled(isNearRest);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    const onWheel = (event: Event) => {
      const detail = (event as CustomEvent<{ delta: number }>).detail;
      if (!detail || typeof detail.delta !== "number") return;
      const t = totalRef.current;
      if (t === 0) return;

      const dir = Math.sign(detail.delta);
      if (dir === 0) return;

      /* Cada evento de rueda mueve exactamente 1 carpeta en su dirección. */
      let next = targetRef.current + dir;

      if (next < 0) {
        if (targetRef.current === 0 && positionRef.current < 0.05) {
          window.dispatchEvent(new Event(HERO_REQUEST_EVENT));
          return;
        }
        next = 0;
      } else if (next > t - 1) {
        next = t - 1;
      }

      if (next === targetRef.current) return;

      const pathLo = Math.min(
        next,
        Math.floor(positionRef.current),
        indexRef.current,
      );
      const pathHi = Math.max(
        next,
        Math.ceil(positionRef.current),
        indexRef.current,
      );
      setRenderMin((prev) => Math.min(prev, Math.max(0, pathLo - REST_RANGE)));
      setRenderMax((prev) =>
        Math.max(prev, Math.min(t - 1, pathHi + REST_RANGE)),
      );

      targetRef.current = next;

      if (isSettledRef.current) {
        isSettledRef.current = false;
        setIsSettled(false);
      }

      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    window.addEventListener(ARCHIVO_WHEEL_EVENT, onWheel);
    return () => {
      window.removeEventListener(ARCHIVO_WHEEL_EVENT, onWheel);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  if (total === 0) {
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
      {/* Título y fecha estables; su contenido cambia con el índice */}
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

      {/* Ribbon: contenedor único cuya translateY se anima por rAF (sin
          CSS transitions que se reinicien al recambiar el target). */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          maskImage:
            "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.35) 10%, black 32%, black 68%, rgba(0,0,0,0.35) 90%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.35) 10%, black 32%, black 68%, rgba(0,0,0,0.35) 90%, transparent 100%)",
        }}
      >
        <div
          ref={ribbonRef}
          className="absolute left-1/2 top-1/2"
          style={{ willChange: "transform" }}
        >
          {items.map((item, i) => {
            if (i < renderMin || i > renderMax) return null;
            const offset = i - index;
            const isFocus = offset === 0;
            const isPeek = Math.abs(offset) === 1;
            const restOpacity = isFocus ? 1 : isPeek ? 0.28 : 0;
            const opacity = isSettled ? restOpacity : 1;

            return (
              <div
                key={item.id}
                aria-hidden={!isFocus}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: 0,
                  top: `${i * SLOT_VH}vh`,
                  opacity,
                  transition: `opacity ${isSettled ? 200 : 80}ms ease-out`,
                }}
              >
                <div className="relative">
                  <FolderIcon />
                  <div
                    className="absolute inset-x-0 top-full mt-4 text-center text-[20px] leading-none tracking-wide"
                    style={{
                      opacity: isFocus && isSettled ? 1 : 0,
                      transition: `opacity ${NUMBER_FADE_MS}ms ease-out`,
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
