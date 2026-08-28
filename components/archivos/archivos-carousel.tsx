"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RetoArchivo } from "@/lib/supabase/retos";
import { formatRetoNumero } from "@/lib/format-reto-numero";
import { useCrtPower } from "@/components/layout/crt-power-transition";
import { FolderIcon } from "@/components/archivos/folder-icon";

const ARCHIVO_WHEEL_EVENT = "archivo-wheel";
const HERO_REQUEST_EVENT = "carousel-request-hero";
/** Progreso 0–1: carpetas/header salen por arriba; aparece contacto. */
export const ARCHIVOS_CONTACT_EVENT = "archivos-contact-progress";

/** Separación vertical entre carpetas en vh. */
const SLOT_VH = 34;

/** Nº de carpetas a cada lado del foco que se renderizan en reposo. */
const REST_RANGE = 3;

/** Factor de easing exponencial por frame (~60fps). Más alto = más ágil. */
const EASE_FACTOR = 0.38;

/** Factor de easing del exit a contacto (más bajo = más suave). */
const EXIT_EASE_FACTOR = 0.16;

/** Umbral (en carpetas) para dar por asentada la posición y mostrar el nº. */
const NEAR_REST_EPS = 0.55;

/** Umbral (en carpetas) para hacer el snap final y detener la animación. */
const SNAP_EPS = 0.0025;
/** Un cambio de carpeta / contacto por gesto de rueda. */
const WHEEL_SNAP_PIN_GAP_MS = 160;

const IG_URL = "https://www.instagram.com/unjaaam/";
const CONTACT_EMAIL = "unjam@info.es";
const CONTACT_HANDLE = "@unjaaam";

function emitContactProgress(progress: number) {
  window.dispatchEvent(
    new CustomEvent(ARCHIVOS_CONTACT_EVENT, {
      detail: { progress },
    }),
  );
}

export function ArchivosCarousel({ retos }: { retos: RetoArchivo[] }) {
  /* La lista llega en orden ascendente por fecha; invertimos para mostrar
     el reto más reciente primero. */
  const items = useMemo(() => [...retos].reverse(), [retos]);
  const total = items.length;
  const { powerOffTo } = useCrtPower();

  const [index, setIndex] = useState(0);
  const [isSettled, setIsSettled] = useState(true);
  const [renderMin, setRenderMin] = useState(0);
  const [renderMax, setRenderMax] = useState(() =>
    Math.min(REST_RANGE, Math.max(0, total - 1)),
  );
  /** 0 = archivos, 1 = todo salió arriba y contacto centrado. */
  const [exitProgress, setExitProgress] = useState(0);

  const positionRef = useRef(0);
  const targetRef = useRef(0);
  const indexRef = useRef(0);
  const isSettledRef = useRef(true);
  const rafRef = useRef<number | null>(null);
  const exitRafRef = useRef<number | null>(null);
  const ribbonRef = useRef<HTMLDivElement>(null);
  const totalRef = useRef(total);
  const exitProgressRef = useRef(0);
  const exitTargetRef = useRef(0);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    totalRef.current = total;
  }, [total]);

  useEffect(() => {
    if (total === 0) return;
    if (indexRef.current >= total) {
      indexRef.current = Math.max(0, total - 1);
      positionRef.current = indexRef.current;
      targetRef.current = indexRef.current;
      setIndex(indexRef.current);
    }
    setRenderMin((prev) => Math.max(0, Math.min(prev, total - 1)));
    setRenderMax((prev) => Math.max(0, Math.min(prev, total - 1)));
  }, [total]);

  useEffect(() => {
    return () => {
      emitContactProgress(0);
      if (exitRafRef.current !== null) {
        cancelAnimationFrame(exitRafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const lastWheelAtRef = { current: 0 };
    const wheelSnapConsumedRef = { current: false };

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
      const t = totalRef.current;
      const lo = Math.max(0, target - REST_RANGE);
      const hi = Math.min(t - 1, target + REST_RANGE);
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

      const isNearRest = absDiff < NEAR_REST_EPS;
      if (isNearRest !== isSettledRef.current) {
        isSettledRef.current = isNearRest;
        setIsSettled(isNearRest);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    const animateExit = () => {
      const target = exitTargetRef.current;
      const current = exitProgressRef.current;
      const diff = target - current;
      if (Math.abs(diff) < 0.002) {
        exitProgressRef.current = target;
        setExitProgress(target);
        emitContactProgress(target);
        exitRafRef.current = null;
        return;
      }
      const next = current + diff * EXIT_EASE_FACTOR;
      exitProgressRef.current = next;
      setExitProgress(next);
      emitContactProgress(next);
      exitRafRef.current = requestAnimationFrame(animateExit);
    };

    const startExitTo = (next: number) => {
      const p = Math.min(1, Math.max(0, next));
      if (p === exitTargetRef.current && exitRafRef.current !== null) return;
      exitTargetRef.current = p;
      if (exitRafRef.current === null) {
        exitRafRef.current = requestAnimationFrame(animateExit);
      }
    };

    const onWheel = (event: Event) => {
      const detail = (event as CustomEvent<{ delta: number }>).detail;
      if (!detail || typeof detail.delta !== "number") return;
      const t = totalRef.current;
      if (t === 0) return;

      const dir = Math.sign(detail.delta);
      if (dir === 0) return;

      const now = performance.now();
      const gap = now - lastWheelAtRef.current;
      if (gap >= WHEEL_SNAP_PIN_GAP_MS) {
        wheelSnapConsumedRef.current = false;
      }
      lastWheelAtRef.current = now;
      if (wheelSnapConsumedRef.current) return;

      const consumeWheelSnap = () => {
        wheelSnapConsumedRef.current = true;
      };

      // En contacto / saliendo: scroll arriba vuelve a carpetas.
      if (exitProgressRef.current > 0.02 || exitTargetRef.current > 0) {
        if (dir < 0) {
          startExitTo(0);
          consumeWheelSnap();
          return;
        }
        if (exitTargetRef.current >= 1 || exitProgressRef.current > 0.85) {
          return;
        }
        startExitTo(1);
        consumeWheelSnap();
        return;
      }

      const last = t - 1;
      let next = targetRef.current + dir;

      if (next < 0) {
        if (targetRef.current === 0 && positionRef.current < 0.05) {
          window.dispatchEvent(new Event(HERO_REQUEST_EVENT));
          consumeWheelSnap();
          return;
        }
        next = 0;
      } else if (next > last) {
        // Última carpeta + scroll abajo → todo sube y aparece contacto.
        if (
          targetRef.current >= last - 0.001 &&
          positionRef.current > last - 0.08
        ) {
          startExitTo(1);
          consumeWheelSnap();
        }
        return;
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
      consumeWheelSnap();

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
      if (exitRafRef.current !== null) {
        cancelAnimationFrame(exitRafRef.current);
        exitRafRef.current = null;
      }
    };
  }, []);

  if (total === 0) {
    return (
      <div className="site-grid h-full items-center max-md:flex max-md:px-[var(--grid-margin)]">
        <p className="col-start-2 col-span-8 text-[clamp(20px,4vw,25px)] tracking-wide opacity-70 max-md:col-auto">
          No hay retos en el archivo.
        </p>
      </div>
    );
  }

  const current = items[Math.min(index, total - 1)];
  const exit = Math.min(1, Math.max(0, exitProgress));
  // Curva suave: las carpetas se mantienen más tiempo visibles al inicio.
  const exitEase = exit * exit * (3 - 2 * exit);
  const foldersOpacity = Math.max(0, 1 - exitEase * 0.95);
  const foldersShift = exitEase * 72;
  const contactOpacity = Math.min(1, Math.max(0, (exitEase - 0.08) / 0.72));

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Carpetas + títulos: suben y salen por arriba */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate3d(0, ${-foldersShift}vh, 0)`,
          opacity: foldersOpacity,
          willChange: "transform, opacity",
          pointerEvents: exit > 0.6 ? "none" : undefined,
        }}
        aria-hidden={exit > 0.75}
      >
        <div className="pointer-events-none absolute inset-0 z-10 hidden items-center md:flex">
          <div className="site-grid w-full items-center">
            <div className="col-span-2 col-start-2 truncate text-[clamp(13px,2.8vw,18px)] font-normal uppercase leading-none tracking-wide">
              {current?.titulo}
            </div>
            <div className="col-span-2 col-start-8 whitespace-nowrap text-right text-[clamp(16px,3.8vw,25px)] font-normal uppercase leading-none tracking-wide">
              {current ? `#${formatRetoNumero(current.numero)}` : null}
            </div>
          </div>
        </div>

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
              const offset = i - Math.min(index, total - 1);
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
                  <div className="relative flex flex-col items-center">
                    {isFocus ? (
                      <button
                        type="button"
                        className="pointer-events-auto relative z-[2] block border-0 bg-transparent p-0 text-inherit"
                        aria-label={`Abrir reto #${item.numero}: ${item.titulo}`}
                        onClick={() => powerOffTo(`/reto/${item.id}`)}
                      >
                        <FolderIcon />
                      </button>
                    ) : (
                      <div className="relative z-[2]">
                        <FolderIcon />
                      </div>
                    )}
                    {isFocus ? (
                      <div className="pointer-events-none mt-3 flex max-w-[min(88vw,20rem)] items-center justify-center gap-x-3 px-2 text-center md:hidden">
                        <span className="min-w-0 truncate text-[clamp(13px,2.8vw,18px)] font-normal uppercase leading-none tracking-wide">
                          {item.titulo}
                        </span>
                        <span className="shrink-0 whitespace-nowrap text-[clamp(16px,3.8vw,25px)] font-normal uppercase leading-none tracking-wide">
                          #{formatRetoNumero(item.numero)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contacto: aparece mientras lo demás sale */}
      <div
        className="absolute inset-0 z-20 flex items-center justify-center px-[var(--grid-margin)]"
        style={{
          opacity: contactOpacity,
          transform: `translate3d(0, ${(1 - contactOpacity) * 12}vh, 0)`,
          pointerEvents: contactOpacity > 0.4 ? "auto" : "none",
          willChange: "transform, opacity",
        }}
        aria-hidden={contactOpacity < 0.15}
      >
        <div className="flex flex-col items-center gap-6 text-center text-[var(--background)]">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-[clamp(16px,3.4vw,22px)] font-normal tracking-wide transition-opacity hover:opacity-70"
          >
            {CONTACT_EMAIL}
          </a>
          <a
            href={IG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[clamp(16px,3.4vw,22px)] font-normal leading-none tracking-wide transition-opacity hover:opacity-70"
          >
            {CONTACT_HANDLE}
          </a>
        </div>
      </div>
    </div>
  );
}
