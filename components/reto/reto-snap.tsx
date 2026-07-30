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
  /** Padding bajo header en el feed; su altura anima a la par del snap. */
  const [feedHeaderPad, setFeedHeaderPad] = useState(false);
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

    const node = feedScrollRef.current;
    if (node) node.scrollTop = 0;

    // Padding del header: se anima con la misma duración que el snap
    // (si se quita al final, las miniaturas del peek aparecen de golpe).
    setFeedHeaderPad(next === 1);

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

      if (panelRef.current === 0) {
        if (delta > 0) {
          event.preventDefault();
          goTo(1);
        }
        return;
      }

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
        className="h-full will-change-transform"
        style={{
          transform:
            panel === 0
              ? `translate3d(0, -${PEEK_VH}vh, 0)`
              : "translate3d(0, -100%, 0)",
          transition: `transform ${TRANSITION_MS}ms cubic-bezier(0.33, 1, 0.32, 1)`,
        }}
      >
        <section className="relative h-full px-[18px]">
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
            className="h-full overflow-y-auto overscroll-none scrollbar-none px-[18px] pb-16"
          >
            <div
              aria-hidden
              className="shrink-0"
              style={{
                height: feedHeaderPad ? 96 : 0,
                transition: `height ${TRANSITION_MS}ms cubic-bezier(0.33, 1, 0.32, 1)`,
              }}
            />
            {feed}
          </div>
        </section>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-40 bg-gradient-to-t from-black via-black/75 to-transparent transition-opacity duration-300"
        style={{
          height: `${PEEK_VH + 6}vh`,
          opacity: panel === 0 ? 1 : 0,
        }}
      />
    </div>
  );
}
