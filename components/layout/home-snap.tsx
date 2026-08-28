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
import { ARCHIVOS_CONTACT_EVENT } from "@/components/archivos/archivos-carousel";
import { useDiccionario } from "@/components/diccionario/diccionario-provider";
import {
  HERO_INTRO_SCROLL_SELECTOR,
  RETO_CODIGO_FOCUS_EVENT,
  RETO_DETALLE_EVENT,
  RETO_HERO_STEP_EVENT,
  type HeroStep,
} from "@/components/reto/reto-hero";
import { setChromeTheme } from "@/components/layout/crt-shell";
import { HomeIntroVideo } from "@/components/layout/home-intro-video";
import { SiteMobileMenu } from "@/components/layout/site-mobile-chrome";
import { HOME_RESET_EVENT } from "@/components/layout/home-events";
import type { User } from "@supabase/supabase-js";

const PANEL_TRANSITION_MS = 300;
const PANEL_LOCK_MS = PANEL_TRANSITION_MS + 40;
/** Sin eventos = gesto de intro reiniciado. */
const WHEEL_GESTURE_GAP_MS = 90;
const WHEEL_THRESHOLD = 2;
const TOUCH_THRESHOLD = 28;
const PAUSE_ON_HERO_MS = 80;
/** Tope por evento de rueda en el intro (un scroll fuerte no lo recorre entero). */
const INTRO_WHEEL_CAP_PX = 52;
/** Tope de progreso por gesto de rueda. */
const INTRO_GESTURE_CAP = 0.34;
/** Tope de progreso por gesto táctil. */
const INTRO_TOUCH_GESTURE_CAP = 0.36;
/** Scroll (px) para revelar archivos desde el código (más bajo = más ágil). */
const ARCHIVOS_REVEAL_SCROLL_PX = 380;
const ARCHIVOS_WHEEL_CAP_PX = 44;
/** Interpolación del panel blanco hacia el target (0–1 por frame). */
const ARCHIVOS_LERP = 0.28;
/** Scroll (px) para subir QUEDAN desde abajo al centro. */
const TIEMPO_SCROLL_PX = 320;
const TIEMPO_WHEEL_CAP_PX = 48;
/** En el intro, a partir de aquí QUEDAN ya empieza a subir. */
const TIEMPO_EARLY_START = 0.12;
/** Acumulación de rueda para saltar vacío ↔ tiempo ↔ código. */
const STEP_WHEEL_THRESHOLD = 64;
/** Pausa mínima entre cambios de capa (alineada con la animación). */
const STEP_SETTLE_MS = 240;
/** Tras código→tiempo, ignorar el resto del mismo flick. */
const TIEMPO_PIN_GAP_MS = 140;
/** Tiempo con la pantalla de código ya completa antes de poder subir al tiempo. */
const CODIGO_PLANTED_MS = 520;
/** Si no hay rueda, se olvida la acumulación de paso. */
const STEP_ACC_IDLE_MS = 220;
const INPUT_GRACE_MS = 450;
/** Scroll (px) para subir el vídeo intro de forma progresiva. */
const VIDEO_SCROLL_PX = 420;
const VIDEO_SCROLL_PX_TOUCH = 300;
const VIDEO_WHEEL_CAP_PX = 56;
/** Tras cerrar el vídeo, ignorar el resto del mismo flick (no mover descripción). */
const VIDEO_PIN_GAP_MS = 200;
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
  const [tiempoProgress, setTiempoProgressState] = useState(0);
  const [archivosReveal, setArchivosRevealState] = useState(0);
  const [archivosContact, setArchivosContact] = useState(0);
  const [videoReveal, setVideoRevealState] = useState(0);
  const [codigoFocused, setCodigoFocused] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const panelRef = useRef(0);
  const lockedRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const runningEntranceRef = useRef(false);
  const heroStepRef = useRef<HeroStep>(0);
  const introProgressRef = useRef(0);
  const videoRevealRef = useRef(0);
  const tiempoProgressRef = useRef(0);
  const archivosRevealRef = useRef(0);
  const codigoFocusedRef = useRef(false);
  const inputReadyRef = useRef(false);
  const mobileMenuOpenRef = useRef(false);
  const transitionTimersRef = useRef<number[]>([]);
  /** Target lógico del reveal; la UI interpola hacia aquí. */
  const archivosRevealTargetRef = useRef(0);
  const archivosRevealDisplayRef = useRef(0);
  const archivosLerpRafRef = useRef(0);
  const lastStepChangeAtRef = useRef(0);
  /** Desde cuándo el código está a pantalla completa (sin blanca encima). */
  const codigoPlantedAtRef = useRef(0);
  /**
   * Tras código → tiempo, QUEDAN queda centrado: el mismo flick no lo baja.
   * Se libera al acabar el gesto de rueda / al iniciar uno nuevo hacia abajo.
   */
  const pinTiempoCenteredRef = useRef(false);
  /**
   * Al llegar QUEDAN al centro desde abajo, el mismo flick no pasa a código.
   * Hay que soltar el gesto y volver a scrollear.
   */
  const blockAdvanceFromTiempoRef = useRef(false);
  /**
   * Tras cerrar archivos, el código debe asentarse: el mismo flick no sube a tiempo.
   */
  const pinCodigoAfterArchivosRef = useRef(false);
  /** Tras cerrar el vídeo, el mismo flick no mueve la descripción. */
  const pinHomeAfterVideoRef = useRef(false);
  const lastHomeWheelAtRef = useRef(0);

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
    tiempoProgressRef.current = 0;
    setTiempoProgressState(0);
    archivosRevealRef.current = 0;
    archivosRevealTargetRef.current = 0;
    archivosRevealDisplayRef.current = 0;
    setArchivosRevealState(0);
  }, []);

  useEffect(() => {
    return () => {
      if (archivosLerpRafRef.current) {
        cancelAnimationFrame(archivosLerpRafRef.current);
        archivosLerpRafRef.current = 0;
      }
    };
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
    (panel === 0 && archivosReveal >= 0.92);

  useEffect(() => {
    setChromeTheme(homeWhiteMode ? "white" : "blue");
  }, [homeWhiteMode]);

  useEffect(() => {
    const onContact = (event: Event) => {
      const progress = (event as CustomEvent<{ progress?: number }>).detail
        ?.progress;
      if (typeof progress === "number") {
        setArchivosContact(Math.min(1, Math.max(0, progress)));
      }
    };
    window.addEventListener(ARCHIVOS_CONTACT_EVENT, onContact);
    return () => window.removeEventListener(ARCHIVOS_CONTACT_EVENT, onContact);
  }, []);

  useEffect(() => {
    if (panel === 1 || archivosReveal >= 0.92) return;
    if (archivosContact !== 0) setArchivosContact(0);
  }, [panel, archivosReveal, archivosContact]);

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
    if (next >= 2) {
      tiempoProgressRef.current = 1;
      setTiempoProgressState(1);
    } else {
      tiempoProgressRef.current = 0;
      setTiempoProgressState(0);
    }
    if (next === 3 && archivosRevealTargetRef.current <= 0.001) {
      codigoPlantedAtRef.current = performance.now();
    } else if (next !== 3) {
      codigoPlantedAtRef.current = 0;
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

  /** Solo mueve el scroll de la descripción (sin tocar QUEDAN). */
  const applyIntroProgressOnly = useCallback((next: number) => {
    const p = Math.min(1, Math.max(0, next));
    introProgressRef.current = p;
    setIntroProgressState(p);
    const el = rootRef.current?.querySelector(
      HERO_INTRO_SCROLL_SELECTOR,
    ) as HTMLElement | null;
    if (!el) return;
    const rawMax = el.scrollHeight - el.clientHeight;
    if (rawMax >= 80) el.scrollTop = p * rawMax;
  }, []);

  /**
   * step 1 → 0 para seguir el intro: conservar la posición actual.
   * (Antes se forzaba intro=1 y la descripción saltaba arriba.)
   */
  const reenterIntroFromStep1 = useCallback(() => {
    heroStepRef.current = 0;
    setHeroStepState(0);
    if (tiempoProgressRef.current !== 0) {
      tiempoProgressRef.current = 0;
      setTiempoProgressState(0);
    }
    applyIntroProgressOnly(introProgressRef.current);
    window.dispatchEvent(
      new CustomEvent(RETO_HERO_STEP_EVENT, { detail: { step: 0 } }),
    );
    window.dispatchEvent(
      new CustomEvent(RETO_DETALLE_EVENT, {
        detail: { open: false, step: 0 },
      }),
    );
  }, [applyIntroProgressOnly]);

  /** Inversa de syncTiempoFromIntro: tp 1→intro 1, tp 0→intro early (sin salto a 0). */
  const introFromTiempo = useCallback((tp: number) => {
    const t = Math.min(1, Math.max(0, tp));
    return TIEMPO_EARLY_START + t * (1 - TIEMPO_EARLY_START);
  }, []);

  /** 0 = abajo (oculto), 1 = centrado. Al llegar a 1 → step tiempo. */
  const scrollTiempoBy = useCallback(
    (deltaPx: number) => {
      const prev = tiempoProgressRef.current;
      const next = Math.min(1, Math.max(0, prev + deltaPx / TIEMPO_SCROLL_PX));
      tiempoProgressRef.current = next;
      setTiempoProgressState(next);

      // QUEDAN ↔ descripción/título: mismo recorrido que al subir (sin saltar a intro 0).
      if (heroStepRef.current === 1 || heroStepRef.current === 2) {
        applyIntroProgressOnly(introFromTiempo(next));
      }

      if (next >= 1 && heroStepRef.current < 2) {
        heroStepRef.current = 2;
        setHeroStepState(2);
        applyIntroProgressOnly(1);
        // Acaba de centrarse: no saltar a código con el mismo scroll.
        if (prev < 0.999) blockAdvanceFromTiempoRef.current = true;
        window.dispatchEvent(
          new CustomEvent(RETO_HERO_STEP_EVENT, { detail: { step: 2 } }),
        );
        window.dispatchEvent(
          new CustomEvent(RETO_DETALLE_EVENT, {
            detail: { open: true, step: 2 },
          }),
        );
        lastStepChangeAtRef.current = performance.now();
      } else if (next >= 1 && prev < 0.999 && heroStepRef.current === 2) {
        blockAdvanceFromTiempoRef.current = true;
      } else if (next <= 0 && heroStepRef.current === 2) {
        heroStepRef.current = 1;
        setHeroStepState(1);
        applyIntroProgressOnly(TIEMPO_EARLY_START);
        window.dispatchEvent(
          new CustomEvent(RETO_HERO_STEP_EVENT, { detail: { step: 1 } }),
        );
        window.dispatchEvent(
          new CustomEvent(RETO_DETALLE_EVENT, {
            detail: { open: true, step: 1 },
          }),
        );
        lastStepChangeAtRef.current = performance.now();
      }

      return next;
    },
    [applyIntroProgressOnly, introFromTiempo],
  );

  /** Mientras sale la descripción, QUEDAN ya va subiendo. */
  const syncTiempoFromIntro = useCallback((introP: number) => {
    if (heroStepRef.current >= 2) return;
    if (introP <= TIEMPO_EARLY_START) {
      if (tiempoProgressRef.current !== 0) {
        tiempoProgressRef.current = 0;
        setTiempoProgressState(0);
      }
      return;
    }
    const tp = Math.min(
      1,
      (introP - TIEMPO_EARLY_START) / (1 - TIEMPO_EARLY_START),
    );
    tiempoProgressRef.current = tp;
    setTiempoProgressState(tp);
    if (tp >= 1 && heroStepRef.current < 2) {
      heroStepRef.current = 2;
      setHeroStepState(2);
      blockAdvanceFromTiempoRef.current = true;
      window.dispatchEvent(
        new CustomEvent(RETO_HERO_STEP_EVENT, { detail: { step: 2 } }),
      );
      window.dispatchEvent(
        new CustomEvent(RETO_DETALLE_EVENT, {
          detail: { open: true, step: 2 },
        }),
      );
      lastStepChangeAtRef.current = performance.now();
    }
  }, []);

  /** Progreso del intro. Al completar → pantalla azul vacía (step 1). */
  const setIntroProgress = useCallback(
    (next: number) => {
      const p = Math.min(1, Math.max(0, next));
      const prev = introProgressRef.current;
      introProgressRef.current = p;
      setIntroProgressState(p);

      if (p >= prev - 0.0001) {
        // Avance: QUEDAN sube con la salida de la descripción.
        syncTiempoFromIntro(p);
      } else if (heroStepRef.current < 2 && tiempoProgressRef.current !== 0) {
        // Retroceso: no volver a subir QUEDAN (evita 2.ª aparición).
        tiempoProgressRef.current = 0;
        setTiempoProgressState(0);
      }

      if (p >= 1) {
        if (heroStepRef.current === 0) {
          // Si QUEDAN ya llegó al centro con el intro, quedamos en tiempo.
          if (tiempoProgressRef.current >= 1) return;
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

      if (
        (heroStepRef.current === 1 || heroStepRef.current === 2) &&
        tiempoProgressRef.current <= 0
      ) {
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
    },
    [syncTiempoFromIntro],
  );

  /** Scroll del intro con topes: un impulso fuerte no lo manda arriba de golpe. */
  const scrollIntroBy = useCallback(
    (deltaPx: number, opts?: { gestureStart?: number; gestureCap?: number }) => {
      const el = rootRef.current?.querySelector(
        HERO_INTRO_SCROLL_SELECTOR,
      ) as HTMLElement | null;
      const rawMax = el ? el.scrollHeight - el.clientHeight : 0;
      const scrollPx =
        rawMax >= 80 ? rawMax : Math.max(440, window.innerHeight * 1.75);
      const startBoost = introProgressRef.current < 0.2 ? 1.28 : 1;
      const boostedDelta = deltaPx * startBoost;

      let nextP = introProgressRef.current + boostedDelta / scrollPx;
      if (el && rawMax >= 80) {
        const nextTop = Math.min(
          rawMax,
          Math.max(0, el.scrollTop + boostedDelta),
        );
        nextP = nextTop / rawMax;
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

  const setVideoReveal = useCallback((next: number) => {
    const p = Math.min(1, Math.max(0, next));
    const prev = videoRevealRef.current;
    videoRevealRef.current = p;
    setVideoRevealState(p);

    // Al terminar de subir el vídeo: home en título, sin descripción movida.
    if (prev < 0.999 && p >= 0.999) {
      heroStepRef.current = 0;
      setHeroStepState(0);
      introProgressRef.current = 0;
      setIntroProgressState(0);
      tiempoProgressRef.current = 0;
      setTiempoProgressState(0);
      const el = rootRef.current?.querySelector(
        HERO_INTRO_SCROLL_SELECTOR,
      ) as HTMLElement | null;
      if (el) el.scrollTop = 0;
      pinHomeAfterVideoRef.current = true;
    }
    if (p < 0.999) {
      pinHomeAfterVideoRef.current = false;
    }
  }, []);

  /** Sube/baja el vídeo según el scroll (0 = cubre, 1 = fuera). */
  const scrollVideoBy = useCallback(
    (deltaPx: number) => {
      const nextP = Math.min(
        1,
        Math.max(0, videoRevealRef.current + deltaPx / VIDEO_SCROLL_PX),
      );
      setVideoReveal(nextP);
      return nextP;
    },
    [setVideoReveal],
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
      videoRevealRef.current = 1;
      setVideoRevealState(1);
      archivosRevealRef.current = 1;
      archivosRevealTargetRef.current = 1;
      archivosRevealDisplayRef.current = 1;
      setArchivosRevealState(1);
    } else {
      archivosRevealRef.current = 0;
      archivosRevealTargetRef.current = 0;
      archivosRevealDisplayRef.current = 0;
      setArchivosRevealState(0);
    }
    window.history.replaceState(
      null,
      "",
      next === 1 ? "/#archivos" : "/#reto",
    );
  }, []);

  const applyArchivosSideEffects = useCallback(
    (p: number) => {
      if (p >= 1) {
        if (panelRef.current !== 1) {
          releaseCodigoFocus();
          panelRef.current = 1;
          setPanel(1);
          window.history.replaceState(null, "", "/#archivos");
        }
        return;
      }

      if (panelRef.current === 1 && p < 1) {
        panelRef.current = 0;
        setPanel(0);
        window.history.replaceState(null, "", "/#reto");
      }
    },
    [releaseCodigoFocus],
  );

  const tickArchivosLerp = useCallback(() => {
    const target = archivosRevealTargetRef.current;
    const display = archivosRevealDisplayRef.current;
    const next = display + (target - display) * ARCHIVOS_LERP;
    const settled = Math.abs(target - next) < 0.0015;

    const value = settled ? target : next;
    archivosRevealDisplayRef.current = value;
    archivosRevealRef.current = value;
    setArchivosRevealState(value);

    applyArchivosSideEffects(value);

    if (settled) {
      archivosLerpRafRef.current = 0;
      return;
    }

    archivosLerpRafRef.current = requestAnimationFrame(tickArchivosLerp);
  }, [applyArchivosSideEffects]);

  /** 0 = solo código/azul, 1 = archivos a pantalla completa. */
  const setArchivosReveal = useCallback(
    (next: number, opts?: { instant?: boolean }) => {
      const p = Math.min(1, Math.max(0, next));
      const prevTarget = archivosRevealTargetRef.current;
      archivosRevealTargetRef.current = p;

      // Mientras la blanca se mueve, el código no está “plantado”.
      if (p > 0.001) {
        codigoPlantedAtRef.current = 0;
        pinCodigoAfterArchivosRef.current = false;
      } else if (
        heroStepRef.current === 3 &&
        prevTarget > 0.001 &&
        p <= 0.001
      ) {
        // Blanca cerrada → asentar código; no subir a tiempo en el mismo gesto.
        codigoPlantedAtRef.current = performance.now();
        pinCodigoAfterArchivosRef.current = true;
      }

      if (opts?.instant) {
        if (archivosLerpRafRef.current) {
          cancelAnimationFrame(archivosLerpRafRef.current);
          archivosLerpRafRef.current = 0;
        }
        archivosRevealDisplayRef.current = p;
        archivosRevealRef.current = p;
        setArchivosRevealState(p);
        applyArchivosSideEffects(p);
        return p;
      }

      if (!archivosLerpRafRef.current) {
        archivosLerpRafRef.current = requestAnimationFrame(tickArchivosLerp);
      }
      return p;
    },
    [applyArchivosSideEffects, tickArchivosLerp],
  );

  const scrollArchivosRevealBy = useCallback(
    (deltaPx: number) => {
      const nextP =
        archivosRevealTargetRef.current + deltaPx / ARCHIVOS_REVEAL_SCROLL_PX;
      return setArchivosReveal(nextP);
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

  const goToCodigoFromTiempo = useCallback(() => {
    if (tiempoProgressRef.current < 0.999) return false;
    if (blockAdvanceFromTiempoRef.current) return false;
    blockAdvanceFromTiempoRef.current = false;
    pinTiempoCenteredRef.current = false;
    setHeroStep(3);
    lastStepChangeAtRef.current = performance.now();
    return true;
  }, [setHeroStep]);

  const advanceHeroOnHome = useCallback(() => {
    const step = heroStepRef.current;
    if (step === 0) {
      setHeroStep(1);
      return;
    }
    if (step === 1) {
      scrollTiempoBy(TIEMPO_SCROLL_PX);
      return;
    }
    if (step === 2) {
      if (tiempoProgressRef.current < 0.999) {
        scrollTiempoBy(TIEMPO_SCROLL_PX);
        return;
      }
      // Touch: un gesto = un paso si ya está centrado.
      blockAdvanceFromTiempoRef.current = false;
      goToCodigoFromTiempo();
      return;
    }
    scrollArchivosRevealBy(ARCHIVOS_WHEEL_CAP_PX);
  }, [setHeroStep, scrollArchivosRevealBy, scrollTiempoBy, goToCodigoFromTiempo]);

  /** Código a pantalla natural (sin blanca ni pin tras archivos). */
  const codigoIsNatural = useCallback(() => {
    if (archivosRevealTargetRef.current > 0.001) return false;
    if (archivosRevealDisplayRef.current > 0.02) return false;
    if (pinCodigoAfterArchivosRef.current) return false;
    return true;
  }, []);

  /**
   * Tras archivos, esperar planted + gesto nuevo antes de poder subir a tiempo.
   * true = este tick no debe subir (aún asentando o solo desbloquea).
   */
  const tryReleaseCodigoAfterArchivos = useCallback(
    (now: number, wheelGap: number) => {
      if (!pinCodigoAfterArchivosRef.current) return false;
      if (archivosRevealTargetRef.current > 0.001) return true;
      if (archivosRevealDisplayRef.current > 0.02) return true;
      const plantedAt = codigoPlantedAtRef.current;
      if (!plantedAt || now - plantedAt < CODIGO_PLANTED_MS) return true;
      if (wheelGap < TIEMPO_PIN_GAP_MS) return true;
      pinCodigoAfterArchivosRef.current = false;
      return true; // primer tick del gesto nuevo: solo desbloquea
    },
    [],
  );

  /** Código → tiempo centrado de golpe (sin scrub del flick). */
  const returnToTiempoFromCodigo = useCallback(() => {
    if (!codigoIsNatural()) return false;
    pinTiempoCenteredRef.current = true;
    tiempoProgressRef.current = 1;
    setTiempoProgressState(1);
    setHeroStep(2);
    lastStepChangeAtRef.current = performance.now();
    return true;
  }, [setHeroStep, codigoIsNatural]);

  const retreatHeroOnHome = useCallback(() => {
    if (archivosRevealTargetRef.current > 0 && panelRef.current === 0) {
      scrollArchivosRevealBy(-ARCHIVOS_WHEEL_CAP_PX);
      return;
    }
    const step = heroStepRef.current;
    if (step >= 3) {
      if (
        archivosRevealTargetRef.current > 0.001 ||
        archivosRevealDisplayRef.current > 0.02
      ) {
        scrollArchivosRevealBy(-ARCHIVOS_WHEEL_CAP_PX);
        return;
      }
      // Tras archivos: primero asentar código; un swipe solo desbloquea.
      if (pinCodigoAfterArchivosRef.current) {
        const plantedAt = codigoPlantedAtRef.current;
        if (
          !plantedAt ||
          performance.now() - plantedAt < CODIGO_PLANTED_MS
        ) {
          return;
        }
        pinCodigoAfterArchivosRef.current = false;
        return;
      }
      returnToTiempoFromCodigo();
      return;
    }
    if (step === 2 || (step === 1 && tiempoProgressRef.current > 0)) {
      if (step === 2 && pinTiempoCenteredRef.current) {
        pinTiempoCenteredRef.current = false;
        tiempoProgressRef.current = 1;
        setTiempoProgressState(1);
        return;
      }
      scrollTiempoBy(-TIEMPO_SCROLL_PX);
      return;
    }
    if (step === 1) {
      reenterIntroFromStep1();
      scrollIntroBy(-INTRO_WHEEL_CAP_PX);
    }
  }, [
    returnToTiempoFromCodigo,
    reenterIntroFromStep1,
    scrollArchivosRevealBy,
    scrollIntroBy,
    scrollTiempoBy,
  ]);

  /** Salir de archivos hacia el código con el mismo slide (reversa). */
  const beginArchivosExit = useCallback(() => {
    if (panelRef.current === 1) {
      panelRef.current = 0;
      setPanel(0);
      window.history.replaceState(null, "", "/#reto");
    }
    archivosRevealTargetRef.current = 1;
    archivosRevealDisplayRef.current = 1;
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

  /** Inicio del home: título visible, sin tiempo/código/archivos. */
  const resetHomeToStart = useCallback(() => {
    releaseCodigoFocus();
    lockedRef.current = false;
    codigoPlantedAtRef.current = 0;
    pinCodigoAfterArchivosRef.current = false;
    lastStepChangeAtRef.current = 0;

    if (archivosLerpRafRef.current) {
      cancelAnimationFrame(archivosLerpRafRef.current);
      archivosLerpRafRef.current = 0;
    }
    archivosRevealTargetRef.current = 0;
    archivosRevealDisplayRef.current = 0;
    archivosRevealRef.current = 0;
    setArchivosRevealState(0);
    setArchivosContact(0);

    if (panelRef.current !== 0) {
      panelRef.current = 0;
      setPanel(0);
    }

    heroStepRef.current = 0;
    setHeroStepState(0);
    introProgressRef.current = 0;
    setIntroProgressState(0);
    tiempoProgressRef.current = 0;
    setTiempoProgressState(0);
    videoRevealRef.current = 0;
    setVideoRevealState(0);
    pinHomeAfterVideoRef.current = false;

    const el = rootRef.current?.querySelector(
      HERO_INTRO_SCROLL_SELECTOR,
    ) as HTMLElement | null;
    if (el) el.scrollTop = 0;

    window.dispatchEvent(
      new CustomEvent(RETO_HERO_STEP_EVENT, { detail: { step: 0 } }),
    );
    window.dispatchEvent(
      new CustomEvent(RETO_DETALLE_EVENT, {
        detail: { open: false, step: 0 },
      }),
    );
    window.history.replaceState(null, "", "/#reto");
  }, [releaseCodigoFocus]);

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
      else resetHomeToStart();
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [goToArchivosFromTop, resetHomeToStart]);

  useEffect(() => {
    const onNavigate = () => goToArchivosFromTop();
    window.addEventListener("navigate-archivos-from-top", onNavigate);
    return () =>
      window.removeEventListener("navigate-archivos-from-top", onNavigate);
  }, [goToArchivosFromTop]);

  useEffect(() => {
    const onHomeReset = () => resetHomeToStart();
    window.addEventListener(HOME_RESET_EVENT, onHomeReset);
    return () => window.removeEventListener(HOME_RESET_EVENT, onHomeReset);
  }, [resetHomeToStart]);

  useEffect(() => {
    const onHeroRequest = () => {
      // Desde la primera carpeta hacia arriba: empezar a bajar la blanca.
      beginArchivosExit();
      scrollArchivosRevealBy(-ARCHIVOS_WHEEL_CAP_PX * 1.25);
    };
    window.addEventListener(HERO_REQUEST_EVENT, onHeroRequest);
    return () => window.removeEventListener(HERO_REQUEST_EVENT, onHeroRequest);
  }, [beginArchivosExit, scrollArchivosRevealBy]);

  useEffect(() => {
    let introGestureStart = 0;
    let introGestureActive = false;
    let lastIntroEventAt = 0;
    let stepAcc = 0;
    let stepAccAt = 0;

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
      const raw = wheelDeltaPx(event);
      const wheelGap =
        lastHomeWheelAtRef.current === 0
          ? Infinity
          : now - lastHomeWheelAtRef.current;
      // Solo soltar anclas al empezar un gesto nuevo (no en huecos del mismo flick).
      let pinJustReleased = false;
      let advanceJustUnlocked = false;
      let videoPinJustReleased = false;
      if (wheelGap >= TIEMPO_PIN_GAP_MS) {
        if (pinTiempoCenteredRef.current) {
          pinTiempoCenteredRef.current = false;
          pinJustReleased = true;
        }
        if (blockAdvanceFromTiempoRef.current) {
          blockAdvanceFromTiempoRef.current = false;
          advanceJustUnlocked = true;
        }
      }
      if (wheelGap >= VIDEO_PIN_GAP_MS) {
        if (pinHomeAfterVideoRef.current) {
          pinHomeAfterVideoRef.current = false;
          videoPinJustReleased = true;
        }
      }
      lastHomeWheelAtRef.current = now;

      // Intro: scroll progresivo hasta azul vacío.
      if (panelRef.current === 0) {
        const atHomeStart =
          heroStepRef.current === 0 &&
          introProgressRef.current <= 0.002 &&
          tiempoProgressRef.current <= 0.002 &&
          archivosRevealTargetRef.current <= 0.001;

        // Vídeo: sube/baja con el scroll (sin saltar de golpe).
        if (videoRevealRef.current < 0.999 || (atHomeStart && delta < 0)) {
          const capped =
            Math.sign(raw) * Math.min(Math.abs(raw), VIDEO_WHEEL_CAP_PX);
          scrollVideoBy(capped);
          return;
        }

        // Mismo flick que cerró el vídeo: no mover la descripción.
        if (
          atHomeStart &&
          delta > 0 &&
          (pinHomeAfterVideoRef.current || videoPinJustReleased)
        ) {
          introProgressRef.current = 0;
          setIntroProgressState(0);
          const el = rootRef.current?.querySelector(
            HERO_INTRO_SCROLL_SELECTOR,
          ) as HTMLElement | null;
          if (el) el.scrollTop = 0;
          return;
        }

        const step = heroStepRef.current;
        const introGap = lastIntroEventAt === 0 ? Infinity : now - lastIntroEventAt;

        // Con QUEDAN a medias en step 1, subir primero lo baja (no reentrar intro).
        if (step === 1 && delta < 0 && tiempoProgressRef.current > 0.002) {
          const capped =
            Math.sign(raw) * Math.min(Math.abs(raw), TIEMPO_WHEEL_CAP_PX);
          scrollTiempoBy(capped);
          return;
        }

        if (step === 0 || (step === 1 && delta < 0)) {
          lastIntroEventAt = now;
          if (introGap >= WHEEL_GESTURE_GAP_MS) {
            introGestureActive = false;
          }

          if (step === 1 && delta < 0) {
            reenterIntroFromStep1();
          }

          if (!introGestureActive) {
            introGestureActive = true;
            introGestureStart = introProgressRef.current;
          }

          const capped =
            Math.sign(raw) * Math.min(Math.abs(raw), INTRO_WHEEL_CAP_PX);
          scrollIntroBy(capped, {
            gestureStart: introGestureStart,
            gestureCap: INTRO_GESTURE_CAP,
          });
          return;
        }

        // QUEDAN: subir desde abajo / bajar solo si estamos en pantalla de tiempo.
        if (
          (step === 1 && delta > 0) ||
          (step === 2 &&
            delta > 0 &&
            tiempoProgressRef.current < 0.999)
        ) {
          const capped =
            Math.sign(raw) * Math.min(Math.abs(raw), TIEMPO_WHEEL_CAP_PX);
          scrollTiempoBy(capped);
          return;
        }

        if (step === 2 && delta < 0) {
          // Mismo flick / primer tick del gesto nuevo: quedarse centrado.
          if (pinTiempoCenteredRef.current || pinJustReleased) {
            tiempoProgressRef.current = 1;
            setTiempoProgressState(1);
            return;
          }
          if (now - lastStepChangeAtRef.current < STEP_SETTLE_MS) {
            return;
          }
          const capped =
            Math.sign(raw) * Math.min(Math.abs(raw), TIEMPO_WHEEL_CAP_PX);
          scrollTiempoBy(capped);
          return;
        }

        // Tiempo centrado + scroll abajo → código (solo si ya estaba centrado antes del gesto).
        if (step === 2 && delta > 0 && tiempoProgressRef.current >= 0.999) {
          if (blockAdvanceFromTiempoRef.current || advanceJustUnlocked) {
            return;
          }
          goToCodigoFromTiempo();
          return;
        }

        // Código → tiempo solo con código natural (tras archivos, no en el mismo flick).
        if (step === 3 && delta < 0) {
          if (
            archivosRevealTargetRef.current > 0.001 ||
            archivosRevealDisplayRef.current > 0.02
          ) {
            const capped =
              Math.sign(raw) *
              Math.min(Math.abs(raw), ARCHIVOS_WHEEL_CAP_PX);
            scrollArchivosRevealBy(capped);
            return;
          }
          if (tryReleaseCodigoAfterArchivos(now, wheelGap)) {
            return;
          }
          returnToTiempoFromCodigo();
          return;
        }

        // Código ↔ archivos: la blanca solo tras asentar el código.
        if (
          !codigoFocusedRef.current &&
          (step === 3 || archivosRevealTargetRef.current > 0.001)
        ) {
          const reveal = archivosRevealTargetRef.current;
          if (step === 3 && reveal <= 0.001 && delta > 0) {
            // Scroll fuerte desde tiempo: no abrir blanca hasta código plantado.
            const plantedAt = codigoPlantedAtRef.current;
            if (
              pinCodigoAfterArchivosRef.current ||
              !plantedAt ||
              now - plantedAt < CODIGO_PLANTED_MS ||
              archivosRevealDisplayRef.current > 0.02
            ) {
              stepAcc = 0;
              return;
            }
            const capped =
              Math.sign(raw) *
              Math.min(Math.abs(raw), ARCHIVOS_WHEEL_CAP_PX);
            scrollArchivosRevealBy(capped);
            return;
          }
          const capped =
            Math.sign(raw) *
            Math.min(Math.abs(raw), ARCHIVOS_WHEEL_CAP_PX);
          scrollArchivosRevealBy(capped);
          return;
        }

        // Vacío / tiempo / código: acumulación suave (scroll continuo funciona).
        if (step >= 1 && step <= 3) {
          if (now - stepAccAt > STEP_ACC_IDLE_MS) stepAcc = 0;
          stepAccAt = now;
          stepAcc += raw;

          if (now - lastStepChangeAtRef.current < STEP_SETTLE_MS) {
            return;
          }

          if (stepAcc >= STEP_WHEEL_THRESHOLD && delta > 0) {
            stepAcc = 0;
            lastStepChangeAtRef.current = now;
            if (step === 1) {
              scrollTiempoBy(TIEMPO_WHEEL_CAP_PX * 1.5);
            } else if (step === 2) {
              // Sin centro completo no hay código; el flick que centra tampoco salta.
              if (tiempoProgressRef.current < 0.999) {
                scrollTiempoBy(TIEMPO_WHEEL_CAP_PX * 1.5);
              } else if (
                !blockAdvanceFromTiempoRef.current &&
                !advanceJustUnlocked
              ) {
                goToCodigoFromTiempo();
              }
              stepAcc = 0;
            } else {
              const plantedAt = codigoPlantedAtRef.current;
              if (
                plantedAt > 0 &&
                now - plantedAt >= CODIGO_PLANTED_MS &&
                archivosRevealDisplayRef.current <= 0.02
              ) {
                scrollArchivosRevealBy(ARCHIVOS_WHEEL_CAP_PX * 1.4);
              }
            }
            return;
          }

          if (stepAcc <= -STEP_WHEEL_THRESHOLD && delta < 0) {
            if (step === 3) {
              stepAcc = 0;
              if (
                archivosRevealTargetRef.current > 0.001 ||
                archivosRevealDisplayRef.current > 0.02
              ) {
                scrollArchivosRevealBy(-ARCHIVOS_WHEEL_CAP_PX * 1.4);
                return;
              }
              if (tryReleaseCodigoAfterArchivos(now, wheelGap)) {
                return;
              }
              returnToTiempoFromCodigo();
              return;
            }

            stepAcc = 0;
            lastStepChangeAtRef.current = now;
            if (step === 2) {
              if (pinTiempoCenteredRef.current) {
                tiempoProgressRef.current = 1;
                setTiempoProgressState(1);
                return;
              }
              scrollTiempoBy(-TIEMPO_WHEEL_CAP_PX * 1.5);
            } else {
              // step 1 → reentrar intro sin saltar la descripción arriba
              reenterIntroFromStep1();
              introGestureActive = false;
              scrollIntroBy(-INTRO_WHEEL_CAP_PX * 1.2, {
                gestureStart: introProgressRef.current,
                gestureCap: INTRO_GESTURE_CAP,
              });
            }
            return;
          }
          return;
        }
      }

      if (panelRef.current === 1) {
        const dir = delta > 0 ? 1 : -1;
        dispatchArchivoWheel(dir);
        return;
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [
    dispatchArchivoWheel,
    scrollIntroBy,
    scrollVideoBy,
    scrollArchivosRevealBy,
    scrollTiempoBy,
    setHeroStep,
    returnToTiempoFromCodigo,
    reenterIntroFromStep1,
    goToCodigoFromTiempo,
    tryReleaseCodigoAfterArchivos,
  ]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    type TouchMode = "none" | "video" | "intro" | "tiempo" | "archivos" | "codigo";

    let tracking = false;
    let mode: TouchMode = "none";
    let startX = 0;
    let startY = 0;
    let prevY = 0;
    let totalDy = 0;
    let pendingDy = 0;
    let rafId = 0;
    let reenteredIntro = false;
    let openedCodigoThisTouch = false;
    let closedVideoThisTouch = false;
    let returnedToTiempoThisTouch = false;

    const fromField = (target: EventTarget | null) =>
      target instanceof Element &&
      Boolean(target.closest("input, textarea, [data-codigo-field]"));

    const pickTouchMode = (): TouchMode => {
      if (panelRef.current !== 0) return "none";
      const step = heroStepRef.current;
      const videoDone = videoRevealRef.current >= 0.999;

      if (!videoDone) return "video";
      if (step === 0 || step === 1) return "intro";
      if (step === 2) return "tiempo";
      if (step === 3 && !codigoFocusedRef.current) {
        if (archivosRevealTargetRef.current > 0.001) return "archivos";
        return "codigo";
      }
      return "none";
    };

    // Boost por gesto táctil: un dedo recorre más progreso que su distancia bruta.
    const TOUCH_MULT = 1.55;

    const applyDelta = (rawDy: number) => {
      if (lockedRef.current) return;
      if (panelRef.current !== 0) return;
      if (!rawDy) return;

      const frameDy = rawDy * TOUCH_MULT;

      if (mode === "video") {
        const next = Math.min(
          1,
          Math.max(0, videoRevealRef.current + rawDy / VIDEO_SCROLL_PX_TOUCH),
        );
        setVideoReveal(next);
        if (next >= 0.999) {
          mode = "intro";
          closedVideoThisTouch = true;
        }
        return;
      }

      if (mode === "intro") {
        if (closedVideoThisTouch && frameDy > 0) return;

        const step = heroStepRef.current;

        // Step 0 tope inferior + swipe hacia abajo: devuelve el vídeo.
        if (
          step === 0 &&
          frameDy < 0 &&
          introProgressRef.current <= 0.002 &&
          videoRevealRef.current >= 0.999
        ) {
          mode = "video";
          const next = Math.min(
            1,
            Math.max(0, videoRevealRef.current + rawDy / VIDEO_SCROLL_PX_TOUCH),
          );
          setVideoReveal(next);
          return;
        }

        if (step === 1 && frameDy < 0 && !reenteredIntro) {
          reenteredIntro = true;
          reenterIntroFromStep1();
        }

        if (step === 1 && frameDy >= 0) {
          mode = "tiempo";
        } else {
          const nextP = scrollIntroBy(frameDy);
          if (nextP >= 0.999 && frameDy > 0) mode = "tiempo";
          return;
        }
      }

      if (mode === "tiempo") {
        // Tras volver de código a tiempo en este gesto, ignoramos el resto
        // del arrastre para no atropellar hasta la descripción.
        if (returnedToTiempoThisTouch) return;

        const step = heroStepRef.current;
        if (step <= 1 && frameDy < 0 && tiempoProgressRef.current <= 0.002) {
          mode = "intro";
          scrollIntroBy(frameDy);
          return;
        }
        if (
          step === 2 &&
          tiempoProgressRef.current >= 0.999 &&
          frameDy > 0 &&
          !openedCodigoThisTouch &&
          !blockAdvanceFromTiempoRef.current
        ) {
          openedCodigoThisTouch = true;
          goToCodigoFromTiempo();
          mode = "codigo";
          return;
        }
        scrollTiempoBy(frameDy);
        return;
      }

      if (mode === "codigo") {
        if (frameDy < 0) {
          if (returnToTiempoFromCodigo()) {
            mode = "tiempo";
            returnedToTiempoThisTouch = true;
          }
          return;
        }
        if (
          frameDy > 0 &&
          codigoPlantedAtRef.current > 0 &&
          performance.now() - codigoPlantedAtRef.current >= CODIGO_PLANTED_MS
        ) {
          mode = "archivos";
          scrollArchivosRevealBy(frameDy);
        }
        return;
      }

      if (mode === "archivos") {
        scrollArchivosRevealBy(frameDy);
      }
    };

    const flush = () => {
      rafId = 0;
      const dy = pendingDy;
      pendingDy = 0;
      applyDelta(dy);
    };

    const scheduleFlush = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(flush);
    };

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
      mode = pickTouchMode();
      startX = touch.clientX;
      startY = touch.clientY;
      prevY = startY;
      totalDy = 0;
      pendingDy = 0;
      reenteredIntro = false;
      openedCodigoThisTouch = false;
      closedVideoThisTouch = false;
      returnedToTiempoThisTouch = false;
    };

    const onMove = (event: TouchEvent) => {
      if (!tracking) return;
      const touch = event.touches[0];
      if (!touch) return;

      const y = touch.clientY;
      const frameDy = prevY - y;
      prevY = y;
      totalDy = startY - y;
      const dx = touch.clientX - startX;

      if (Math.abs(totalDy) > Math.abs(dx) && Math.abs(totalDy) > 4) {
        event.preventDefault();
      }

      if (!frameDy) return;
      pendingDy += frameDy;
      scheduleFlush();
    };

    const onEnd = () => {
      if (!tracking) return;
      tracking = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
        if (pendingDy) applyDelta(pendingDy);
        pendingDy = 0;
      }
      // Al soltar libero el bloqueo de "mismo gesto no avanza al código".
      blockAdvanceFromTiempoRef.current = false;

      if (lockedRef.current) return;

      const delta = totalDy;
      mode = "none";

      if (panelRef.current === 1 && Math.abs(delta) >= TOUCH_THRESHOLD) {
        dispatchArchivoWheel(delta);
      }
    };

    root.addEventListener("touchstart", onStart, { passive: true });
    root.addEventListener("touchmove", onMove, { passive: false });
    root.addEventListener("touchend", onEnd, { passive: true });
    root.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      root.removeEventListener("touchstart", onStart);
      root.removeEventListener("touchmove", onMove);
      root.removeEventListener("touchend", onEnd);
      root.removeEventListener("touchcancel", onEnd);
    };
  }, [
    dispatchArchivoWheel,
    setVideoReveal,
    scrollIntroBy,
    scrollTiempoBy,
    scrollArchivosRevealBy,
    reenterIntroFromStep1,
    goToCodigoFromTiempo,
    returnToTiempoFromCodigo,
  ]);

  const participarActive =
    panel === 0 &&
    videoReveal >= 0.999 &&
    archivosReveal < 0.15 &&
    !searchOpen &&
    !diccionarioOpen &&
    !mobileMenuOpen;

  const hideHeader = panel === 0 && codigoFocused;
  const mobileMenuWhite = panel === 1 || archivosReveal >= 0.92;
  const reveal = panel === 1 ? 1 : archivosReveal;
  const archivosInteractive = reveal >= 0.97 || panel === 1;

  const heroWithStep = isValidElement<{
    step?: HeroStep;
    panel?: 0 | 1;
    introProgress?: number;
    tiempoProgress?: number;
  }>(hero)
    ? cloneElement(hero, {
        step: heroStep,
        panel: panel as 0 | 1,
        introProgress,
        tiempoProgress,
      })
    : hero;

  return (
    <div
      ref={rootRef}
      className={`relative h-full min-h-0 overflow-hidden overscroll-none touch-none pb-[var(--safe-bottom)] transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
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
        className={`pointer-events-none fixed inset-x-0 top-0 z-[70] hidden bg-transparent md:block ${
          hideHeader ? "opacity-0" : ""
        }`}
        style={{
          color: homeWhiteMode ? "var(--background)" : "#fff",
          opacity: hideHeader ? 0 : Math.max(0, 1 - archivosContact * archivosContact * (3 - 2 * archivosContact) * 0.95),
          transform: `translate3d(0, ${-(archivosContact * archivosContact * (3 - 2 * archivosContact)) * 85}%, 0)`,
          willChange: archivosContact > 0.01 ? "transform, opacity" : undefined,
          transition:
            archivosContact > 0.01
              ? undefined
              : "opacity 300ms cubic-bezier(0.33,1,0.68,1)",
        }}
        aria-hidden={hideHeader || archivosContact > 0.7}
      >
        <div
          className={
            hideHeader || archivosContact > 0.45
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
        hideMenu={codigoFocused || archivosContact > 0.55}
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
          <div className="relative h-full w-full">
            <div
              className="h-full w-full"
              style={{
                opacity: videoReveal >= 0.999 ? 1 : 0,
                transition: "opacity 220ms ease-out",
                pointerEvents: videoReveal >= 0.999 ? "auto" : "none",
              }}
              aria-hidden={videoReveal < 0.999}
            >
              {heroWithStep}
            </div>
            <HomeIntroVideo progress={videoReveal} />
          </div>
        </section>

        <section
          className={`absolute inset-0 flex min-h-0 flex-col overflow-hidden bg-white text-[var(--background)] pt-0 pb-[var(--safe-bottom)] md:pt-[calc(68px+var(--safe-top))] ${
            archivosInteractive
              ? "z-[2] pointer-events-auto"
              : "z-[3] pointer-events-none"
          }`}
          style={{
            transform: `translate3d(0, ${(1 - reveal) * 100}%, 0)`,
            willChange: "transform",
            backfaceVisibility: "hidden",
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
