"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSearchOverlay } from "@/components/archivos/search-overlay-provider";
import { useDiccionario } from "@/components/diccionario/diccionario-provider";
import { useCrtPower } from "@/components/layout/crt-power-transition";
import {
  ParticiparCursor,
  isParticiparClickTarget,
} from "@/components/layout/participar-cursor";
import { RETO_DETALLE_EVENT } from "@/components/reto/reto-hero";

const TRANSITION_MS = 820;
const TRANSITION_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";
const WHEEL_THRESHOLD = 12;
const PAUSE_ON_HERO_MS = 80;
const STORAGE_KEY = "animate-to-archivos";
const ARCHIVO_WHEEL_EVENT = "archivo-wheel";
const HERO_REQUEST_EVENT = "carousel-request-hero";

type HomeSnapProps = {
  header: ReactNode;
  hero: ReactNode;
  archivos: ReactNode;
  participarHref?: string;
};

export function HomeSnap({
  header,
  hero,
  archivos,
  participarHref,
}: HomeSnapProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { powerOffTo } = useCrtPower();
  const { isOpen: searchOpen } = useSearchOverlay();
  const { isOpen: diccionarioOpen } = useDiccionario();
  const searchOpenRef = useRef(searchOpen);
  const diccionarioOpenRef = useRef(diccionarioOpen);

  const [panel, setPanel] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const panelRef = useRef(0);
  const lockedRef = useRef(false);
  const touchStartY = useRef<number | null>(null);
  const runningEntranceRef = useRef(false);
  const detalleOpenRef = useRef(false);

  useEffect(() => {
    searchOpenRef.current = searchOpen;
  }, [searchOpen]);

  useEffect(() => {
    diccionarioOpenRef.current = diccionarioOpen;
  }, [diccionarioOpen]);

  useEffect(() => {
    detalleOpenRef.current = detalleOpen;
  }, [detalleOpen]);

  useEffect(() => {
    function onDetalle(event: Event) {
      const open = Boolean(
        (event as CustomEvent<{ open?: boolean }>).detail?.open,
      );
      setDetalleOpen(open);
      detalleOpenRef.current = open;
    }

    window.addEventListener(RETO_DETALLE_EVENT, onDetalle);
    return () => window.removeEventListener(RETO_DETALLE_EVENT, onDetalle);
  }, []);

  const goTo = useCallback((next: number) => {
    if (lockedRef.current) return;
    if (next === panelRef.current) return;
    if (next < 0 || next > 1) return;

    if (detalleOpenRef.current) {
      window.dispatchEvent(
        new CustomEvent(RETO_DETALLE_EVENT, { detail: { open: false } }),
      );
      setDetalleOpen(false);
      detalleOpenRef.current = false;
    }

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
      if (searchOpenRef.current || diccionarioOpenRef.current) return;

      if (detalleOpenRef.current) {
        if (Math.abs(event.deltaY) < WHEEL_THRESHOLD) return;
        event.preventDefault();
        if (event.deltaY > 0) {
          goTo(1);
        } else {
          window.dispatchEvent(
            new CustomEvent(RETO_DETALLE_EVENT, { detail: { open: false } }),
          );
        }
        return;
      }

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
      if (searchOpenRef.current || diccionarioOpenRef.current) return;
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

      if (detalleOpenRef.current) {
        if (delta > 0) {
          goTo(1);
        } else {
          window.dispatchEvent(
            new CustomEvent(RETO_DETALLE_EVENT, { detail: { open: false } }),
          );
        }
        return;
      }

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

  const participarActive =
    Boolean(participarHref) &&
    panel === 0 &&
    !searchOpen &&
    !diccionarioOpen;

  const onParticiparClick = useCallback(
    (event: MouseEvent) => {
      if (!participarHref || !participarActive) return;
      if (!isParticiparClickTarget(event.target)) return;
      powerOffTo(participarHref);
    },
    [participarActive, participarHref, powerOffTo],
  );

  return (
    <div className="relative h-full overflow-hidden bg-[var(--background)] text-white">
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-50 bg-transparent"
        style={{
          color: panel === 0 ? "#fff" : "var(--background)",
          opacity: detalleOpen && panel === 0 ? 0 : 1,
          transform:
            detalleOpen && panel === 0
              ? "translate3d(0, -100%, 0)"
              : "translate3d(0, 0, 0)",
          transition: animate
            ? `color ${TRANSITION_MS}ms ${TRANSITION_EASE}, opacity 420ms ${TRANSITION_EASE}, transform 420ms ${TRANSITION_EASE}`
            : "none",
        }}
        aria-hidden={detalleOpen && panel === 0}
      >
        <div
          className={
            detalleOpen && panel === 0
              ? "pointer-events-none bg-transparent"
              : "pointer-events-auto bg-transparent"
          }
        >
          {header}
        </div>
      </div>

      <div
        className="h-full will-change-transform"
        style={{
          transform: `translate3d(0, -${panel * 100}%, 0)`,
          transition: animate
            ? `transform ${TRANSITION_MS}ms ${TRANSITION_EASE}`
            : "none",
        }}
      >
        <section
          data-participar-zone={participarActive ? "" : undefined}
          onClick={onParticiparClick}
          className="relative h-full overflow-hidden"
        >
          <div className="absolute inset-0">{hero}</div>
        </section>

        <section className="flex h-full flex-col overflow-hidden bg-white text-[var(--background)] pt-[72px] md:pt-[68px]">
          <div className="relative min-h-0 flex-1 overflow-hidden">
            {archivos}
          </div>
        </section>
      </div>

      <ParticiparCursor active={participarActive} />
    </div>
  );
}
