"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSearchOverlay } from "@/components/archivos/search-overlay-provider";

const TRANSITION_MS = 480;
const WHEEL_THRESHOLD = 12;
/** Cuánto se asoma el feed bajo el título (vh). */
const PEEK_VH = 10;

type RetoSnapProps = {
  header: ReactNode;
  hero: ReactNode;
  feed: ReactNode;
};

/**
 * Snap entre título del reto (panel 0) y feed de miniaturas (panel 1).
 * En el feed el scroll es libre; solo vuelve al título si estás arriba del todo.
 */
export function RetoSnap({ header, hero, feed }: RetoSnapProps) {
  const { isOpen: searchOpen } = useSearchOverlay();
  const searchOpenRef = useRef(searchOpen);

  const [panel, setPanel] = useState(0);
  const panelRef = useRef(0);
  const lockedRef = useRef(false);
  const feedScrollRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    searchOpenRef.current = searchOpen;
  }, [searchOpen]);

  const goTo = useCallback((next: number) => {
    if (lockedRef.current) return;
    if (next === panelRef.current) return;
    if (next < 0 || next > 1) return;

    lockedRef.current = true;
    panelRef.current = next;
    setPanel(next);

    if (next === 1) {
      // Al entrar al feed, partir siempre desde arriba.
      const node = feedScrollRef.current;
      if (node) node.scrollTop = 0;
    }

    window.setTimeout(() => {
      lockedRef.current = false;
    }, TRANSITION_MS + 40);
  }, []);

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      if (searchOpenRef.current) return;
      if (lockedRef.current) {
        event.preventDefault();
        return;
      }

      const delta = event.deltaY;
      if (Math.abs(delta) < WHEEL_THRESHOLD) return;

      // Panel título → bajar al feed
      if (panelRef.current === 0) {
        if (delta > 0) {
          event.preventDefault();
          goTo(1);
        }
        return;
      }

      // Panel feed: scroll normal; solo subir al título si estamos arriba
      const feedEl = feedScrollRef.current;
      if (!feedEl) return;

      const atTop = feedEl.scrollTop <= 1;
      if (delta < 0 && atTop) {
        event.preventDefault();
        goTo(0);
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [goTo]);

  useEffect(() => {
    const onTouchStart = (event: TouchEvent) => {
      if (searchOpenRef.current) return;
      touchStartY.current = event.touches[0]?.clientY ?? null;
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (searchOpenRef.current) return;
      if (touchStartY.current == null || lockedRef.current) return;
      const endY = event.changedTouches[0]?.clientY;
      if (endY == null) return;

      const delta = touchStartY.current - endY;
      touchStartY.current = null;
      if (Math.abs(delta) < 50) return;

      if (panelRef.current === 0 && delta > 0) {
        goTo(1);
        return;
      }

      if (panelRef.current === 1 && delta < 0) {
        const feedEl = feedScrollRef.current;
        if (feedEl && feedEl.scrollTop <= 1) goTo(0);
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
    <div className="relative h-full overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-50 bg-transparent">
        <div className="pointer-events-auto bg-transparent">{header}</div>
      </div>

      <div
        className="h-full transition-transform ease-out"
        style={{
          transform:
            panel === 0
              ? `translate3d(0, -${PEEK_VH}vh, 0)`
              : "translate3d(0, -100%, 0)",
          transitionDuration: `${TRANSITION_MS}ms`,
        }}
      >
        <section className="relative h-full px-[18px]">
          {/*
           * Con el peek del feed, el bloque visible del título es (100% - PEEK).
           * Centramos ahí: top = 50% + PEEK/2 en coords de la sección
           * (compensa el translateY(-PEEK) del contenedor).
           */}
          <div
            className="absolute inset-x-0 flex -translate-y-1/2 items-center justify-center px-[18px]"
            style={{ top: `calc(50% + ${PEEK_VH / 2}vh)` }}
          >
            {hero}
          </div>
        </section>

        <section className="h-full overflow-hidden">
          <div
            ref={feedScrollRef}
            className="h-full overflow-y-auto overscroll-contain scrollbar-none px-[18px] pb-16"
          >
            {/* Espacio bajo el header solo en el feed completo; en el peek no,
                para que se asomen miniaturas de verdad. */}
            <div
              aria-hidden
              className={panel === 1 ? "h-24 shrink-0" : "h-0 shrink-0"}
            />
            {feed}
          </div>
        </section>
      </div>

      {/* Degradado suave sobre el peek para que se lea como pista, no como feed */}
      {panel === 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-40 bg-gradient-to-t from-black via-black/75 to-transparent"
          style={{ height: `${PEEK_VH + 6}vh` }}
        />
      )}
    </div>
  );
}
