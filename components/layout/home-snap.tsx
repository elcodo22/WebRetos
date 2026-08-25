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
  HERO_INTRO_SCROLL_SELECTOR,
  RETO_CODIGO_FOCUS_EVENT,
  RETO_DETALLE_EVENT,
  RETO_HERO_STEP_EVENT,
  type HeroStep,
} from "@/components/reto/reto-hero";
import { setChromeTheme } from "@/components/layout/crt-shell";
import { SiteMobileMenu } from "@/components/layout/site-mobile-chrome";
import type { User } from "@supabase/supabase-js";

const PANEL_TRANSITION_MS = 300;
const PANEL_LOCK_MS = PANEL_TRANSITION_MS + 40;
/** Sin eventos = scroll anterior terminado. */
const WHEEL_GESTURE_GAP_MS = 80;
/** Tras cambiar de pantalla (tiempo/código/archivos), ignorar el resto del flick. */
const SCREEN_LOCK_GAP_MS = 420;
/** Impulso bajo entre deslizamientos → el siguiente scroll puede contar ya. */
const WHEEL_QUIET_PX = 12;
const WHEEL_THRESHOLD = 4;
const TOUCH_THRESHOLD = 28;
const PAUSE_ON_HERO_MS = 80;
/** Tope por evento de rueda en el intro (un scroll fuerte no lo recorre entero). */
const INTRO_WHEEL_CAP_PX = 52;
/** Tope de progreso por gesto de rueda. */
const INTRO_GESTURE_CAP = 0.34;
/** Tope de progreso por gesto táctil. */
const INTRO_TOUCH_GESTURE_CAP = 0.36;
/** Scroll (px) para revelar archivos desde el código. */
const ARCHIVOS_REVEAL_SCROLL_PX = 360;
const ARCHIVOS_WHEEL_CAP_PX = 48;
const ARCHIVOS_GESTURE_CAP = 0.38;
const ARCHIVOS_TOUCH_GESTURE_CAP = 0.4;
const INPUT_GRACE_MS = 450;
const STORAGE_KEY = "animate-to-archivos";
const ARCHIVO_WHEEL_EVENT = "archivo-wheel";
const HERO_REQUEST_EVENT = "carousel-request-hero";

type HomeSnapProps = {
  user: User | null;
  header: ReactNode;
  hero: ReactNode;
  archivos: ReactNode;
};

export function HomeSnap({
  user,
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
  const [introProgress, setIntroProgressState] = useState(0);
  const [archivosReveal, setArchivosRevealState] = useState(0);
  const [codigoFocused, setCodigoFocused] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const panelRef = useRef(0);
  const lockedRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const runningEntranceRef = useRef(false);
  const heroStepRef = useRef<HeroStep>(0);
  const introProgressRef = useRef(0);
  const archivosRevealRef = useRef(0);
  const codigoFocusedRef = useRef(false);
  const inputReadyRef = useRef(false);
  const mobileMenuOpenRef = useRef(false);
  const screenLockRef = useRef(false);
  const screenLockAtRef = useRef(0);
  /** Dirección del salto bloqueado (+1 abajo / -1 arriba). Al contrario se libera. */
  const screenLockDirRef = useRef<1 | -1>(1);
  const transitionTimersRef = useRef<number[]>([]);

  const armScreenLock = useCallback((dir: 1 | -1 = 1) => {
    screenLockRef.current = true;
    screenLockDirRef.current = dir;
    screenLockAtRef.current = performance.now();
  }, []);

  const clearScreenLockIfReady = useCallback(() => {
    if (!screenLockRef.current) return;
    if (performance.now() - screenLockAtRef.current >= SCREEN_LOCK_GAP_MS) {
      screenLockRef.current = false;
    }
  }, []);

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
    mobileMenuOpenRef.current = mobileMenuOpen;
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (searchOpen || diccionarioOpen || codigoFocused) {
      setMobileMenuOpen(false);
    }
  }, [searchOpen, diccionarioOpen, codigoFocused]);

  useEffect(() => {
    heroStepRef.current = heroStep;
  }, [heroStep]);

  useEffect(() => {
    codigoFocusedRef.current = codigoFocused;
  }, [codigoFocused]);

  useEffect(() => {
    // Estado inicial limpio: título visible
    heroStepRef.current = 0;
    setHeroStepState(0);
    introProgressRef.current = 0;
    setIntroProgressState(0);
    archivosRevealRef.current = 0;
    setArchivosRevealState(0);
  }, []);

  useEffect(() => {
    function onHeroStep(event: Event) {
      const next = (event as CustomEvent<{ step?: HeroStep }>).detail?.step;
      if (next !== 0 && next !== 1 && next !== 2 && next !== 3) return;
      if (heroStepRef.current === next) return;
      heroStepRef.current = next;
      setHeroStepState(next);
      if (next >= 1) {
        introProgressRef.current = 1;
        setIntroProgressState(1);
      } else {
        introProgressRef.current = 0;
        setIntroProgressState(0);
      }
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

  const homeWhiteMode =
    panel === 1 ||
    (panel === 0 && codigoFocused) ||
    (panel === 0 && archivosReveal >= 0.98);

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
    if (next >= 1) {
      introProgressRef.current = 1;
      setIntroProgressState(1);
    } else {
      introProgressRef.current = 0;
      setIntroProgressState(0);
    }
    window.dispatchEvent(
      new CustomEvent(RETO_HERO_STEP_EVENT, { detail: { step: next } }),
    );
    window.dispatchEvent(
      new CustomEvent(RETO_DETALLE_EVENT, {
        detail: { open: next >= 1, step: next },
      }),
    );
  }, []);

  /** Progreso del intro. Al completar → pantalla azul vacía (step 1). */
  const setIntroProgress = useCallback((next: number) => {
    const p = Math.min(1, Math.max(0, next));
    introProgressRef.current = p;
    setIntroProgressState(p);

    if (p >= 1) {
      if (heroStepRef.current === 0) {
        heroStepRef.current = 1;
        setHeroStepState(1);
        window.dispatchEvent(
          new CustomEvent(RETO_HERO_STEP_EVENT, { detail: { step: 1 } }),
        );
        window.dispatchEvent(
          new CustomEvent(RETO_DETALLE_EVENT, {
            detail: { open: true, step: 1 },
          }),
        );
      }
      return;
    }

    if (heroStepRef.current === 1) {
      heroStepRef.current = 0;
      setHeroStepState(0);
      window.dispatchEvent(
        new CustomEvent(RETO_HERO_STEP_EVENT, { detail: { step: 0 } }),
      );
      window.dispatchEvent(
        new CustomEvent(RETO_DETALLE_EVENT, {
          detail: { open: false, step: 0 },
        }),
      );
    }
  }, []);

  /** Scroll del intro con topes: un impulso fuerte no lo manda arriba de golpe. */
  const scrollIntroBy = useCallback(
    (deltaPx: number, opts?: { gestureStart?: number; gestureCap?: number }) => {
      const el = rootRef.current?.querySelector(
        HERO_INTRO_SCROLL_SELECTOR,
      ) as HTMLElement | null;
      const approx = Math.max(440, window.innerHeight * 1.75);

      let nextP = introProgressRef.current + deltaPx / approx;
      if (el) {
        const rawMax = el.scrollHeight - el.clientHeight;
        if (rawMax >= 80) {
          const nextTop = Math.min(
            rawMax,
            Math.max(0, el.scrollTop + deltaPx),
          );
          nextP = nextTop / rawMax;
        }
      }

      if (
        opts?.gestureStart !== undefined &&
        opts.gestureCap !== undefined &&
        deltaPx > 0
      ) {
        nextP = Math.min(nextP, opts.gestureStart + opts.gestureCap);
      }
      if (
        opts?.gestureStart !== undefined &&
        opts.gestureCap !== undefined &&
        deltaPx < 0
      ) {
        nextP = Math.max(nextP, opts.gestureStart - opts.gestureCap);
      }

      nextP = Math.min(1, Math.max(0, nextP));

      if (el) {
        const rawMax = el.scrollHeight - el.clientHeight;
        if (rawMax >= 80) {
          el.scrollTop = nextP * rawMax;
        }
      }

      setIntroProgress(nextP);
      return nextP;
    },
    [setIntroProgress],
  );

  const wheelDeltaPx = (event: WheelEvent) => {
    if (event.deltaMode === 1) return event.deltaY * 16;
    if (event.deltaMode === 2) {
      return event.deltaY * (window.innerHeight || 800);
    }
    return event.deltaY;
  };

  const applyPanel = useCallback((next: number) => {
    panelRef.current = next;
    setPanel(next);
    if (next === 1) {
      archivosRevealRef.current = 1;
      setArchivosRevealState(1);
    } else {
      archivosRevealRef.current = 0;
      setArchivosRevealState(0);
    }
    window.history.replaceState(
      null,
      "",
      next === 1 ? "/#archivos" : "/#reto",
    );
  }, []);

  /** 0 = solo código/azul, 1 = archivos a pantalla completa. */
  const setArchivosReveal = useCallback(
    (next: number) => {
      const prev = archivosRevealRef.current;
      const p = Math.min(1, Math.max(0, next));
      archivosRevealRef.current = p;
      setArchivosRevealState(p);

      if (p >= 1) {
        if (panelRef.current !== 1) {
          releaseCodigoFocus();
          panelRef.current = 1;
          setPanel(1);
          window.history.replaceState(null, "", "/#archivos");
        }
        return;
      }

      if (prev > 0 && p <= 0) {
        armScreenLock(-1);
      }

      if (panelRef.current === 1 && p < 1) {
        panelRef.current = 0;
        setPanel(0);
        window.history.replaceState(null, "", "/#reto");
      }
    },
    [releaseCodigoFocus, armScreenLock],
  );

  const scrollArchivosRevealBy = useCallback(
    (deltaPx: number, opts?: { gestureStart?: number; gestureCap?: number }) => {
      let nextP =
        archivosRevealRef.current + deltaPx / ARCHIVOS_REVEAL_SCROLL_PX;
      if (
        opts?.gestureStart !== undefined &&
        opts.gestureCap !== undefined &&
        deltaPx > 0
      ) {
        nextP = Math.min(nextP, opts.gestureStart + opts.gestureCap);
      }
      if (
        opts?.gestureStart !== undefined &&
        opts.gestureCap !== undefined &&
        deltaPx < 0
      ) {
        nextP = Math.max(nextP, opts.gestureStart - opts.gestureCap);
      }
      setArchivosReveal(nextP);
      return archivosRevealRef.current;
    },
    [setArchivosReveal],
  );

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
    const step = heroStepRef.current;
    if (step === 0) {
      setHeroStep(1);
      return;
    }
    if (step === 1) {
      setHeroStep(2);
      armScreenLock(1);
      return;
    }
    if (step === 2) {
      setHeroStep(3);
      armScreenLock(1);
      return;
    }
    // Desde código: solo un tramo hacia archivos (nunca saltar entero).
    scrollArchivosRevealBy(ARCHIVOS_WHEEL_CAP_PX, {
      gestureStart: archivosRevealRef.current,
      gestureCap: ARCHIVOS_GESTURE_CAP,
    });
  }, [setHeroStep, scrollArchivosRevealBy, armScreenLock]);

  const retreatHeroOnHome = useCallback(() => {
    if (archivosRevealRef.current > 0 && panelRef.current === 0) {
      scrollArchivosRevealBy(-ARCHIVOS_WHEEL_CAP_PX, {
        gestureStart: archivosRevealRef.current,
        gestureCap: ARCHIVOS_GESTURE_CAP,
      });
      return;
    }
    const step = heroStepRef.current;
    if (step >= 3) {
      setHeroStep(2);
      armScreenLock(-1);
      return;
    }
    if (step === 2) {
      // Volver al vacío / descripción: sin lock para poder seguir subiendo.
      setHeroStep(1);
      return;
    }
    if (step === 1) {
      heroStepRef.current = 0;
      setHeroStepState(0);
      introProgressRef.current = 1;
      setIntroProgressState(1);
      const el = rootRef.current?.querySelector(
        HERO_INTRO_SCROLL_SELECTOR,
      ) as HTMLElement | null;
      if (el) el.scrollTop = el.scrollHeight;
      window.dispatchEvent(
        new CustomEvent(RETO_HERO_STEP_EVENT, { detail: { step: 0 } }),
      );
      window.dispatchEvent(
        new CustomEvent(RETO_DETALLE_EVENT, {
          detail: { open: false, step: 0 },
        }),
      );
    }
  }, [setHeroStep, scrollArchivosRevealBy, armScreenLock]);

  /** Salir de archivos hacia el código con el mismo slide (reversa). */
  const beginArchivosExit = useCallback(() => {
    if (panelRef.current === 1) {
      panelRef.current = 0;
      setPanel(0);
      window.history.replaceState(null, "", "/#reto");
    }
    archivosRevealRef.current = 1;
    setArchivosRevealState(1);
    if (heroStepRef.current !== 3) {
      heroStepRef.current = 3;
      setHeroStepState(3);
      introProgressRef.current = 1;
      setIntroProgressState(1);
      window.dispatchEvent(
        new CustomEvent(RETO_HERO_STEP_EVENT, { detail: { step: 3 } }),
      );
      window.dispatchEvent(
        new CustomEvent(RETO_DETALLE_EVENT, {
          detail: { open: true, step: 3 },
        }),
      );
    }
  }, []);

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
    const onHeroRequest = () => {
      // Desde la primera carpeta hacia arriba: empezar a bajar la blanca
      // solo un poco (mismo tope que un evento de rueda, no medio panel).
      if (screenLockRef.current) {
        clearScreenLockIfReady();
        if (screenLockRef.current) return;
      }
      beginArchivosExit();
      scrollArchivosRevealBy(-ARCHIVOS_WHEEL_CAP_PX, {
        gestureStart: 1,
        gestureCap: ARCHIVOS_GESTURE_CAP,
      });
    };
    window.addEventListener(HERO_REQUEST_EVENT, onHeroRequest);
    return () => window.removeEventListener(HERO_REQUEST_EVENT, onHeroRequest);
  }, [beginArchivosExit, scrollArchivosRevealBy, clearScreenLockIfReady]);

  useEffect(() => {
    let gestureUsed = false;
    let sawQuiet = false;
    let lastEventAt = 0;
    let introGestureStart = 0;
    let introGestureActive = false;
    let archivosGestureStart = 0;
    let archivosGestureActive = false;

    const onWheel = (event: WheelEvent) => {
      if (!inputReadyRef.current) return;
      if (mobileMenuOpenRef.current) return;
      if (searchOpenRef.current || diccionarioOpenRef.current) return;
      if (document.activeElement instanceof HTMLInputElement) return;

      const delta = event.deltaY;
      const abs = Math.abs(delta);
      if (abs < WHEEL_THRESHOLD) return;

      if (panelRef.current === 0 || panelRef.current === 1) {
        event.preventDefault();
      }

      if (lockedRef.current) return;

      const now = performance.now();
      const gap = lastEventAt === 0 ? Infinity : now - lastEventAt;
      lastEventAt = now;

      if (gap >= WHEEL_GESTURE_GAP_MS) {
        gestureUsed = false;
        sawQuiet = false;
        introGestureActive = false;
        archivosGestureActive = false;
      }

      if (gap >= SCREEN_LOCK_GAP_MS) {
        screenLockRef.current = false;
      }

      // Bloqueo solo en la dirección del salto; al revés se libera.
      if (screenLockRef.current) {
        const dir: 1 | -1 = delta > 0 ? 1 : -1;
        if (dir === screenLockDirRef.current) return;
        screenLockRef.current = false;
        gestureUsed = false;
        sawQuiet = false;
      }

      // Intro: scroll hasta azul vacío; el mismo impulso fuerte puede seguir al tiempo.
      if (panelRef.current === 0) {
        const step = heroStepRef.current;
        if (step === 0 || (step === 1 && delta < 0)) {
          if (step === 1 && delta < 0) {
            heroStepRef.current = 0;
            setHeroStepState(0);
            introProgressRef.current = 1;
            setIntroProgressState(1);
            const el = rootRef.current?.querySelector(
              HERO_INTRO_SCROLL_SELECTOR,
            ) as HTMLElement | null;
            if (el) el.scrollTop = el.scrollHeight;
          }

          if (!introGestureActive) {
            introGestureActive = true;
            introGestureStart = introProgressRef.current;
          }

          const raw = wheelDeltaPx(event);
          const capped =
            Math.sign(raw) * Math.min(Math.abs(raw), INTRO_WHEEL_CAP_PX);
          const before = introProgressRef.current;
          const after = scrollIntroBy(capped, {
            gestureStart: introGestureStart,
            gestureCap: INTRO_GESTURE_CAP,
          });
          if (before < 1 && after >= 1) {
            // No marcar gestureUsed: el resto del flick puede pasar al tiempo.
            introGestureActive = false;
            sawQuiet = false;
          }
          return;
        }

        // Azul vacío → tiempo (también en el mismo flick que cerró la descripción).
        if (step === 1 && delta > 0) {
          if (gestureUsed) {
            if (abs <= WHEEL_QUIET_PX) {
              sawQuiet = true;
              return;
            }
            if (sawQuiet) {
              gestureUsed = false;
              sawQuiet = false;
            } else {
              return;
            }
          }
          setHeroStep(2);
          gestureUsed = true;
          sawQuiet = false;
          armScreenLock(1); // no saltar al código; subir libera el lock
          return;
        }

        // Tiempo → vacío (mismo flick fuerte puede seguir a la descripción).
        if (step === 2 && delta < 0) {
          setHeroStep(1);
          gestureUsed = false;
          sawQuiet = false;
          introGestureActive = false;
          return;
        }

        // Código → archivos: la blanca sube con cada scroll.
        if (
          !codigoFocusedRef.current &&
          (step === 3 || archivosRevealRef.current > 0)
        ) {
          const reveal = archivosRevealRef.current;
          if (!(step === 3 && reveal <= 0 && delta < 0)) {
            if (!archivosGestureActive) {
              archivosGestureActive = true;
              archivosGestureStart = reveal;
            }
            const raw = wheelDeltaPx(event);
            const capped =
              Math.sign(raw) *
              Math.min(Math.abs(raw), ARCHIVOS_WHEEL_CAP_PX);
            scrollArchivosRevealBy(capped, {
              gestureStart: archivosGestureStart,
              gestureCap: ARCHIVOS_GESTURE_CAP,
            });
            return;
          }
        }
      }

      // Pausa clara entre eventos → scroll nuevo.
      if (gap >= WHEEL_GESTURE_GAP_MS) {
        gestureUsed = false;
        sawQuiet = false;
      }

      if (gestureUsed) {
        if (abs <= WHEEL_QUIET_PX) {
          sawQuiet = true;
          return;
        }
        if (sawQuiet) {
          gestureUsed = false;
          sawQuiet = false;
        } else {
          return;
        }
      }

      gestureUsed = true;
      sawQuiet = false;
      const dir = delta > 0 ? 1 : -1;

      if (panelRef.current === 1) {
        dispatchArchivoWheel(dir);
        return;
      }

      if (dir > 0) advanceHeroOnHome();
      else retreatHeroOnHome();
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [
    advanceHeroOnHome,
    retreatHeroOnHome,
    dispatchArchivoWheel,
    scrollIntroBy,
    scrollArchivosRevealBy,
    setHeroStep,
    armScreenLock,
  ]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let tracking = false;
    let startX = 0;
    let startY = 0;
    let lastY = 0;
    let touchScrollBase = 0;
    let touchArchivosBase = 0;
    let scrubbingIntro = false;
    let scrubbingArchivos = false;

    const fromField = (target: EventTarget | null) =>
      target instanceof Element &&
      Boolean(target.closest("input, textarea, [data-codigo-field]"));

    const introEl = () =>
      root.querySelector(HERO_INTRO_SCROLL_SELECTOR) as HTMLElement | null;

    const onStart = (event: TouchEvent) => {
      if (!inputReadyRef.current) return;
      if (mobileMenuOpenRef.current) return;
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
      const el = introEl();
      touchScrollBase = el?.scrollTop ?? 0;
      touchArchivosBase = archivosRevealRef.current;
      clearScreenLockIfReady();
      const step = heroStepRef.current;
      scrubbingIntro =
        panelRef.current === 0 && (step === 0 || step === 1);
      scrubbingArchivos =
        panelRef.current === 0 &&
        !codigoFocusedRef.current &&
        !screenLockRef.current &&
        (step === 3 || archivosRevealRef.current > 0);
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

      if (lockedRef.current || panelRef.current !== 0) return;

      if (scrubbingArchivos) {
        let nextP =
          touchArchivosBase + dy / ARCHIVOS_REVEAL_SCROLL_PX;
        if (dy > 0) {
          nextP = Math.min(
            nextP,
            touchArchivosBase + ARCHIVOS_TOUCH_GESTURE_CAP,
          );
        } else {
          nextP = Math.max(
            nextP,
            touchArchivosBase - ARCHIVOS_TOUCH_GESTURE_CAP,
          );
        }
        setArchivosReveal(nextP);
        return;
      }

      if (!scrubbingIntro) return;

      const step = heroStepRef.current;
      if (step === 1 && dy >= 0) return;
      if (step > 1) return;

      if (step === 1 && dy < 0) {
        heroStepRef.current = 0;
        setHeroStepState(0);
        introProgressRef.current = 1;
        setIntroProgressState(1);
        const scroller = introEl();
        if (scroller) {
          scroller.scrollTop = scroller.scrollHeight;
          touchScrollBase = scroller.scrollHeight;
        }
      }

      const approx = Math.max(440, window.innerHeight * 1.75);
      let nextP =
        (touchScrollBase || 0) / Math.max(1, approx) + dy / approx;

      const scroller = introEl();
      if (scroller) {
        const rawMax = scroller.scrollHeight - scroller.clientHeight;
        if (rawMax >= 80) {
          const baseP = touchScrollBase / rawMax;
          nextP = baseP + dy / rawMax;
          if (dy > 0) {
            nextP = Math.min(nextP, baseP + INTRO_TOUCH_GESTURE_CAP);
          } else {
            nextP = Math.max(nextP, baseP - INTRO_TOUCH_GESTURE_CAP);
          }
          nextP = Math.min(1, Math.max(0, nextP));
          scroller.scrollTop = nextP * rawMax;
          setIntroProgress(nextP);
          return;
        }
      }

      const baseP = introProgressRef.current;
      if (dy > 0) {
        nextP = Math.min(nextP, baseP + INTRO_TOUCH_GESTURE_CAP);
      } else {
        nextP = Math.max(nextP, baseP - INTRO_TOUCH_GESTURE_CAP);
      }
      setIntroProgress(nextP);
    };

    const onEnd = () => {
      if (!tracking) return;
      tracking = false;
      if (lockedRef.current) return;

      const delta = startY - lastY;
      clearScreenLockIfReady();

      if (scrubbingArchivos) {
        scrubbingArchivos = false;
        scrubbingIntro = false;
        return;
      }

      if (scrubbingIntro) {
        const step = heroStepRef.current;
        scrubbingIntro = false;
        if (step === 0) return;
        if (step === 1 && delta < TOUCH_THRESHOLD) return;
      } else {
        scrubbingIntro = false;
      }

      if (screenLockRef.current) return;
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
  }, [
    advanceHeroOnHome,
    retreatHeroOnHome,
    dispatchArchivoWheel,
    setIntroProgress,
    setArchivosReveal,
    clearScreenLockIfReady,
  ]);

  const participarActive =
    panel === 0 &&
    archivosReveal < 0.15 &&
    !searchOpen &&
    !diccionarioOpen &&
    !mobileMenuOpen;

  const hideHeader = panel === 0 && codigoFocused;
  const mobileMenuWhite = panel === 1 || archivosReveal >= 0.98;
  const reveal = panel === 1 ? 1 : archivosReveal;
  const archivosInteractive = reveal >= 0.98 || panel === 1;

  const heroWithStep = isValidElement<{
    step?: HeroStep;
    panel?: 0 | 1;
    introProgress?: number;
  }>(hero)
    ? cloneElement(hero, {
        step: heroStep,
        panel: panel as 0 | 1,
        introProgress,
      })
    : hero;

  return (
    <div
      ref={rootRef}
      className={`relative h-full min-h-0 overflow-hidden overscroll-none touch-none pb-[var(--safe-bottom)] transition-colors duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] ${
        homeWhiteMode
          ? "bg-white text-[var(--background)]"
          : "bg-[var(--background)] text-white"
      }`}
    >
      {homeWhiteMode ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none fixed inset-x-0 top-0 z-[80] bg-white md:hidden"
            style={{ height: "var(--safe-top)" }}
          />
          <div
            aria-hidden
            className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] bg-white md:hidden"
            style={{ height: "var(--safe-bottom)" }}
          />
        </>
      ) : null}

      <div
        data-site-chrome=""
        className={`pointer-events-none fixed inset-x-0 top-0 z-[70] hidden bg-transparent transition-opacity duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] md:block ${
          hideHeader ? "opacity-0" : "opacity-100"
        }`}
        style={{
          color: homeWhiteMode ? "var(--background)" : "#fff",
        }}
        aria-hidden={hideHeader}
      >
        <div
          className={
            hideHeader
              ? "pointer-events-none bg-transparent"
              : "pointer-events-auto bg-transparent md:[&_header]:pt-[var(--header-inset-top)]"
          }
        >
          {header}
        </div>
      </div>

      <SiteMobileMenu
        user={user}
        menuTone={mobileMenuWhite ? "white" : "blue"}
        hideMenu={codigoFocused}
        menuOpen={mobileMenuOpen}
        onMenuOpenChange={setMobileMenuOpen}
      />

      <div
        className={`absolute inset-0 min-h-0 transition-opacity duration-300 max-md:ease-[cubic-bezier(0.33,1,0.68,1)] ${
          mobileMenuOpen ? "max-md:pointer-events-none max-md:opacity-0" : ""
        }`}
      >
        <section
          data-participar-zone={participarActive ? "" : undefined}
          onContextMenu={(event) => {
            if (event.target instanceof HTMLInputElement) return;
            event.preventDefault();
          }}
          className={`absolute inset-0 overflow-hidden ${
            archivosInteractive
              ? "z-0 pointer-events-none"
              : "z-[2] pointer-events-auto"
          }`}
          aria-hidden={archivosInteractive}
        >
          <div className="h-full w-full">{heroWithStep}</div>
        </section>

        <section
          className={`absolute inset-0 flex min-h-0 flex-col overflow-hidden bg-white text-[var(--background)] pt-0 pb-[var(--safe-bottom)] md:pt-[calc(68px+var(--safe-top))] ${
            archivosInteractive
              ? "z-[2] pointer-events-auto"
              : "z-[3] pointer-events-none"
          }`}
          style={{
            transform: `translateY(${(1 - reveal) * 100}%)`,
            willChange: "transform",
          }}
          aria-hidden={reveal < 0.02}
        >
          <div className="relative min-h-0 flex-1 overflow-hidden">
            {archivos}
          </div>
        </section>
      </div>
    </div>
  );
}
