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
/** Igual que en el perfil: arrastrar el póster lo agarra. */
const LIFT_DRAG_PX = 8;
const LIFT_HOLD_MS = 350;

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

function useIsMobileNav() {
  const [mobile, setMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 767px)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return mobile;
}

function PosterGrid({
  items,
  onOpen,
  onLiftStart,
  suppressClickRef,
  cancelPanRef,
  ownUsername,
  eagerCount = 0,
}: {
  items: RetoFeedItem[];
  onOpen: (item: RetoFeedItem) => void;
  onLiftStart?: RetoInfiniteFeedProps["onLiftStart"];
  suppressClickRef: MutableRefObject<boolean>;
  cancelPanRef: MutableRefObject<() => void>;
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
  } | null>(null);

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current != null) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const beginLift = useCallback(
    (clientX: number, clientY: number, pointerId?: number) => {
      const press = pressRef.current;
      if (!press || press.lifted || !onLiftStart) return;
      press.lifted = true;
      clearHoldTimer();
      cancelPanRef.current();
      suppressClickRef.current = true;
      if (pointerId != null) {
        try {
          if (press.el.hasPointerCapture(pointerId)) {
            press.el.releasePointerCapture(pointerId);
          }
        } catch {
          /* ignore */
        }
      }
      onLiftStart(press.item, press.el, clientX, clientY);
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 120);
    },
    [cancelPanRef, clearHoldTimer, onLiftStart, suppressClickRef],
  );

  useEffect(
    () => () => {
      clearHoldTimer();
      pressRef.current = null;
    },
    [clearHoldTimer],
  );

  return (
    <ul className="m-0 box-border grid w-full max-w-[100vw] list-none grid-cols-2 gap-x-4 gap-y-10 p-0 px-4 pb-10 sm:grid-cols-3 sm:gap-x-6 md:w-screen md:grid-cols-5 md:gap-x-8 md:gap-y-14 md:px-6">
      {items.map((item, index) => (
        <li key={item.id} className="relative min-w-0">
          <button
            type="button"
            onPointerDown={(event) => {
              if (event.button !== 0 || !onLiftStart) return;
              if (isOwnUsername(item.username, ownUsername)) return;
              const isTouch =
                event.pointerType === "touch" || event.pointerType === "pen";
              // En desktop el clic izquierdo es para agarrar; en touch el scroll
              // / pan tiene prioridad y el lift solo por hold largo.
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
              };
              clearHoldTimer();
              holdTimerRef.current = setTimeout(() => {
                holdTimerRef.current = null;
                const press = pressRef.current;
                if (!press || press.lifted) return;
                beginLift(press.x, press.y, press.pointerId);
              }, LIFT_HOLD_MS);
              if (!isTouch) {
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
              if (dist < LIFT_DRAG_PX) return;
              const isTouch =
                event.pointerType === "touch" || event.pointerType === "pen";
              if (isTouch) {
                clearHoldTimer();
                pressRef.current = null;
                return;
              }
              beginLift(event.clientX, event.clientY, event.pointerId);
            }}
            onPointerUp={(event) => {
              clearHoldTimer();
              const press = pressRef.current;
              const wasLifted = press?.lifted ?? false;
              if (!wasLifted) pressRef.current = null;
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
              clearHoldTimer();
              pressRef.current = null;
            }}
            onClick={(event) => {
              if (suppressClickRef.current) {
                event.preventDefault();
                event.stopPropagation();
                return;
              }
              onOpen(item);
            }}
            className="group relative z-0 block w-full cursor-pointer overflow-visible text-left hover:z-10"
            aria-label={`Ver ${item.titulo} de ${item.username}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imageUrl}
              alt=""
              className="pointer-events-none aspect-[2/3] w-full origin-bottom rounded-none object-cover transition-transform duration-200 ease-out group-hover:scale-[1.07] select-none"
              loading={index < eagerCount ? "eager" : "lazy"}
              decoding="async"
              draggable={false}
            />
          </button>
          <Link
            href={perfilHref(item.username)}
            className="relative z-20 mt-2 block truncate text-[18px] font-normal leading-none tracking-wide text-white select-none hover:underline"
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
 * Móvil: lista con scroll nativo (peek + deslizamiento fiables).
 */
function RetoMobileScrollFeed({
  items,
  onOpen,
  onLiftStart,
  lifting = false,
  ownUsername = null,
}: RetoInfiniteFeedProps) {
  const { setAtTop, requestExitToTitle, feedSession, feedActive } =
    useRetoFeedNav();

  const scrollerRef = useRef<HTMLDivElement>(null);
  const suppressClickRef = useRef(false);
  const cancelPanRef = useRef<() => void>(() => {});
  const touchStartY = useRef<number | null>(null);
  const feedActiveRef = useRef(feedActive);
  const liftingRef = useRef(lifting);

  useEffect(() => {
    feedActiveRef.current = feedActive;
  }, [feedActive]);

  useEffect(() => {
    liftingRef.current = lifting;
  }, [lifting]);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollTop = 0;
    setAtTop(true);
  }, [feedSession, setAtTop]);

  return (
    <div
      ref={scrollerRef}
      className="h-full w-full overflow-y-auto overscroll-y-contain scrollbar-none"
      onScroll={(event) => {
        const top = event.currentTarget.scrollTop;
        setAtTop(top <= AT_TOP_PX);
      }}
      onTouchStart={(event) => {
        if (!feedActiveRef.current || liftingRef.current) return;
        touchStartY.current = event.touches[0]?.clientY ?? null;
      }}
      onTouchEnd={(event) => {
        if (!feedActiveRef.current || liftingRef.current) return;
        if (touchStartY.current == null) return;
        const endY = event.changedTouches[0]?.clientY;
        const startY = touchStartY.current;
        touchStartY.current = null;
        if (endY == null) return;
        const node = scrollerRef.current;
        if (!node || node.scrollTop > AT_TOP_PX) return;
        // Tirar hacia abajo en el top → volver al título.
        if (endY - startY > 80) {
          requestExitToTitle();
        }
      }}
      data-reto-mobile-feed=""
    >
      <div className="px-0 pb-10 pt-2">
        <PosterGrid
          items={items}
          onOpen={onOpen}
          onLiftStart={onLiftStart}
          suppressClickRef={suppressClickRef}
          cancelPanRef={cancelPanRef}
          ownUsername={ownUsername}
          eagerCount={6}
        />
      </div>
    </div>
  );
}

/**
 * Lienzo infinito 2D (desktop): arrastrar y rueda en 4 direcciones.
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
  useEffect(() => {
    liftingRef.current = lifting;
  }, [lifting]);

  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const suppressClickRef = useRef(false);
  const cancelPanRef = useRef<() => void>(() => {});

  const offsetRef = useRef({ x: 0, y: 0 });
  const absYRef = useRef(0);
  const tileSizeRef = useRef({ w: 1, h: 1 });
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const pointerStartRef = useRef({ x: 0, y: 0, absY: 0 });

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

  cancelPanRef.current = () => {
    draggingRef.current = false;
    movedRef.current = false;
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

      panBy(-dx, -dy);
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [panBy, requestExitToTitle]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 1) return;
    if (!feedActiveRef.current || liftingRef.current) return;
    event.preventDefault();
    window.getSelection()?.removeAllRanges();

    draggingRef.current = true;
    movedRef.current = false;
    suppressClickRef.current = false;
    lastPointerRef.current = { x: event.clientX, y: event.clientY };
    pointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      absY: absYRef.current,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || liftingRef.current) return;

    const totalDx = event.clientX - pointerStartRef.current.x;
    const totalDy = event.clientY - pointerStartRef.current.y;

    if (!movedRef.current) {
      if (Math.hypot(totalDx, totalDy) < DRAG_THRESHOLD) return;
      movedRef.current = true;
      suppressClickRef.current = true;
      window.getSelection()?.removeAllRanges();
    }

    const dx = event.clientX - lastPointerRef.current.x;
    const dy = event.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: event.clientX, y: event.clientY };
    panBy(dx, dy);
  };

  const endPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
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
      className="relative h-full w-full touch-none select-none overflow-hidden overscroll-none"
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
                className="absolute left-0 top-0"
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
                  ownUsername={ownUsername}
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
 * Feed del reto: scroll nativo en móvil, lienzo infinito en desktop.
 */
export function RetoInfiniteFeed(props: RetoInfiniteFeedProps) {
  const mobile = useIsMobileNav();
  if (mobile) {
    return <RetoMobileScrollFeed {...props} />;
  }
  return <RetoDesktopInfiniteFeed {...props} />;
}
