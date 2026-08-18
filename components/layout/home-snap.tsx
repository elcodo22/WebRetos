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
import { useDiccionario } from "@/components/diccionario/diccionario-provider";
import { RETO_DETALLE_EVENT } from "@/components/reto/reto-hero";

const TRANSITION_MS = 560;
const TRANSITION_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const WHEEL_THRESHOLD = 1;
const TOUCH_THRESHOLD = 28;
const PAUSE_ON_HERO_MS = 80;
const STORAGE_KEY = "animate-to-archivos";
const ARCHIVO_WHEEL_EVENT = "archivo-wheel";
const HERO_REQUEST_EVENT = "carousel-request-hero";

type HomeSnapProps = {
  header: ReactNode;
  hero: ReactNode;
  archivos: ReactNode;
};

export function HomeSnap({
  header,
  hero,
  archivos,
}: HomeSnapProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isOpen: searchOpen } = useSearchOverlay();
  const { isOpen: diccionarioOpen } = useDiccionario();
  const searchOpenRef = useRef(searchOpen);
  const diccionarioOpenRef = useRef(diccionarioOpen);

  const [panel, setPanel] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const panelRef = useRef(0);
  const lockedRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
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

  const goTo = useCallback((next: number, opts?: { detalle?: boolean }) => {
    if (lockedRef.current) return;
    if (next < 0 || next > 1) return;

    // Al bajar a Archivos no cerrar la descripción: si no, se ve el home
    // a mitad del desliz. El detalle sigue off-screen en el panel 0.
    const wantDetalle =
      next === 1 ? detalleOpenRef.current : Boolean(opts?.detalle);
    const samePanel = next === panelRef.current;
    if (samePanel && detalleOpenRef.current === wantDetalle) return;

    if (detalleOpenRef.current !== wantDetalle) {
      window.dispatchEvent(
        new CustomEvent(RETO_DETALLE_EVENT, { detail: { open: wantDetalle } }),
      );
      setDetalleOpen(wantDetalle);
      detalleOpenRef.current = wantDetalle;
    }

    lockedRef.current = true;

    if (!samePanel) {
      setAnimate(true);
      panelRef.current = next;
      setPanel(next);
      window.history.replaceState(
        null,
        "",
        next === 1 ? "/#archivos" : "/#reto",
      );
    }

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
    const onHeroRequest = () => goTo(0, { detalle: true });
    window.addEventListener(HERO_REQUEST_EVENT, onHeroRequest);
    return () => window.removeEventListener(HERO_REQUEST_EVENT, onHeroRequest);
  }, [goTo]);

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      if (searchOpenRef.current || diccionarioOpenRef.current) return;
      if (document.activeElement instanceof HTMLInputElement) return;

      if (lockedRef.current) {
        event.preventDefault();
        return;
      }

      const delta = event.deltaY;
      if (Math.abs(delta) < WHEEL_THRESHOLD) return;

      if (panelRef.current === 1) {
        event.preventDefault();
        dispatchArchivoWheel(delta);
        return;
      }

      if (detalleOpenRef.current) {
        event.preventDefault();
        if (delta > 0) goTo(1);
        else goTo(0);
        return;
      }

      if (delta > 0) {
        event.preventDefault();
        goTo(0, { detalle: true });
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [goTo, dispatchArchivoWheel]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let tracking = false;
    let startX = 0;
    let startY = 0;
    let lastY = 0;

    const fromField = (target: EventTarget | null) =>
      target instanceof Element &&
      Boolean(target.closest("input, textarea, [data-codigo-field]"));

    const onStart = (event: TouchEvent) => {
      if (searchOpenRef.current || diccionarioOpenRef.current) return;
      if (fromField(event.target)) {
        tracking = false;
        return;
      }
      const touch = event.touches[0];
      if (!touch) return;
      tracking = true;
      startX = touch.clientX;
      startY = touch.clientY;
      lastY = startY;
    };

    const onMove = (event: TouchEvent) => {
      if (!tracking) return;
      const touch = event.touches[0];
      if (!touch) return;
      lastY = touch.clientY;
      const dy = startY - lastY;
      const dx = touch.clientX - startX;
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 6) {
        event.preventDefault();
      }
    };

    const onEnd = () => {
      if (!tracking) return;
      tracking = false;
      if (lockedRef.current) return;

      const delta = startY - lastY;
      if (Math.abs(delta) < TOUCH_THRESHOLD) return;

      if (panelRef.current === 1) {
        dispatchArchivoWheel(delta);
        return;
      }

      if (detalleOpenRef.current) {
        if (delta > 0) goTo(1);
        else goTo(0);
        return;
      }

      if (delta > 0) {
        goTo(0, { detalle: true });
      }
    };

    root.addEventListener("touchstart", onStart, { passive: true });
    root.addEventListener("touchmove", onMove, { passive: false });
    root.addEventListener("touchend", onEnd, { passive: true });
    root.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      root.removeEventListener("touchstart", onStart);
      root.removeEventListener("touchmove", onMove);
      root.removeEventListener("touchend", onEnd);
      root.removeEventListener("touchcancel", onEnd);
    };
  }, [goTo, dispatchArchivoWheel]);

  const participarActive =
    panel === 0 && !searchOpen && !diccionarioOpen;

  return (
    <div
      ref={rootRef}
      className="relative h-full overflow-hidden overscroll-none touch-none bg-[var(--background)] text-white"
    >
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-50 bg-transparent"
        style={{
          color: panel === 0 ? "#fff" : "var(--background)",
          transition: animate
            ? `color ${TRANSITION_MS}ms ${TRANSITION_EASE}`
            : "none",
        }}
      >
        <div className="pointer-events-auto bg-transparent">
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
          onContextMenu={(event) => {
            if (event.target instanceof HTMLInputElement) return;
            event.preventDefault();
          }}
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
    </div>
  );
}
