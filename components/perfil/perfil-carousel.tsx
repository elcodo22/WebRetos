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
import { AuthRequiredPopup } from "@/components/auth/auth-required-popup";
import { PerfilCardMedia } from "@/components/perfil/perfil-card-media";

/** Ancho del póster vertical centrado. */
export const CARD_VW_DESKTOP = 34;
export const CARD_VW_MOBILE = 64;
export const CARD_MAX_VH = 56;
const GAP_VW_DESKTOP = 6;
const GAP_VW_MOBILE = 4;

function cardMetricsForWidth(width: number) {
  const mobile = width < 768;
  return {
    cardVw: mobile ? CARD_VW_MOBILE : CARD_VW_DESKTOP,
    gapVw: mobile ? GAP_VW_MOBILE : GAP_VW_DESKTOP,
  };
}

const EASE_FACTOR = 0.32;
const SNAP_EPS = 0.002;
const REST_RANGE = 2;
const WHEEL_LOCK_MS = 420;
/** En desktop, arrastrar en vertical inicia el lift. */
const DRAG_LIFT_PX = 16;
const TOUCH_SLOP_PX = 14;
const LIFT_HOLD_MS = 420;
const FOCUS_SCALE = 1.1;
const SIDE_SCALE = 0.8;

export type PerfilFocusMeta = {
  retoNumero?: string;
  retoTitulo?: string;
  obraTitulo?: string;
  retoId?: string;
  guardados?: boolean;
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
  const [profileEntry, setProfileEntry] = useState<{
    fromRect: DOMRect;
    currentTime: number;
  } | null>(null);
  const [openGuardados, setOpenGuardados] = useState(false);
  const [lift, setLift] = useState<LiftState | null>(null);
  const [authPopup, setAuthPopup] = useState(false);
  const [cardVw, setCardVw] = useState(CARD_VW_DESKTOP);
  const [gapVw, setGapVw] = useState(GAP_VW_DESKTOP);
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
  const touchStartY = useRef<number | null>(null);
  const touchStartPos = useRef(0);
  const wheelLockUntil = useRef(0);
  const goToRef = useRef<(next: number) => void>(() => {});
  const liftRef = useRef(false);
  const activeRef = useRef(false);
  const focusedVideoRef = useRef<HTMLVideoElement | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const sync = () => {
      const next = cardMetricsForWidth(window.innerWidth);
      setCardVw(next.cardVw);
      setGapVw(next.gapVw);
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    liftRef.current = lift != null;
    onLiftChange?.(lift != null);
  }, [lift, onLiftChange]);

  useEffect(() => {
    activeRef.current = active != null;
  }, [active]);

  useEffect(() => {
    indexRef.current = index;
    const item = items[index];
    if (!item) {
      onFocusChange?.(null);
      return;
    }
    if (item.kind === "caja") {
      onFocusChange?.({ guardados: true });
      return;
    }
    onFocusChange?.({
      retoNumero: item.obra.retoNumero,
      retoTitulo: item.obra.retoTitulo,
      obraTitulo: item.obra.titulo,
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
      setProfileEntry(null);
      window.requestAnimationFrame(() => {
        goToRef.current(lastParticipationIndex);
      });
    }
    window.addEventListener("perfil-go-home", onGoHome);
    return () => window.removeEventListener("perfil-go-home", onGoHome);
  }, [lastParticipationIndex]);

  const clearHold = useCallback(() => {
    if (holdTimerRef.current != null) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const clearDrag = useCallback(() => {
    dragStartRef.current = null;
    clearHold();
  }, [clearHold]);

  const beginLift = useCallback(
    (obra: PerfilObra, el: HTMLElement, clientX: number, clientY: number) => {
      if (isOwnUsername(obra.username, viewerUsernameFromUser(user))) return;
      liftRef.current = true;
      window.getSelection()?.removeAllRanges();
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
      const { cardVw: cvw, gapVw: gvw } = cardMetricsForWidth(
        window.innerWidth,
      );
      const card =
        cardEl?.offsetWidth ||
        Math.min(
          (cvw / 100) * window.innerWidth,
          (CARD_MAX_VH / 100) * window.innerHeight,
        );
      const gap = (gvw / 100) * window.innerWidth;
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
      if (liftRef.current || activeRef.current) return;
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
      // Rueda: bajar → derecha, subir → izquierda
      goTo(targetRef.current + Math.sign(dominant));
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

  const openObra = useCallback(
    (obra: PerfilObra, fromRect: DOMRect, currentTime: number) => {
      setActive(obra);
      setProfileEntry({ fromRect, currentTime });
    },
    [],
  );

  const onObraPointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    obra: PerfilObra,
    isFocus: boolean,
  ) => {
    if (event.button !== 0 || active) return;
    clickOriginRef.current = { x: event.clientX, y: event.clientY };
    window.getSelection()?.removeAllRanges();
    if (!isFocus) return;

    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      obra,
      el: event.currentTarget,
    };
    clearHold();

    if (isOwnUsername(obra.username, viewerUsernameFromUser(user))) return;

    const isTouch =
      event.pointerType === "touch" || event.pointerType === "pen";
    if (isTouch) {
      holdTimerRef.current = setTimeout(() => {
        holdTimerRef.current = null;
        const start = dragStartRef.current;
        if (!start || liftRef.current) return;
        beginLift(start.obra, start.el, start.x, start.y);
      }, LIFT_HOLD_MS);
    }
  };

  const onObraPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const start = dragStartRef.current;
    if (!start || lift) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const dist = Math.hypot(dx, dy);
    const isTouch =
      event.pointerType === "touch" || event.pointerType === "pen";
    if (isTouch) {
      if (dist >= TOUCH_SLOP_PX) clearHold();
      return;
    }
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
      clearDrag();
      return;
    }
    if (Math.abs(dy) >= DRAG_LIFT_PX && Math.abs(dy) > Math.abs(dx)) {
      beginLift(start.obra, start.el, event.clientX, event.clientY);
    }
  };

  const onObraPointerUp = (
    event: ReactPointerEvent<HTMLButtonElement>,
    obra: PerfilObra,
    i: number,
  ) => {
    if (lift || active) return;
    const origin = clickOriginRef.current;
    clearDrag();
    clickOriginRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }

    const isTap =
      origin != null &&
      Math.hypot(event.clientX - origin.x, event.clientY - origin.y) < 10;

    const isFocused = Math.round(targetRef.current) === i;

    if (isTap) {
      if (!isFocused) {
        goToRef.current(i);
        return;
      }
      openObra(
        obra,
        event.currentTarget.getBoundingClientRect(),
        focusedVideoRef.current?.currentTime ?? 0,
      );
      return;
    }

    if (!isFocused) {
      goToRef.current(i);
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
          className="relative min-h-0 w-full flex-1 overflow-hidden touch-none select-none [-webkit-touch-callout:none] [-webkit-user-select:none]"
          onContextMenu={(event) => event.preventDefault()}
          onTouchStart={(event) => {
            if (lift || active) return;
            touchStartX.current = event.touches[0]?.clientX ?? null;
            touchStartY.current = event.touches[0]?.clientY ?? null;
            touchStartPos.current = positionRef.current;
            window.getSelection()?.removeAllRanges();
            if (rafRef.current !== null) {
              cancelAnimationFrame(rafRef.current);
              rafRef.current = null;
            }
          }}
          onTouchMove={(event) => {
            if (lift || active || touchStartX.current == null || !ribbonRef.current)
              return;
            const x = event.touches[0]?.clientX;
            const y = event.touches[0]?.clientY;
            if (x == null) return;
            const dx = x - touchStartX.current;
            const dy =
              y != null && touchStartY.current != null
                ? y - touchStartY.current
                : 0;
            if (holdTimerRef.current != null) {
              if (Math.hypot(dx, dy) < TOUCH_SLOP_PX) {
                event.preventDefault();
                return;
              }
              clearHold();
            }
            const { pad, slot } = metricsRef.current;
            if (slot <= 0) return;
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
            if (lift || active) return;
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
            style={{ gap: `${gapVw}vw` }}
          >
            {items.map((item, i) => {
              if (i < renderMin || i > renderMax) {
                return (
                  <div
                    key={item.key}
                    data-perfil-card
                    className="aspect-video shrink-0"
                    style={{ width: `min(${cardVw}vw, ${CARD_MAX_VH}vh)` }}
                    aria-hidden
                  />
                );
              }

              const dist = Math.abs(i - index);
              const isFocus = dist < 0.5;
              const opacity = isFocus ? 1 : dist < 1.5 ? 0.45 : 0;
              const scale = isFocus ? FOCUS_SCALE : SIDE_SCALE;
              const cardStyle = {
                width: `min(${cardVw}vw, ${CARD_MAX_VH}vh)`,
                opacity,
                transform: `scale(${scale})`,
              } as const;

              if (item.kind === "caja") {
                return (
                  <div
                    key={item.key}
                    className="flex shrink-0 flex-col items-center transition-[opacity,transform] duration-300"
                    style={cardStyle}
                  >
                    <button
                      type="button"
                      data-perfil-card
                      onClick={() => onCajaClick(i, isFocus)}
                      className="relative flex aspect-video w-full flex-col items-center justify-center px-2 touch-manipulation"
                      aria-label="Guardados"
                    >
                      <CartonBoxIcon scale={isFocus ? 1.05 : 0.9} />
                    </button>
                  </div>
                );
              }

              const { obra } = item;
              const isOpeningThis = active?.id === obra.id;
              return (
                <div
                  key={item.key}
                  className="flex shrink-0 flex-col items-center transition-[opacity,transform] duration-300"
                  style={{
                    ...cardStyle,
                    opacity: isOpeningThis ? 0 : opacity,
                  }}
                >
                  <button
                    type="button"
                    data-perfil-card
                    onPointerDown={(e) => onObraPointerDown(e, obra, isFocus)}
                    onPointerMove={onObraPointerMove}
                    onPointerUp={(e) => onObraPointerUp(e, obra, i)}
                    onPointerCancel={clearDrag}
                    onContextMenu={(e) => e.preventDefault()}
                    onClick={(e) => e.preventDefault()}
                    className="relative aspect-video w-full overflow-hidden text-left select-none touch-none [-webkit-touch-callout:none] [-webkit-user-select:none]"
                    aria-label={`#${obra.retoNumero} ${obra.retoTitulo}. Pulsa para ver el vídeo.`}
                  >
                    <PerfilCardMedia
                      ref={isFocus ? focusedVideoRef : null}
                      videoUrl={obra.videoUrl}
                      videoUid={obra.videoUid}
                      playing={isFocus && !active}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {active && !lift ? (
          <RetoVideoPlayer
            item={active}
            items={obras}
            onChangeItem={(next) => {
              const found = obras.find((obra) => obra.id === next.id);
              if (found) setActive(found);
            }}
            retoNumero={active.retoNumero}
            retoTitulo={active.retoTitulo}
            retoDescripcion={active.retoDescripcion}
            retoId={active.retoId}
            user={user}
            skipEnterFade
            profileEntry={profileEntry}
            onClose={() => {
              setActive(null);
              setProfileEntry(null);
            }}
          />
        ) : null}
      </div>

      {lift ? (
        <PerfilLiftOverlay
          lift={lift}
          onCancel={() => setLift(null)}
          requireAuth={!user}
          onAuthRequired={() => {
            setLift(null);
            setAuthPopup(true);
          }}
          onDropInFolder={
            user
              ? () => {
                  setLift(null);
                  if (
                    isOwnUsername(
                      lift.obra.username,
                      viewerUsernameFromUser(user),
                    )
                  ) {
                    return;
                  }
                  saveObraToCaja(lift.obra);
                }
              : undefined
          }
        />
      ) : null}

      {openGuardados ? (
        <PerfilCajaOverlay
          cajas={cajas}
          user={user}
          onClose={() => setOpenGuardados(false)}
        />
      ) : null}

      <AuthRequiredPopup
        open={authPopup}
        onClose={() => setAuthPopup(false)}
      />
    </>
  );
}
