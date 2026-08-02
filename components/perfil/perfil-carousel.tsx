"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { User } from "@supabase/supabase-js";
import type { PerfilObra } from "@/lib/mocks/perfil";
import {
  isOwnUsername,
  viewerUsernameFromUser,
} from "@/lib/mocks/perfil";
import { CartonBoxIcon } from "@/components/perfil/carton-box-icon";
import { PerfilCajaOverlay } from "@/components/perfil/perfil-caja-overlay";
import { RetoVideoPlayer } from "@/components/reto/reto-video-player";
import {
  PerfilLiftOverlay,
  type LiftState,
} from "@/components/perfil/perfil-lift-overlay";
import { saveObraToCaja, type SavedCaja } from "@/lib/perfil-caja";

/** Ancho del póster vertical centrado. */
const CARD_VW = 20;
const GAP_VW = 7;

const EASE_FACTOR = 0.32;
const SNAP_EPS = 0.002;
const REST_RANGE = 2;
const WHEEL_LOCK_MS = 420;
/** Arrastrar esta distancia inicia el lift (sin long-press). */
const DRAG_LIFT_PX = 8;

export type PerfilFocusMeta = {
  retoNumero: string;
  retoTitulo: string;
  retoId?: string;
} | null;

type CarouselItem =
  | { kind: "caja"; key: string }
  | { kind: "obra"; key: string; obra: PerfilObra };

type PerfilCarouselProps = {
  obras: PerfilObra[];
  /** Carpetas dentro de la única caja de guardados. */
  cajas?: SavedCaja[];
  user?: User | null;
  onFocusChange?: (focus: PerfilFocusMeta) => void;
  onLiftChange?: (lifting: boolean) => void;
};

export function PerfilCarousel({
  obras,
  cajas = [],
  user = null,
  onFocusChange,
  onLiftChange,
}: PerfilCarouselProps) {
  const items = useMemo<CarouselItem[]>(() => {
    // Última participación primero (tras la caja, si existe)
    const obraItems: CarouselItem[] = [...obras].reverse().map((obra) => ({
      kind: "obra" as const,
      key: obra.id,
      obra,
    }));
    if (cajas.length > 0) {
      // Caja a la izquierda; no es la seleccionada si hay pósters
      return [{ kind: "caja" as const, key: "guardados" }, ...obraItems];
    }
    return obraItems;
  }, [cajas, obras]);

  const total = items.length;

  /** Índice de la última participación (obras van invertidas en el carrusel). */
  const lastParticipationIndex =
    obras.length > 0 ? (cajas.length > 0 ? 1 : 0) : 0;

  const [index, setIndex] = useState(lastParticipationIndex);
  const [active, setActive] = useState<PerfilObra | null>(null);
  const [openGuardados, setOpenGuardados] = useState(false);
  const [lift, setLift] = useState<LiftState | null>(null);
  const [renderMin, setRenderMin] = useState(() =>
    Math.max(0, lastParticipationIndex - REST_RANGE),
  );
  const [renderMax, setRenderMax] = useState(() =>
    Math.min(REST_RANGE + lastParticipationIndex, Math.max(0, total - 1)),
  );

  const positionRef = useRef(lastParticipationIndex);
  const targetRef = useRef(lastParticipationIndex);
  const indexRef = useRef(lastParticipationIndex);
  const rafRef = useRef<number | null>(null);
  const ribbonRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const totalRef = useRef(total);
  const itemsRef = useRef(items);
  const metricsRef = useRef({ pad: 0, slot: 0 });
  const touchStartX = useRef<number | null>(null);
  const touchStartPos = useRef(0);
  const wheelLockUntil = useRef(0);
  const goToRef = useRef<(next: number) => void>(() => {});
  const liftRef = useRef(false);

  const dragStartRef = useRef<{
    x: number;
    y: number;
    obra: PerfilObra;
    el: HTMLElement;
  } | null>(null);
  const clickOriginRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    liftRef.current = lift != null;
    onLiftChange?.(lift != null);
  }, [lift, onLiftChange]);

  useEffect(() => {
    indexRef.current = index;
    const item = items[index];
    if (!item || item.kind !== "obra") {
      onFocusChange?.(null);
      return;
    }
    onFocusChange?.({
      retoNumero: item.obra.retoNumero,
      retoTitulo: item.obra.retoTitulo,
      retoId: item.obra.retoId,
    });
  }, [index, items, onFocusChange]);

  useEffect(() => {
    totalRef.current = total;
    if (total > 0 && indexRef.current >= total) {
      const start = lastParticipationIndex;
      indexRef.current = start;
      positionRef.current = start;
      targetRef.current = start;
      setIndex(start);
    }
  }, [total, lastParticipationIndex]);

  // Al montar / cambiar layout / volver al perfil: centrar última participación
  const layoutKey = `${cajas.length > 0 ? 1 : 0}-${obras.length}`;
  const prevLayoutKey = useRef("");
  useEffect(() => {
    if (total === 0) return;
    const start = lastParticipationIndex;
    const layoutChanged = prevLayoutKey.current !== layoutKey;
    prevLayoutKey.current = layoutKey;
    if (!layoutChanged) return;
    const id = window.requestAnimationFrame(() => {
      goToRef.current(start);
    });
    return () => window.cancelAnimationFrame(id);
  }, [layoutKey, total, lastParticipationIndex]);

  useEffect(() => {
    function onGoHome() {
      setOpenGuardados(false);
      setLift(null);
      setActive(null);
      window.requestAnimationFrame(() => {
        goToRef.current(lastParticipationIndex);
      });
    }
    window.addEventListener("perfil-go-home", onGoHome);
    return () => window.removeEventListener("perfil-go-home", onGoHome);
  }, [lastParticipationIndex]);

  const clearDrag = useCallback(() => {
    dragStartRef.current = null;
  }, []);

  const beginLift = useCallback(
    (obra: PerfilObra, el: HTMLElement, clientX: number, clientY: number) => {
      if (isOwnUsername(obra.username, viewerUsernameFromUser(user))) return;
      const rect = el.getBoundingClientRect();
      setLift({
        obra,
        x: rect.left,
        y: rect.top,
        w: rect.width,
        h: rect.height,
        grabX: clientX - rect.left,
        grabY: clientY - rect.top,
      });
      clearDrag();
    },
    [clearDrag, user],
  );

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
        Math.min(
          (CARD_VW / 100) * window.innerWidth,
          0.42 * window.innerHeight,
        );
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
      if (liftRef.current) return;
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
      // Rueda: bajar → izquierda, subir → derecha
      goTo(targetRef.current - Math.sign(dominant));
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && liftRef.current) {
        setLift(null);
        return;
      }
      if (liftRef.current) return;
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

  useEffect(() => () => clearDrag(), [clearDrag]);

  const onObraPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    obra: PerfilObra,
    isFocus: boolean,
  ) => {
    if (event.button !== 0) return;
    clickOriginRef.current = { x: event.clientX, y: event.clientY };
    if (!isFocus) return;
    if (isOwnUsername(obra.username, viewerUsernameFromUser(user))) return;

    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      obra,
      el: event.currentTarget,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onObraPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const start = dragStartRef.current;
    if (!start || lift) return;
    const dist = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (dist >= DRAG_LIFT_PX) {
      beginLift(start.obra, start.el, event.clientX, event.clientY);
    }
  };

  const onObraPointerUp = (
    event: ReactPointerEvent<HTMLButtonElement>,
    obra: PerfilObra,
    i: number,
  ) => {
    if (lift) return;
    const origin = clickOriginRef.current;
    const wasDragging = dragStartRef.current != null;
    clearDrag();
    clickOriginRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
    if (!wasDragging) return;

    if (Math.round(targetRef.current) !== i) {
      goToRef.current(i);
      return;
    }

    if (
      origin &&
      Math.hypot(event.clientX - origin.x, event.clientY - origin.y) <
        DRAG_LIFT_PX
    ) {
      setActive(obra);
    }
  };

  const onCajaClick = (i: number, isFocus: boolean) => {
    if (!isFocus) {
      goToRef.current(i);
      return;
    }
    setOpenGuardados(true);
  };

  if (total === 0) {
    return null;
  }

  return (
    <>
      <div
        className={`flex min-h-0 w-full flex-1 flex-col ${lift ? "invisible" : ""}`}
        aria-hidden={lift ? true : undefined}
      >
        <div
          ref={rootRef}
          className="relative min-h-0 w-full flex-1 overflow-hidden"
          onTouchStart={(event) => {
            if (lift) return;
            touchStartX.current = event.touches[0]?.clientX ?? null;
            touchStartPos.current = positionRef.current;
            if (rafRef.current !== null) {
              cancelAnimationFrame(rafRef.current);
              rafRef.current = null;
            }
          }}
          onTouchMove={(event) => {
            if (lift || touchStartX.current == null || !ribbonRef.current)
              return;
            if (dragStartRef.current) return;
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
            if (lift) return;
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
            {items.map((item, i) => {
              if (i < renderMin || i > renderMax) {
                return (
                  <div
                    key={item.key}
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
              const cardStyle = {
                width: `min(${CARD_VW}vw, 42vh)`,
                opacity,
                transform: `scale(${scale})`,
              } as const;

              if (item.kind === "caja") {
                return (
                  <button
                    key={item.key}
                    type="button"
                    data-perfil-card
                    onClick={() => onCajaClick(i, isFocus)}
                    className="relative flex aspect-[2/3] shrink-0 flex-col items-center justify-center gap-3 px-2 transition-[opacity,transform] duration-300 touch-manipulation"
                    style={cardStyle}
                    aria-label="Guardados"
                  >
                    <CartonBoxIcon scale={isFocus ? 1.05 : 0.9} />
                    <p className="text-center text-[16px] font-normal leading-none tracking-wide text-white">
                      Guardados
                    </p>
                  </button>
                );
              }

              const { obra } = item;
              return (
                <button
                  key={item.key}
                  type="button"
                  data-perfil-card
                  onPointerDown={(e) => onObraPointerDown(e, obra, isFocus)}
                  onPointerMove={onObraPointerMove}
                  onPointerUp={(e) => onObraPointerUp(e, obra, i)}
                  onPointerCancel={clearDrag}
                  onClick={(e) => e.preventDefault()}
                  className="relative aspect-[2/3] shrink-0 overflow-hidden text-left transition-[opacity,transform] duration-300 touch-manipulation"
                  style={cardStyle}
                  aria-label={`#${obra.retoNumero} ${obra.retoTitulo}. Arrastra para guardar.`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={obra.imageUrl}
                    alt=""
                    className="pointer-events-none h-full w-full object-cover select-none"
                    draggable={false}
                    loading={isFocus ? "eager" : "lazy"}
                    decoding="async"
                  />
                </button>
              );
            })}
          </div>
        </div>

        {active && !lift ? (
          <RetoVideoPlayer
            item={active}
            retoNumero={active.retoNumero}
            retoTitulo={active.retoTitulo}
            onClose={() => setActive(null)}
          />
        ) : null}
      </div>

      {lift ? (
        <PerfilLiftOverlay
          lift={lift}
          onCancel={() => setLift(null)}
          onDropInFolder={() => {
            if (!isOwnUsername(lift.obra.username, viewerUsernameFromUser(user))) {
              saveObraToCaja(lift.obra);
            }
            setLift(null);
          }}
        />
      ) : null}

      {openGuardados ? (
        <PerfilCajaOverlay
          cajas={cajas}
          user={user}
          onClose={() => setOpenGuardados(false)}
        />
      ) : null}
    </>
  );
}
