"use client";

import { useEffect, useRef, useState } from "react";
import type { PerfilObra } from "@/lib/mocks/perfil";
import { RetoVideoPlayer } from "@/components/reto/reto-video-player";

/** Ancho del póster vertical centrado. */
const CARD_VW = 20;
const GAP_VW = 7;

const EASE_FACTOR = 0.32;
const SNAP_EPS = 0.002;
const REST_RANGE = 2;
/** Evita que un gesto de rueda salte varias tarjetas. */
const WHEEL_LOCK_MS = 420;

type PerfilCarouselProps = {
  obras: PerfilObra[];
  onFocusChange?: (obra: PerfilObra) => void;
};

export function PerfilCarousel({ obras, onFocusChange }: PerfilCarouselProps) {
  const total = obras.length;

  const [index, setIndex] = useState(0);
  const [active, setActive] = useState<PerfilObra | null>(null);
  const [renderMin, setRenderMin] = useState(0);
  const [renderMax, setRenderMax] = useState(() =>
    Math.min(REST_RANGE, Math.max(0, total - 1)),
  );

  const positionRef = useRef(0);
  const targetRef = useRef(0);
  const indexRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const ribbonRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const totalRef = useRef(total);
  const metricsRef = useRef({ pad: 0, slot: 0 });
  const touchStartX = useRef<number | null>(null);
  const touchStartPos = useRef(0);
  const wheelLockUntil = useRef(0);
  const goToRef = useRef<(next: number) => void>(() => {});

  useEffect(() => {
    indexRef.current = index;
    const obra = obras[index];
    if (obra) onFocusChange?.(obra);
  }, [index, obras, onFocusChange]);

  useEffect(() => {
    totalRef.current = total;
  }, [total]);

  useEffect(() => {
    if (total === 0) return;

    const measure = () => {
      const root = rootRef.current;
      const ribbon = ribbonRef.current;
      if (!root || !ribbon) return;
      const w = root.clientWidth;
      const cardEl = ribbon.querySelector<HTMLElement>("[data-perfil-card]");
      const card =
        cardEl?.offsetWidth ||
        Math.min((CARD_VW / 100) * window.innerWidth, 0.42 * window.innerHeight);
      const gap = (GAP_VW / 100) * window.innerWidth;
      metricsRef.current = {
        pad: Math.max(0, (w - card) / 2),
        slot: card + gap,
      };
    };

    const applyTransform = () => {
      const node = ribbonRef.current;
      if (!node) return;
      const { pad, slot } = metricsRef.current;
      const x = pad - positionRef.current * slot;
      node.style.transform = `translate3d(${x}px, 0, 0)`;
    };

    const settleTo = (target: number) => {
      positionRef.current = target;
      applyTransform();
      if (indexRef.current !== target) {
        indexRef.current = target;
        setIndex(target);
      }
      setRenderMin(Math.max(0, target - REST_RANGE));
      setRenderMax(Math.min(totalRef.current - 1, target + REST_RANGE));
      rafRef.current = null;
    };

    const animate = () => {
      const target = targetRef.current;
      const diff = target - positionRef.current;
      if (Math.abs(diff) < SNAP_EPS) {
        settleTo(target);
        return;
      }

      positionRef.current += diff * EASE_FACTOR;
      applyTransform();

      const nearest = Math.round(positionRef.current);
      if (
        nearest !== indexRef.current &&
        nearest >= 0 &&
        nearest < totalRef.current
      ) {
        indexRef.current = nearest;
        setIndex(nearest);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    const goTo = (next: number) => {
      const t = totalRef.current;
      if (t === 0) return;
      const clamped = Math.max(0, Math.min(t - 1, next));
      targetRef.current = clamped;
      setRenderMin((prev) => Math.min(prev, Math.max(0, clamped - REST_RANGE)));
      setRenderMax((prev) =>
        Math.max(prev, Math.min(t - 1, clamped + REST_RANGE)),
      );
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    goToRef.current = goTo;

    const onWheel = (event: WheelEvent) => {
      if (totalRef.current === 0) return;
      event.preventDefault();
      const now = performance.now();
      if (now < wheelLockUntil.current) return;

      const dominant =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY;
      if (dominant === 0) return;

      wheelLockUntil.current = now + WHEEL_LOCK_MS;
      goTo(targetRef.current + Math.sign(dominant));
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(targetRef.current + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(targetRef.current - 1);
      }
    };

    measure();
    applyTransform();
    requestAnimationFrame(() => {
      measure();
      applyTransform();
    });

    const root = rootRef.current;
    const ro = new ResizeObserver(() => {
      measure();
      applyTransform();
    });
    if (root) ro.observe(root);
    window.addEventListener("resize", measure);

    root?.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      root?.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [total]);

  if (total === 0) {
    return (
      <div className="flex min-h-0 w-full flex-1 items-center justify-center px-[18px]">
        <p className="text-center text-[16px] tracking-wide text-white/70">
          Sin participaciones todavía.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <div
        ref={rootRef}
        className="relative min-h-0 w-full flex-1 overflow-hidden"
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0]?.clientX ?? null;
          touchStartPos.current = positionRef.current;
          if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
        }}
        onTouchMove={(event) => {
          if (touchStartX.current == null || !ribbonRef.current) return;
          const x = event.touches[0]?.clientX;
          if (x == null) return;
          const { pad, slot } = metricsRef.current;
          if (slot <= 0) return;
          const dx = x - touchStartX.current;
          positionRef.current = touchStartPos.current - dx / slot;
          ribbonRef.current.style.transform = `translate3d(${pad - positionRef.current * slot}px, 0, 0)`;
          const nearest = Math.round(positionRef.current);
          if (
            nearest !== indexRef.current &&
            nearest >= 0 &&
            nearest < total
          ) {
            indexRef.current = nearest;
            setIndex(nearest);
          }
        }}
        onTouchEnd={() => {
          if (touchStartX.current == null) return;
          touchStartX.current = null;
          goToRef.current(
            Math.round(Math.max(0, Math.min(total - 1, positionRef.current))),
          );
        }}
      >
        <div
          ref={ribbonRef}
          className="flex h-full items-center"
          style={{ gap: `${GAP_VW}vw` }}
        >
          {obras.map((obra, i) => {
            if (i < renderMin || i > renderMax) {
              return (
                <div
                  key={obra.id}
                  data-perfil-card
                  className="aspect-[2/3] shrink-0"
                  style={{ width: `min(${CARD_VW}vw, 42vh)` }}
                  aria-hidden
                />
              );
            }

            const dist = Math.abs(i - index);
            const isFocus = dist < 0.5;
            const opacity = isFocus ? 1 : dist < 1.5 ? 0.45 : 0;
            const scale = isFocus ? 1 : 0.82;

            return (
              <button
                key={obra.id}
                type="button"
                data-perfil-card
                onClick={() => {
                  if (Math.round(targetRef.current) !== i) {
                    goToRef.current(i);
                    return;
                  }
                  setActive(obra);
                }}
                className="relative aspect-[2/3] shrink-0 overflow-hidden text-left transition-[opacity,transform] duration-300"
                style={{
                  width: `min(${CARD_VW}vw, 42vh)`,
                  opacity,
                  transform: `scale(${scale})`,
                }}
                aria-label={`#${obra.retoNumero} ${obra.retoTitulo}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={obra.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  draggable={false}
                  loading={isFocus ? "eager" : "lazy"}
                  decoding="async"
                />
              </button>
            );
          })}
        </div>
      </div>

      {active ? (
        <RetoVideoPlayer
          item={active}
          retoNumero={active.retoNumero}
          retoTitulo={active.retoTitulo}
          onClose={() => setActive(null)}
        />
      ) : null}
    </div>
  );
}
