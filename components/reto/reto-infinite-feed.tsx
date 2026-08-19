"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import type { RetoFeedItem } from "@/lib/mocks/reto-feed";
import { isOwnUsername, perfilHref } from "@/lib/mocks/perfil";
import { useRetoFeedNav } from "@/components/reto/reto-snap";

const TILE_XY = [-1, 0, 1] as const;
const DRAG_THRESHOLD = 6;
const AT_TOP_PX = 28;
/** Holgura táctil: menos que esto no cancela el hold ni inicia el pan. */
const TOUCH_SLOP_PX = 14;
/** En móvil solo se guarda manteniendo, no arrastrando. */
const LIFT_HOLD_MS = 420;
const PAN_GAIN_TOUCH = 1.85;
const PAN_GAIN_WHEEL = 1.5;
const INERTIA_FRICTION = 0.78;
const INERTIA_MIN_PX = 1.4;

type RetoInfiniteFeedProps = {
  items: RetoFeedItem[];
  onOpen: (item: RetoFeedItem) => void;
  onLiftStart?: (
    item: RetoFeedItem,
    el: HTMLElement,
    clientX: number,
    clientY: number,
  ) => void;
  lifting?: boolean;
  /** Username del visitante: no se pueden guardar vídeos propios. */
  ownUsername?: string | null;
};

function wrapCentered(value: number, size: number) {
  if (size <= 0) return 0;
  let r = ((value % size) + size) % size;
  if (r > size / 2) r -= size;
  return r;
}

function PosterGrid({
  items,
  onOpen,
  onLiftStart,
  suppressClickRef,
  cancelPanRef,
  cancelHoldRef,
  ownUsername,
  eagerCount = 0,
}: {
  items: RetoFeedItem[];
  onOpen: (item: RetoFeedItem) => void;
  onLiftStart?: RetoInfiniteFeedProps["onLiftStart"];
  suppressClickRef: MutableRefObject<boolean>;
  cancelPanRef: MutableRefObject<() => void>;
  cancelHoldRef: MutableRefObject<Set<() => void>>;
  ownUsername?: string | null;
  /** Primeras N imágenes en eager para el peek móvil. */
  eagerCount?: number;
}) {
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressRef = useRef<{
    item: RetoFeedItem;
    el: HTMLElement;
    originX: number;
    originY: number;
    x: number;
    y: number;
    pointerId: number;
    lifted: boolean;
    isTouch: boolean;
  } | null>(null);

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current != null) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const cancelHold = useCallback(() => {
    clearHoldTimer();
    const press = pressRef.current;
    if (press?.lifted) return;
    pressRef.current = null;
  }, [clearHoldTimer]);

  const beginLift = useCallback(
    (clientX: number, clientY: number) => {
      const press = pressRef.current;
      if (!press || press.lifted || !onLiftStart) return;
      press.lifted = true;
      clearHoldTimer();
      cancelPanRef.current();
      suppressClickRef.current = true;
      window.getSelection()?.removeAllRanges();
      onLiftStart(press.item, press.el, clientX, clientY);
    },
    [cancelPanRef, clearHoldTimer, onLiftStart, suppressClickRef],
  );

  useEffect(() => {
    cancelHoldRef.current.add(cancelHold);
    return () => {
      cancelHoldRef.current.delete(cancelHold);
    };
  }, [cancelHold, cancelHoldRef]);

  useEffect(
    () => () => {
      clearHoldTimer();
      pressRef.current = null;
    },
    [clearHoldTimer],
  );

  return (
    <ul className="m-0 box-border grid w-screen list-none grid-cols-2 gap-x-4 gap-y-10 p-0 px-4 pb-10 sm:grid-cols-3 sm:gap-x-6 md:grid-cols-5 md:gap-x-8 md:gap-y-14 md:px-6">
      {items.map((item, index) => (
        <li key={item.id} className="relative min-w-0">
          <button
            type="button"
            onContextMenu={(event) => event.preventDefault()}
            onPointerDown={(event) => {
              if (event.button !== 0 || !onLiftStart) return;
              if (isOwnUsername(item.username, ownUsername)) return;
              const isTouch =
                event.pointerType === "touch" || event.pointerType === "pen";
              if (!isTouch) {
                event.stopPropagation();
              }
              const el = event.currentTarget;
              pressRef.current = {
                item,
                el,
                originX: event.clientX,
                originY: event.clientY,
                x: event.clientX,
                y: event.clientY,
                pointerId: event.pointerId,
                lifted: false,
                isTouch,
              };
              clearHoldTimer();
              if (isTouch) {
                holdTimerRef.current = setTimeout(() => {
                  holdTimerRef.current = null;
                  const press = pressRef.current;
                  if (!press || press.lifted) return;
                  beginLift(press.x, press.y);
                }, LIFT_HOLD_MS);
              } else {
                try {
                  el.setPointerCapture(event.pointerId);
                } catch {
                  /* ignore */
                }
              }
            }}
            onPointerMove={(event) => {
              const press = pressRef.current;
              if (!press || press.lifted) return;
              press.x = event.clientX;
              press.y = event.clientY;
              const dist = Math.hypot(
                event.clientX - press.originX,
                event.clientY - press.originY,
              );
              if (press.isTouch) {
                if (dist >= TOUCH_SLOP_PX) cancelHold();
                return;
              }
              if (dist < TOUCH_SLOP_PX) return;
              beginLift(event.clientX, event.clientY);
            }}
            onPointerUp={(event) => {
              const press = pressRef.current;
              const wasLifted = press?.lifted ?? false;
              if (!wasLifted) {
                clearHoldTimer();
                pressRef.current = null;
              }
              try {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }
              } catch {
                /* ignore */
              }
              if (wasLifted) {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
            onPointerCancel={() => {
              /* iOS cancela el pointer en el long-press; el hold sigue. */
            }}
            onClick={(event) => {
              if (suppressClickRef.current) {
                event.preventDefault();
                event.stopPropagation();
                return;
              }
              onOpen(item);
            }}
            className="group relative z-0 block w-full cursor-pointer overflow-visible text-left select-none touch-none [-webkit-touch-callout:none] [-webkit-user-select:none] hover:z-10"
            aria-label={`Ver ${item.titulo} de ${item.username}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imageUrl}
              alt=""
              className="pointer-events-none aspect-[2/3] w-full origin-bottom rounded-none object-cover transition-transform duration-200 ease-out group-hover:scale-[1.07] select-none [-webkit-touch-callout:none] [-webkit-user-select:none]"
              loading={index < eagerCount ? "eager" : "lazy"}
              decoding="async"
              draggable={false}
            />
          </button>
          <Link
            href={perfilHref(item.username)}
            className="relative z-20 mt-2 block truncate text-[18px] font-normal leading-none tracking-wide text-white select-none [-webkit-touch-callout:none] hover:underline"
            onClick={(event) => {
              if (suppressClickRef.current) {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
            draggable={false}
          >
            {item.username}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Lienzo infinito 2D: arrastrar (dedo o clic medio) y rueda en 4 direcciones.
 * Grid repetido en tiles 3×3 con wrap del offset.
 */
function RetoDesktopInfiniteFeed({
  items,
  onOpen,
  onLiftStart,
  lifting = false,
  ownUsername = null,
}: RetoInfiniteFeedProps) {
  const { setAtTop, requestExitToTitle, feedSession, feedActive } =
    useRetoFeedNav();

  const feedActiveRef = useRef(feedActive);
  useEffect(() => {
    feedActiveRef.current = feedActive;
  }, [feedActive]);

  const liftingRef = useRef(lifting);

  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const suppressClickRef = useRef(false);
  const cancelPanRef = useRef<() => void>(() => {});
  const cancelHoldRef = useRef<Set<() => void>>(new Set());

  const offsetRef = useRef({ x: 0, y: 0 });
  const absYRef = useRef(0);
  const tileSizeRef = useRef({ w: 1, h: 1 });
  const draggingRef = useRef(false);
  const trackingRef = useRef(false);
  const movedRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const pointerStartRef = useRef({ x: 0, y: 0, absY: 0 });
  const isTouchPointerRef = useRef(false);
  const velRef = useRef({ x: 0, y: 0 });
  const lastMoveAtRef = useRef(0);
  const inertiaRafRef = useRef<number | null>(null);

  useEffect(() => {
    if (lifting) {
      suppressClickRef.current = true;
      return;
    }
    const id = window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 80);
    return () => window.clearTimeout(id);
  }, [lifting]);

  const [tileSize, setTileSize] = useState({ w: 900, h: 1400 });

  const applyTransform = useCallback(() => {
    const node = worldRef.current;
    if (!node) return;
    const { x, y } = offsetRef.current;
    node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }, []);

  const updateAtTop = useCallback(() => {
    setAtTop(absYRef.current >= -AT_TOP_PX);
  }, [setAtTop]);

  const stopInertia = useCallback(() => {
    if (inertiaRafRef.current != null) {
      cancelAnimationFrame(inertiaRafRef.current);
      inertiaRafRef.current = null;
    }
    velRef.current = { x: 0, y: 0 };
  }, []);

  useEffect(() => {
    liftingRef.current = lifting;
    if (lifting) stopInertia();
  }, [lifting, stopInertia]);

  const panBy = useCallback(
    (dx: number, dy: number) => {
      const { w, h } = tileSizeRef.current;
      absYRef.current += dy;
      offsetRef.current = {
        x: wrapCentered(offsetRef.current.x + dx, w),
        y: wrapCentered(offsetRef.current.y + dy, h),
      };
      applyTransform();
      updateAtTop();
    },
    [applyTransform, updateAtTop],
  );

  const coast = useCallback(() => {
    const { x, y } = velRef.current;
    if (Math.hypot(x, y) < INERTIA_MIN_PX) {
      inertiaRafRef.current = null;
      velRef.current = { x: 0, y: 0 };
      return;
    }
    panBy(x, y);
    velRef.current = {
      x: x * INERTIA_FRICTION,
      y: y * INERTIA_FRICTION,
    };
    inertiaRafRef.current = requestAnimationFrame(coast);
  }, [panBy]);

  cancelPanRef.current = () => {
    draggingRef.current = false;
    trackingRef.current = false;
    movedRef.current = false;
    stopInertia();
  };

  useLayoutEffect(() => {
    const node = measureRef.current;
    if (!node) return;

    const measure = () => {
      const w = Math.ceil(node.offsetWidth);
      const h = Math.ceil(node.offsetHeight);
      if (w > 0 && h > 0) {
        tileSizeRef.current = { w, h };
        setTileSize({ w, h });
        offsetRef.current = {
          x: wrapCentered(offsetRef.current.x, w),
          y: wrapCentered(offsetRef.current.y, h),
        };
        applyTransform();
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, [applyTransform, items]);

  useEffect(() => {
    offsetRef.current = { x: 0, y: 0 };
    absYRef.current = 0;
    applyTransform();
    updateAtTop();
  }, [feedSession, applyTransform, updateAtTop]);

  useEffect(() => () => stopInertia(), [stopInertia]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheel = (event: WheelEvent) => {
      if (!feedActiveRef.current || liftingRef.current) return;

      event.preventDefault();
      event.stopPropagation();

      const dy = event.deltaY;
      const dx = event.deltaX;

      if (
        dy < 0 &&
        Math.abs(dy) >= Math.abs(dx) &&
        absYRef.current >= -AT_TOP_PX
      ) {
        if (requestExitToTitle()) return;
      }

      panBy(-dx * PAN_GAIN_WHEEL, -dy * PAN_GAIN_WHEEL);
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    const blockNative = (event: Event) => event.preventDefault();
    viewport.addEventListener("contextmenu", blockNative);
    viewport.addEventListener("selectstart", blockNative);
    return () => {
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("contextmenu", blockNative);
      viewport.removeEventListener("selectstart", blockNative);
    };
  }, [panBy, requestExitToTitle]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const isTouch =
      event.pointerType === "touch" || event.pointerType === "pen";
    if (isTouch) {
      if (event.button !== 0) return;
    } else if (event.button !== 1) {
      return;
    }
    if (!feedActiveRef.current || liftingRef.current) return;
    if (!isTouch) event.preventDefault();
    window.getSelection()?.removeAllRanges();

    isTouchPointerRef.current = isTouch;
    trackingRef.current = true;
    draggingRef.current = !isTouch;
    movedRef.current = false;
    stopInertia();
    velRef.current = { x: 0, y: 0 };
    lastMoveAtRef.current = performance.now();
    lastPointerRef.current = { x: event.clientX, y: event.clientY };
    pointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      absY: absYRef.current,
    };
    if (!isTouch) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!trackingRef.current || liftingRef.current) return;

    const totalDx = event.clientX - pointerStartRef.current.x;
    const totalDy = event.clientY - pointerStartRef.current.y;
    const slop = isTouchPointerRef.current ? TOUCH_SLOP_PX : DRAG_THRESHOLD;

    if (!movedRef.current) {
      if (Math.hypot(totalDx, totalDy) < slop) return;
      movedRef.current = true;
      draggingRef.current = true;
      suppressClickRef.current = true;
      window.getSelection()?.removeAllRanges();
      cancelHoldRef.current.forEach((cancel) => cancel());
      if (isTouchPointerRef.current) {
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          /* ignore */
        }
      }
    }

    if (!draggingRef.current) return;

    const dx = event.clientX - lastPointerRef.current.x;
    const dy = event.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: event.clientX, y: event.clientY };
    const gain = isTouchPointerRef.current ? PAN_GAIN_TOUCH : PAN_GAIN_WHEEL;
    const gx = dx * gain;
    const gy = dy * gain;
    const now = performance.now();
    const dt = Math.max(8, now - lastMoveAtRef.current);
    lastMoveAtRef.current = now;
    velRef.current = { x: (gx / dt) * 16.67, y: (gy / dt) * 16.67 };
    panBy(gx, gy);
  };

  const endPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!trackingRef.current && !draggingRef.current) return;
    trackingRef.current = false;
    draggingRef.current = false;

    const didPan = movedRef.current;
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      /* ignore */
    }

    if (didPan) {
      const totalDy = event.clientY - pointerStartRef.current.y;
      const totalDx = event.clientX - pointerStartRef.current.x;
      if (
        pointerStartRef.current.absY >= -AT_TOP_PX &&
        totalDy > 120 &&
        Math.abs(totalDx) < 90
      ) {
        requestExitToTitle();
      } else if (performance.now() - lastMoveAtRef.current < 80) {
        inertiaRafRef.current = requestAnimationFrame(coast);
      }
      window.setTimeout(() => {
        suppressClickRef.current = false;
        movedRef.current = false;
      }, 50);
      return;
    }

    suppressClickRef.current = false;
    movedRef.current = false;
  };

  return (
    <div
      ref={viewportRef}
      className="relative h-full w-full touch-none select-none overflow-hidden overscroll-none [-webkit-touch-callout:none] [-webkit-user-select:none]"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onAuxClick={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
      data-reto-infinite-feed=""
    >
      <div
        ref={worldRef}
        className="absolute left-0 top-0 will-change-transform"
        style={{ transform: "translate3d(0, 0, 0)" }}
      >
        {TILE_XY.map((ty) =>
          TILE_XY.map((tx) => {
            const isMeasure = tx === 0 && ty === 0;
            return (
              <div
                key={`${tx}:${ty}`}
                ref={isMeasure ? measureRef : undefined}
                className="absolute left-0 top-0 w-screen"
                style={{
                  transform: `translate3d(${tx * tileSize.w}px, ${ty * tileSize.h}px, 0)`,
                }}
                aria-hidden={isMeasure ? undefined : true}
              >
                <PosterGrid
                  items={items}
                  onOpen={onOpen}
                  onLiftStart={onLiftStart}
                  suppressClickRef={suppressClickRef}
                  cancelPanRef={cancelPanRef}
                  cancelHoldRef={cancelHoldRef}
                  ownUsername={ownUsername}
                  eagerCount={isMeasure ? 6 : 0}
                />
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}

/**
 * Feed del reto: lienzo infinito 2D (dedo en móvil, clic medio en desktop).
 */
export function RetoInfiniteFeed(props: RetoInfiniteFeedProps) {
  return <RetoDesktopInfiniteFeed {...props} />;
}
