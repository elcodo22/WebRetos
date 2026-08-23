"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  cloneElement,
  isValidElement,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSearchOverlay } from "@/components/archivos/search-overlay-provider";
import { useDiccionario } from "@/components/diccionario/diccionario-provider";
import {
  RETO_CODIGO_FOCUS_EVENT,
  RETO_DETALLE_EVENT,
  RETO_HERO_STEP_EVENT,
  type HeroStep,
} from "@/components/reto/reto-hero";
import { setChromeTheme } from "@/components/layout/crt-shell";

const PANEL_TRANSITION_MS = 300;
const PANEL_LOCK_MS = PANEL_TRANSITION_MS + 40;
const PANEL_LAYER_TRANSITION =
  "transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] will-change-[opacity,transform]";
const WHEEL_THRESHOLD = 1;
const WHEEL_STEP_DELTA = 36;
const WHEEL_GESTURE_IDLE_MS = 160;
const TOUCH_THRESHOLD = 28;
const PAUSE_ON_HERO_MS = 80;
const INPUT_GRACE_MS = 450;
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
  const [heroStep, setHeroStepState] = useState<HeroStep>(0);
  const [codigoFocused, setCodigoFocused] = useState(false);
  const panelRef = useRef(0);
  const lockedRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const runningEntranceRef = useRef(false);
  const heroStepRef = useRef<HeroStep>(0);
  const inputReadyRef = useRef(false);
  const transitionTimersRef = useRef<number[]>([]);

  const clearTransitionTimers = useCallback(() => {
    for (const id of transitionTimersRef.current) {
      window.clearTimeout(id);
    }
    transitionTimersRef.current = [];
  }, []);

  const scheduleTransition = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    transitionTimersRef.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    searchOpenRef.current = searchOpen;
  }, [searchOpen]);

  useEffect(() => {
    diccionarioOpenRef.current = diccionarioOpen;
  }, [diccionarioOpen]);

  useEffect(() => {
    heroStepRef.current = heroStep;
  }, [heroStep]);

  useEffect(() => {
    function onHeroStep(event: Event) {
      const next = (event as CustomEvent<{ step?: HeroStep }>).detail?.step;
      if (next !== 0 && next !== 1 && next !== 2 && next !== 3) return;
      if (heroStepRef.current === next) return;
      heroStepRef.current = next;
      setHeroStepState(next);
    }

    window.addEventListener(RETO_HERO_STEP_EVENT, onHeroStep);
    return () => window.removeEventListener(RETO_HERO_STEP_EVENT, onHeroStep);
  }, []);

  useEffect(() => {
    function onCodigoFocus(event: Event) {
      const focused = (event as CustomEvent<{ focused?: boolean }>).detail
        ?.focused;
      setCodigoFocused(Boolean(focused));
    }

    window.addEventListener(RETO_CODIGO_FOCUS_EVENT, onCodigoFocus);
    return () =>
      window.removeEventListener(RETO_CODIGO_FOCUS_EVENT, onCodigoFocus);
  }, []);

  const homeWhiteMode = panel === 1 || (panel === 0 && codigoFocused);

  useEffect(() => {
    setChromeTheme(homeWhiteMode ? "white" : "blue");
  }, [homeWhiteMode]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      inputReadyRef.current = true;
    }, INPUT_GRACE_MS);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    return () => {
      clearTransitionTimers();
      lockedRef.current = false;
    };
  }, [clearTransitionTimers]);

  const releaseCodigoFocus = useCallback(() => {
    if (document.activeElement instanceof HTMLInputElement) {
      document.activeElement.blur();
    }
    setCodigoFocused(false);
    window.dispatchEvent(
      new CustomEvent(RETO_CODIGO_FOCUS_EVENT, { detail: { focused: false } }),
    );
  }, []);

  const setHeroStep = useCallback((next: HeroStep) => {
    if (heroStepRef.current === next) return;
    heroStepRef.current = next;
    setHeroStepState(next);
    window.dispatchEvent(
      new CustomEvent(RETO_HERO_STEP_EVENT, { detail: { step: next } }),
    );
    window.dispatchEvent(
      new CustomEvent(RETO_DETALLE_EVENT, {
        detail: { open: next >= 1, step: next },
      }),
    );
  }, []);

  const applyPanel = useCallback((next: number) => {
    panelRef.current = next;
    setPanel(next);
    window.history.replaceState(
      null,
      "",
      next === 1 ? "/#archivos" : "/#reto",
    );
  }, []);

  const runPanelTransition = useCallback(
    (next: number) => {
      clearTransitionTimers();
      releaseCodigoFocus();
      applyPanel(next);

      scheduleTransition(() => {
        lockedRef.current = false;
      }, PANEL_LOCK_MS);
    },
    [applyPanel, clearTransitionTimers, releaseCodigoFocus, scheduleTransition],
  );

  const prefersReducedMotion = useCallback(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const goTo = useCallback(
    (next: number, opts?: { heroStep?: HeroStep; instant?: boolean }) => {
      if (lockedRef.current) return;
      if (next < 0 || next > 1) return;

      const samePanel = next === panelRef.current;
      if (opts?.heroStep !== undefined) {
        setHeroStep(opts.heroStep);
      }
      if (samePanel && opts?.heroStep === undefined) return;

      lockedRef.current = true;

      if (!samePanel && !opts?.instant && !prefersReducedMotion()) {
        runPanelTransition(next);
        return;
      }

      if (!samePanel && next === 1) {
        releaseCodigoFocus();
      }

      if (!samePanel) {
        applyPanel(next);
      }

      lockedRef.current = false;
    },
    [applyPanel, prefersReducedMotion, releaseCodigoFocus, runPanelTransition, setHeroStep],
  );

  const advanceHeroOnHome = useCallback(() => {
    if (heroStepRef.current < 3) {
      setHeroStep((heroStepRef.current + 1) as HeroStep);
      return;
    }
    goTo(1);
  }, [goTo, setHeroStep]);

  const retreatHeroOnHome = useCallback(() => {
    if (heroStepRef.current > 0) {
      setHeroStep((heroStepRef.current - 1) as HeroStep);
    }
  }, [setHeroStep]);

  const goToArchivosFromTop = useCallback(() => {
    if (lockedRef.current || runningEntranceRef.current) return;
    if (panelRef.current === 1) return;
    window.setTimeout(() => goTo(1), PAUSE_ON_HERO_MS);
  }, [goTo]);

  const playEntranceFromOtherPage = useCallback(() => {
    if (runningEntranceRef.current) return;
    runningEntranceRef.current = true;

    lockedRef.current = true;
    applyPanel(0);
    window.history.replaceState(null, "", "/#reto");
    router.replace("/", { scroll: false });

    window.requestAnimationFrame(() => {
      lockedRef.current = false;
      goTo(1);
      window.setTimeout(() => {
        runningEntranceRef.current = false;
      }, PANEL_LOCK_MS);
    });
  }, [applyPanel, goTo, router]);

  const dispatchArchivoWheel = useCallback((delta: number) => {
    window.dispatchEvent(
      new CustomEvent(ARCHIVO_WHEEL_EVENT, { detail: { delta } }),
    );
  }, []);

  useEffect(() => {
    panelRef.current = panel;
  }, [panel]);

  useEffect(() => {
    if (window.location.hash === "#archivos") {
      applyPanel(1);
    }
  }, [applyPanel]);

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
      else goTo(0, { heroStep: 0 });
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
    const onHeroRequest = () => goTo(0, { heroStep: 3 });
    window.addEventListener(HERO_REQUEST_EVENT, onHeroRequest);
    return () => window.removeEventListener(HERO_REQUEST_EVENT, onHeroRequest);
  }, [goTo]);

  useEffect(() => {
    let wheelAccum = 0;
    let wheelGestureLocked = false;
    let wheelIdleTimer: number | null = null;

    const releaseWheelGesture = () => {
      wheelGestureLocked = false;
      wheelAccum = 0;
      wheelIdleTimer = null;
    };

    const bumpWheelGesture = () => {
      if (wheelIdleTimer) window.clearTimeout(wheelIdleTimer);
      wheelIdleTimer = window.setTimeout(releaseWheelGesture, WHEEL_GESTURE_IDLE_MS);
    };

    /** Un gesto de rueda = un paso como máximo (aunque el scroll sea largo). */
    const consumeWheelStep = (deltaY: number): -1 | 0 | 1 => {
      if (lockedRef.current) return 0;

      bumpWheelGesture();
      if (wheelGestureLocked) return 0;

      wheelAccum += deltaY;
      if (Math.abs(wheelAccum) < WHEEL_STEP_DELTA) return 0;

      wheelGestureLocked = true;
      wheelAccum = 0;
      return deltaY > 0 ? 1 : -1;
    };

    const onWheel = (event: WheelEvent) => {
      if (!inputReadyRef.current) return;
      if (searchOpenRef.current || diccionarioOpenRef.current) return;
      if (document.activeElement instanceof HTMLInputElement) return;

      const delta = event.deltaY;
      if (Math.abs(delta) < WHEEL_THRESHOLD) return;

      if (panelRef.current === 0 || panelRef.current === 1) {
        event.preventDefault();
      }

      if (lockedRef.current) return;

      const dir = consumeWheelStep(delta);
      if (dir === 0) return;

      if (panelRef.current === 1) {
        dispatchArchivoWheel(dir * WHEEL_STEP_DELTA);
        return;
      }

      if (dir > 0) advanceHeroOnHome();
      else retreatHeroOnHome();
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", onWheel);
      if (wheelIdleTimer) window.clearTimeout(wheelIdleTimer);
    };
  }, [advanceHeroOnHome, retreatHeroOnHome, dispatchArchivoWheel]);

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
      if (!inputReadyRef.current) return;
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

      if (delta > 0) advanceHeroOnHome();
      else retreatHeroOnHome();
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
  }, [advanceHeroOnHome, retreatHeroOnHome, dispatchArchivoWheel]);

  const participarActive =
    panel === 0 && !searchOpen && !diccionarioOpen;

  const hideHeader = panel === 0 && codigoFocused;

  const heroWithStep = isValidElement<{ step?: HeroStep; panel?: 0 | 1 }>(hero)
    ? cloneElement(hero, { step: heroStep, panel: panel as 0 | 1 })
    : hero;

  const panelLayerClass = (active: boolean, kind: "hero" | "archivos") =>
    `${PANEL_LAYER_TRANSITION} absolute inset-0 overflow-hidden ${
      active
        ? "z-[2] translate-y-0 opacity-100 pointer-events-auto"
        : kind === "archivos"
          ? "z-0 translate-y-3 opacity-0 pointer-events-none"
          : "z-0 -translate-y-2 opacity-0 pointer-events-none"
    }`;

  return (
    <div
      ref={rootRef}
      className={`relative h-full min-h-0 overflow-hidden overscroll-none touch-none pb-[var(--safe-bottom)] transition-colors duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] ${
        homeWhiteMode
          ? "bg-white text-[var(--background)]"
          : "bg-[var(--background)] text-white"
      }`}
    >
      <div
        data-site-chrome=""
        className={`pointer-events-none fixed inset-x-0 top-0 z-[70] bg-transparent transition-opacity duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] ${
          hideHeader ? "opacity-0" : "opacity-100"
        }`}
        style={{
          color: homeWhiteMode ? "var(--background)" : "#fff",
        }}
        aria-hidden={hideHeader}
      >
        <div
          className={
            hideHeader ? "pointer-events-none bg-transparent" : "pointer-events-auto bg-transparent"
          }
        >
          {header}
        </div>
      </div>

      <div className="absolute inset-0 min-h-0">
        <section
          data-participar-zone={participarActive ? "" : undefined}
          onContextMenu={(event) => {
            if (event.target instanceof HTMLInputElement) return;
            event.preventDefault();
          }}
          className={panelLayerClass(panel === 0, "hero")}
          aria-hidden={panel !== 0}
        >
          <div className="h-full w-full">{heroWithStep}</div>
        </section>

        <section
          className={`${panelLayerClass(panel === 1, "archivos")} flex min-h-0 flex-col bg-white text-[var(--background)] pt-[calc(68px+var(--safe-top))] pb-[var(--safe-bottom)]`}
          aria-hidden={panel !== 1}
        >
          <div className="relative min-h-0 flex-1 overflow-hidden">
            {archivos}
          </div>
        </section>
      </div>
    </div>
  );
}
