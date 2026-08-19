"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSearchOverlay } from "@/components/archivos/search-overlay-provider";
import { useDiccionario } from "@/components/diccionario/diccionario-provider";

const TRANSITION_MS = 480;
const WHEEL_THRESHOLD = 12;
const PEEK_VH_DESKTOP = 12;
const PEEK_VH_MOBILE = 16;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

type RetoFeedNavCtx = {
  setAtTop: (atTop: boolean) => void;
  requestExitToTitle: () => boolean;
  /** Cambia al entrar/salir del feed para fijar el peek en el origen. */
  feedSession: number;
  /** Solo true en el panel del feed (pan/rueda activos). */
  feedActive: boolean;
};

const RetoFeedNavContext = createContext<RetoFeedNavCtx | null>(null);

export function useRetoFeedNav(): RetoFeedNavCtx {
  const ctx = useContext(RetoFeedNavContext);
  if (!ctx) {
    throw new Error("useRetoFeedNav must be used within RetoSnap");
  }
  return ctx;
}

type RetoSnapProps = {
  header: ReactNode;
  hero: ReactNode;
  feed: ReactNode;
};

/**
 * Snap título ↔ feed. El feed es un lienzo 2D (pan infinito).
 */
export function RetoSnap({ header, hero, feed }: RetoSnapProps) {
  const { isOpen: searchOpen } = useSearchOverlay();
  const { isOpen: diccionarioOpen } = useDiccionario();
  const searchOpenRef = useRef(searchOpen);
  const diccionarioOpenRef = useRef(diccionarioOpen);

  const [panel, setPanel] = useState(0);
  const [feedSession, setFeedSession] = useState(0);
  const [peekVh, setPeekVh] = useState(() => {
    if (typeof window === "undefined") return PEEK_VH_DESKTOP;
    return window.matchMedia("(max-width: 767px)").matches
      ? PEEK_VH_MOBILE
      : PEEK_VH_DESKTOP;
  });

  const panelRef = useRef(0);
  const lockedRef = useRef(false);
  const atTopRef = useRef(true);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => {
      setPeekVh(mq.matches ? PEEK_VH_MOBILE : PEEK_VH_DESKTOP);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    searchOpenRef.current = searchOpen;
  }, [searchOpen]);

  useEffect(() => {
    diccionarioOpenRef.current = diccionarioOpen;
  }, [diccionarioOpen]);

  const goTo = useCallback((next: number) => {
    if (lockedRef.current) return;
    if (next === panelRef.current) return;
    if (next < 0 || next > 1) return;

    lockedRef.current = true;
    panelRef.current = next;
    setPanel(next);

    // Siempre volver al origen del grid: el peek bajo el título se ve igual.
    setFeedSession((n) => n + 1);
    atTopRef.current = true;

    window.setTimeout(() => {
      lockedRef.current = false;
    }, TRANSITION_MS + 40);
  }, []);

  const setAtTop = useCallback((atTop: boolean) => {
    atTopRef.current = atTop;
  }, []);

  const requestExitToTitle = useCallback(() => {
    if (panelRef.current !== 1 || lockedRef.current) return false;
    if (!atTopRef.current) return false;
    goTo(0);
    return true;
  }, [goTo]);

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      if (searchOpenRef.current || diccionarioOpenRef.current) return;
      if (lockedRef.current) {
        event.preventDefault();
        return;
      }

      if (panelRef.current === 0) {
        const delta = event.deltaY;
        if (Math.abs(delta) < WHEEL_THRESHOLD) return;
        if (delta > 0) {
          event.preventDefault();
          goTo(1);
        }
      }
      // Panel feed: el lienzo infinito gestiona la rueda y la salida al título.
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [goTo]);

  useEffect(() => {
    const onTouchStart = (event: TouchEvent) => {
      if (searchOpenRef.current || diccionarioOpenRef.current) return;
      // En el feed el pan táctil lo gestiona el lienzo; solo snap desde el título.
      if (panelRef.current === 1) {
        touchStartY.current = null;
        return;
      }
      touchStartY.current = event.touches[0]?.clientY ?? null;
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (searchOpenRef.current || diccionarioOpenRef.current) return;
      if (touchStartY.current == null || lockedRef.current) return;
      const endY = event.changedTouches[0]?.clientY;
      if (endY == null) return;

      const delta = touchStartY.current - endY;
      touchStartY.current = null;
      if (Math.abs(delta) < 50) return;

      if (panelRef.current === 0 && delta > 0) {
        goTo(1);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [goTo]);

  return (
    <RetoFeedNavContext.Provider
      value={{
        setAtTop,
        requestExitToTitle,
        feedSession,
        feedActive: panel === 1,
      }}
    >
      <div className="relative h-full overflow-hidden bg-black text-white">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-50 bg-transparent">
          <div className="pointer-events-auto bg-transparent [&_header]:bg-transparent">
            {header}
          </div>
        </div>

        <div className="relative h-full overflow-hidden">
          <div
            className="flex h-[200%] flex-col will-change-transform"
            style={{
              transform:
                panel === 0
                  ? `translate3d(0, -${peekVh}vh, 0)`
                  : "translate3d(0, -50%, 0)",
              transition: `transform ${TRANSITION_MS}ms ${EASE}`,
            }}
          >
            <section className="relative h-1/2 overflow-hidden px-[18px]">
              <div
                className="absolute inset-x-0 flex -translate-y-1/2 items-center justify-center px-[18px]"
                style={{ top: `calc(50% + ${peekVh / 2}vh)` }}
              >
                {hero}
              </div>
            </section>

            <section className="relative h-1/2 min-h-0 overflow-hidden bg-black">
              <div
                className={`h-full w-full ${panel === 0 ? "pointer-events-none" : ""}`}
              >
                {feed}
              </div>
            </section>
          </div>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-40 bg-gradient-to-t from-black/40 via-black/10 to-transparent transition-opacity duration-300 max-md:from-black/25 max-md:via-transparent"
          style={{
            height: `${Math.min(peekVh, 18)}vh`,
            opacity: panel === 0 ? 1 : 0,
          }}
        />
      </div>
    </RetoFeedNavContext.Provider>
  );
}
