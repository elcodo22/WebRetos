"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSearchOverlay } from "@/components/archivos/search-overlay-provider";

const TRANSITION_MS = 480;
const WHEEL_THRESHOLD = 12;
const PAUSE_ON_HERO_MS = 80;
const STORAGE_KEY = "animate-to-archivos";
const ARCHIVO_WHEEL_EVENT = "archivo-wheel";
const HERO_REQUEST_EVENT = "carousel-request-hero";

type HomeSnapProps = {
  header: ReactNode;
  hero: ReactNode;
  archivos: ReactNode;
};

export function HomeSnap({ header, hero, archivos }: HomeSnapProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isOpen: searchOpen } = useSearchOverlay();
  const searchOpenRef = useRef(searchOpen);

  const [panel, setPanel] = useState(0);
  const [animate, setAnimate] = useState(true);
  const panelRef = useRef(0);
  const lockedRef = useRef(false);
  const touchStartY = useRef<number | null>(null);
  const runningEntranceRef = useRef(false);

  useEffect(() => {
    searchOpenRef.current = searchOpen;
  }, [searchOpen]);

  const goTo = useCallback((next: number) => {
    if (lockedRef.current) return;
    if (next === panelRef.current) return;
    if (next < 0 || next > 1) return;

    lockedRef.current = true;
    setAnimate(true);
    panelRef.current = next;
    setPanel(next);

    const hash = next === 1 ? "#archivos" : "#reto";
    window.history.replaceState(null, "", `/${hash}`);

    window.setTimeout(() => {
      lockedRef.current = false;
    }, TRANSITION_MS + 50);
  }, []);

  /** Principal visible → animación hacia archivos. */
  const goToArchivosFromTop = useCallback(() => {
    if (lockedRef.current || runningEntranceRef.current) return;
    if (panelRef.current === 1) return;
    window.setTimeout(() => goTo(1), PAUSE_ON_HERO_MS);
  }, [goTo]);

  /** Entrada desde otra ruta: enseñar hero y bajar. */
  const playEntranceFromOtherPage = useCallback(() => {
    if (runningEntranceRef.current) return;
    runningEntranceRef.current = true;

    lockedRef.current = true;
    setAnimate(false);
    panelRef.current = 0;
    setPanel(0);
    window.history.replaceState(null, "", "/#reto");
    router.replace("/", { scroll: false });

    window.requestAnimationFrame(() => {
      setAnimate(true);
      lockedRef.current = false;
      goTo(1);
      window.setTimeout(() => {
        runningEntranceRef.current = false;
      }, TRANSITION_MS + 40);
    });
  }, [goTo, router]);

  const dispatchArchivoWheel = useCallback((delta: number) => {
    window.dispatchEvent(
      new CustomEvent(ARCHIVO_WHEEL_EVENT, { detail: { delta } }),
    );
  }, []);

  useEffect(() => {
    panelRef.current = panel;
  }, [panel]);

  useEffect(() => {
    if (pathname !== "/") return;
    const fromQuery = searchParams.get("to") === "archivos";
    const fromStorage = sessionStorage.getItem(STORAGE_KEY) === "1";
    if (!fromQuery && !fromStorage) return;
    sessionStorage.removeItem(STORAGE_KEY);
    playEntranceFromOtherPage();
  }, [pathname, searchParams, playEntranceFromOtherPage]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      if (window.location.hash === "#archivos") goToArchivosFromTop();
      else goTo(0);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [goTo, goToArchivosFromTop]);

  useEffect(() => {
    const onNavigate = () => goToArchivosFromTop();
    window.addEventListener("navigate-archivos-from-top", onNavigate);
    return () =>
      window.removeEventListener("navigate-archivos-from-top", onNavigate);
  }, [goToArchivosFromTop]);

  useEffect(() => {
    const onHeroRequest = () => goTo(0);
    window.addEventListener(HERO_REQUEST_EVENT, onHeroRequest);
    return () => window.removeEventListener(HERO_REQUEST_EVENT, onHeroRequest);
  }, [goTo]);

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      // Con la búsqueda abierta, no interceptar: deja scrollear el overlay.
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

      if (panelRef.current === 1) {
        event.preventDefault();
        dispatchArchivoWheel(delta);
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [goTo, dispatchArchivoWheel]);

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

      if (panelRef.current === 1) {
        dispatchArchivoWheel(delta);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [goTo, dispatchArchivoWheel]);

  return (
    <div className="relative h-full overflow-hidden bg-[var(--background)] text-white">
      <div className="fixed inset-x-0 top-0 z-50 bg-[var(--background)]">
        {header}
      </div>

      <div
        className="h-full will-change-transform"
        style={{
          transform: `translate3d(0, -${panel * 100}%, 0)`,
          transition: animate
            ? `transform ${TRANSITION_MS}ms cubic-bezier(0.33, 1, 0.32, 1)`
            : "none",
        }}
      >
        <section className="flex h-full flex-col overflow-hidden pt-[88px]">
          <div className="min-h-0 flex-1 overflow-hidden pt-[161px] pb-16">
            {hero}
          </div>
        </section>

        <section className="flex h-full flex-col overflow-hidden pt-[88px]">
          <div className="relative min-h-0 flex-1 overflow-hidden">
            {archivos}
          </div>
        </section>
      </div>
    </div>
  );
}
