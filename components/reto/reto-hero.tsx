"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ClickableText } from "@/components/diccionario/clickable-text";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import {
  RETO_DESCRIPCION_CLASS_HERO,
  RETO_DESCRIPCION_MAX_W,
  RETO_DESCRIPCION_TEXT_SIZE_HERO,
} from "@/lib/reto-descripcion";
import { formatRetoNumero } from "@/lib/format-reto-numero";
import { VideoThumbnail } from "@/components/video/video-thumbnail";

export type HeroStep = 0 | 1 | 2 | 3;

export const RETO_HERO_STEP_EVENT = "reto-hero-step";
export const RETO_CODIGO_FOCUS_EVENT = "reto-codigo-focus";
export const RETO_CODIGO_DISMISS_EVENT = "reto-codigo-dismiss";
export const RETO_CODIGO_ENGAGED_ATTR = "data-codigo-engaged";
export const RETO_PARTICIPAR_EVENT = "reto-participar";
export const RETO_OBRA_ENVIADA_EVENT = "reto-obra-enviada";

export type ObraHeroState = {
  videoUid: string;
  previewUrl?: string;
  titulo: string;
};

function dispatchParticipar(codigo: string) {
  window.dispatchEvent(
    new CustomEvent(RETO_PARTICIPAR_EVENT, { detail: { codigo } }),
  );
}
/** @deprecated Usar RETO_HERO_STEP_EVENT con step >= 1 */
export const RETO_DETALLE_EVENT = "reto-detalle";
/** Contenedor de scroll del intro (título → descripción). */
export const HERO_INTRO_SCROLL_SELECTOR = "[data-hero-intro-scroll]";

const HERO_STEPS: HeroStep[] = [0, 1, 2, 3];

function isHeroStep(value: unknown): value is HeroStep {
  return HERO_STEPS.includes(value as HeroStep);
}

type RetoHeroProps = {
  numero: string;
  titulo: string;
  descripcion: string;
  step?: HeroStep;
  /** 0 = descripción, 1 = descripción centrada (sigue el scroll). */
  introProgress?: number;
  /** 0 = QUEDAN abajo, 1 = centrado. */
  tiempoProgress?: number;
  panel?: 0 | 1;
  obraVideoUid?: string | null;
  obraPreviewUrl?: string | null;
  obraTitulo?: string | null;
};

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const STEP_MS = 480;
/** Móvil: título fijo y bloque debajo (descripción / código) con el mismo gap. */
const MOBILE_TITLE_LIFT = "2.85rem";
const MOBILE_BODY_BELOW_TITLE_TOP = "calc(50% - 0.65rem)";

function TitleBar({
  numero,
  titulo,
  descripcion,
  visible,
  dark,
  descripcionOpacity,
  descripcionOffsetVh,
  showCodigo = false,
}: {
  numero: string;
  titulo: string;
  descripcion: string;
  visible: boolean;
  dark: boolean;
  descripcionOpacity: number;
  /** vh desde el centro: 0 = centro, negativo = sube y sale por arriba. */
  descripcionOffsetVh: number;
  showCodigo?: boolean;
}) {
  const titleNumClass =
    "font-normal uppercase leading-none tracking-wide pointer-events-auto";
  const tituloClass = `reto-heading-titulo relative z-10 min-w-0 max-w-[11rem] truncate ${titleNumClass}`;
  const numeroClass = `reto-heading-text relative z-10 shrink-0 whitespace-nowrap ${titleNumClass}`;
  const descripcionClass = `${GeistMono.className} ${RETO_DESCRIPCION_CLASS_HERO} ${RETO_DESCRIPCION_MAX_W}`;

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-30 transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      } ${dark ? "text-[var(--background)]" : "text-white"}`}
      aria-hidden={!visible}
    >
      {/* Móvil: título + # fijos; descripción debajo (animada). */}
      <div
        className="absolute inset-x-0 top-1/2 z-10 flex justify-center px-[calc(var(--grid-margin)+0.85rem)] md:hidden"
        style={{ transform: `translateY(-${MOBILE_TITLE_LIFT})` }}
      >
        <div className="pointer-events-auto flex max-w-full items-center justify-center gap-x-3 gap-y-1 text-center">
          <span className={tituloClass}>
            <ClickableText text={titulo} enabled={visible} />
          </span>
          <span className={numeroClass}>#{formatRetoNumero(numero)}</span>
        </div>
      </div>
      {showCodigo ? null : (
        <div
          className="absolute inset-x-0 flex justify-center px-[calc(var(--grid-margin)+0.85rem)] md:hidden"
          style={{
            top: MOBILE_BODY_BELOW_TITLE_TOP,
            opacity: descripcionOpacity,
            transform: `translateY(${descripcionOffsetVh}vh)`,
          }}
        >
          <p className={`${descripcionClass} w-full max-w-[24rem]`}>
            {descripcion}
          </p>
        </div>
      )}

      {/* Desktop: descripción al centro; título + # en fila a mitad de pantalla. */}
      <div
        className="absolute inset-0 hidden items-center justify-center px-[var(--grid-margin)] md:flex"
        style={{
          opacity: descripcionOpacity,
          transform: `translateY(${descripcionOffsetVh}vh)`,
        }}
      >
        <p className={`${descripcionClass} max-w-[min(72%,28rem)]`}>
          {descripcion}
        </p>
      </div>

      <div className="absolute inset-x-0 top-1/2 hidden w-full -translate-y-1/2 px-[var(--grid-margin)] md:grid md:grid-cols-10 md:gap-x-[var(--grid-gutter)]">
        <div className="col-span-8 col-start-2 flex min-w-0 items-center justify-between gap-4 font-normal uppercase leading-none tracking-wide">
          <span className="reto-heading-titulo relative z-10 min-w-0 max-w-[34%] truncate pointer-events-auto">
            <ClickableText text={titulo} enabled={visible} />
          </span>
          <span className="reto-heading-text relative z-10 shrink-0 whitespace-nowrap">
            #{formatRetoNumero(numero)}
          </span>
        </div>
      </div>
    </div>
  );
}

function dispatchCodigoFocus(focused: boolean) {
  window.dispatchEvent(
    new CustomEvent(RETO_CODIGO_FOCUS_EVENT, { detail: { focused } }),
  );
}

function dispatchHeroStep(step: HeroStep) {
  window.dispatchEvent(
    new CustomEvent(RETO_HERO_STEP_EVENT, { detail: { step } }),
  );
  window.dispatchEvent(
    new CustomEvent(RETO_DETALLE_EVENT, { detail: { open: step >= 1, step } }),
  );
}

export function RetoHero({
  numero,
  titulo,
  descripcion,
  step: stepProp,
  introProgress: introProgressProp = 0,
  tiempoProgress: tiempoProgressProp = 0,
  panel = 0,
  obraVideoUid = null,
  obraPreviewUrl = null,
  obraTitulo = null,
}: RetoHeroProps) {
  const [step, setStep] = useState<HeroStep>(stepProp ?? 0);
  const [tiempoProgress, setTiempoProgress] = useState(tiempoProgressProp);
  const [codigo, setCodigo] = useState("");
  const [codigoFocused, setCodigoFocused] = useState(false);
  const [obraLocal, setObraLocal] = useState<ObraHeroState | null>(null);
  const [portH, setPortH] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const codigoInputRef = useRef<HTMLInputElement>(null);
  const codigoFocusedRef = useRef(false);
  const codigoFieldEngagedRef = useRef(false);
  const skipDismissThisGestureRef = useRef(false);
  const lastTouchGestureEndRef = useRef(0);
  const heroRootRef = useRef<HTMLDivElement>(null);

  const setCodigoFieldEngaged = useCallback((engaged: boolean) => {
    codigoFieldEngagedRef.current = engaged;
    const root = heroRootRef.current;
    if (!root) return;
    if (engaged) {
      root.setAttribute(RETO_CODIGO_ENGAGED_ATTR, "");
    } else {
      root.removeAttribute(RETO_CODIGO_ENGAGED_ATTR);
    }
  }, []);

  const dismissCodigoEntry = useCallback(() => {
    if (!codigoFocusedRef.current) return;
    codigoFocusedRef.current = false;
    setCodigoFieldEngaged(false);
    codigoInputRef.current?.blur();
    setCodigo("");
    setCodigoFocused(false);
    dispatchCodigoFocus(false);
    window.dispatchEvent(new CustomEvent(RETO_CODIGO_DISMISS_EVENT));
  }, [setCodigoFieldEngaged]);

  const tryHandleCodigoOutsideInteraction = useCallback(
    (target: EventTarget | null) => {
      if (!codigoFocusedRef.current) return;
      const el = target as Element | null;
      if (el?.closest("[data-codigo-field]")) return;
      if (el?.closest("[data-codigo-actions]")) return;

      if (codigoFieldEngagedRef.current) {
        setCodigoFieldEngaged(false);
        codigoInputRef.current?.blur();
        skipDismissThisGestureRef.current = true;
        return;
      }

      if (skipDismissThisGestureRef.current) return;

      dismissCodigoEntry();
    },
    [dismissCodigoEntry, setCodigoFieldEngaged],
  );

  useEffect(() => {
    codigoFocusedRef.current = codigoFocused;
  }, [codigoFocused]);

  useEffect(() => {
    if (stepProp !== undefined) setStep(stepProp);
  }, [stepProp]);

  useEffect(() => {
    setTiempoProgress(tiempoProgressProp);
  }, [tiempoProgressProp]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => {
      setPortH(el.clientHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Si estamos al inicio, forzar scroll arriba (evita título perdido).
  useEffect(() => {
    if ((stepProp ?? step) !== 0) return;
    if (introProgressProp > 0.001) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = 0;
  }, [stepProp, step, introProgressProp, portH]);

  // Sincroniza scrollTop con el progreso controlado desde home-snap.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    if (max < 80) {
      if (introProgressProp <= 0) el.scrollTop = 0;
      return;
    }
    const target = introProgressProp * max;
    if (Math.abs(el.scrollTop - target) < 1) return;
    el.scrollTop = target;
  }, [introProgressProp, portH]);

  useEffect(() => {
    function onObraEnviada(event: Event) {
      const obra = (event as CustomEvent<ObraHeroState>).detail;
      if (!obra?.videoUid) return;
      setObraLocal(obra);
      setCodigo("");
      setCodigoFocused(false);
      codigoFocusedRef.current = false;
      setCodigoFieldEngaged(false);
    }

    window.addEventListener(RETO_OBRA_ENVIADA_EVENT, onObraEnviada);
    return () =>
      window.removeEventListener(RETO_OBRA_ENVIADA_EVENT, onObraEnviada);
  }, [setCodigoFieldEngaged]);

  useEffect(() => {
    if (step !== 3 && codigoFocused) {
      dismissCodigoEntry();
    }
  }, [step, codigoFocused, dismissCodigoEntry]);

  useEffect(() => {
    function onDismiss() {
      dismissCodigoEntry();
    }

    window.addEventListener(RETO_CODIGO_DISMISS_EVENT, onDismiss);
    return () => window.removeEventListener(RETO_CODIGO_DISMISS_EVENT, onDismiss);
  }, [dismissCodigoEntry]);

  useEffect(() => {
    if (!codigoFocused || step !== 3) return;

    const resetGesture = () => {
      skipDismissThisGestureRef.current = false;
    };

    const onTouchStart = () => {
      resetGesture();
    };

    const onTouchEnd = (event: TouchEvent) => {
      tryHandleCodigoOutsideInteraction(event.target);
      lastTouchGestureEndRef.current = Date.now();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      if (Date.now() - lastTouchGestureEndRef.current < 400) return;
      resetGesture();
      tryHandleCodigoOutsideInteraction(event.target);
    };

    document.addEventListener("touchstart", onTouchStart, {
      capture: true,
      passive: true,
    });
    document.addEventListener("touchend", onTouchEnd, {
      capture: true,
      passive: true,
    });
    document.addEventListener("pointerdown", onPointerDown, { capture: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart, { capture: true });
      document.removeEventListener("touchend", onTouchEnd, { capture: true });
      document.removeEventListener("pointerdown", onPointerDown, { capture: true });
    };
  }, [codigoFocused, step, tryHandleCodigoOutsideInteraction]);

  useEffect(() => {
    return () => dispatchCodigoFocus(false);
  }, []);

  const setHeroStep = useCallback((next: HeroStep) => {
    setStep(next);
    dispatchHeroStep(next);
  }, []);

  useEffect(() => {
    function onHeroStep(event: Event) {
      const next = (event as CustomEvent<{ step?: HeroStep }>).detail?.step;
      if (isHeroStep(next)) setStep(next);
    }

    function onDetalle(event: Event) {
      const detail = (event as CustomEvent<{ open?: boolean; step?: HeroStep }>)
        .detail;
      if (isHeroStep(detail?.step)) {
        setStep(detail.step);
        return;
      }
      if (typeof detail?.open === "boolean") {
        setStep(detail.open ? 1 : 0);
      }
    }

    window.addEventListener(RETO_HERO_STEP_EVENT, onHeroStep);
    window.addEventListener(RETO_DETALLE_EVENT, onDetalle);
    return () => {
      window.removeEventListener(RETO_HERO_STEP_EVENT, onHeroStep);
      window.removeEventListener(RETO_DETALLE_EVENT, onDetalle);
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (event.target instanceof HTMLInputElement) {
        event.target.blur();
        return;
      }
      if (step > 0) setHeroStep((step - 1) as HeroStep);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, setHeroStep]);

  const tiempoP = Math.min(1, Math.max(0, tiempoProgress));
  const introP = Math.min(1, Math.max(0, introProgressProp));
  // step 0/1 sigue el intro; step 2 sigue el tiempo (misma progresión).
  const descMotion = step === 0 || step === 1 ? introP : tiempoP;
  const showIntro = step <= 1 || (step === 2 && tiempoP < 0.999);
  const descripcionOpacity =
    step <= 2
      ? Math.min(1, Math.max(0, 1 - Math.max(0, descMotion - 0.88) / 0.12))
      : 0;
  // Centro → fuera por arriba (~70vh).
  const descripcionOffsetVh = step <= 2 ? -descMotion * 70 : -70;
  const introOpacity = showIntro ? 1 : 0;
  const showCodigo = step === 3;
  const mergedPreviewUrl =
    obraLocal?.previewUrl ?? obraPreviewUrl;
  const mergedVideoUid = obraLocal?.videoUid ?? obraVideoUid;
  const mergedTitulo = obraLocal?.titulo ?? obraTitulo;
  const obraEnviada = Boolean(mergedVideoUid || mergedPreviewUrl);
  const codigoMode =
    showCodigo && codigoFocused && panel === 0 && !obraEnviada;
  const showTitleBar = panel === 0 && step <= 3;

  const layerClass = (visible: boolean) =>
    `home-hero-layer absolute inset-0 flex flex-col items-center justify-center px-[var(--grid-margin)] text-center ${
      visible
        ? "z-[2] pointer-events-auto translate-y-0 opacity-100"
        : "z-0 pointer-events-none translate-y-0 opacity-0"
    }`;

  const layerStyle = {
    transitionTimingFunction: EASE,
    transitionDuration: `${STEP_MS}ms`,
    transitionProperty: "opacity",
  } as const;

  const sectionH = portH > 0 ? portH : undefined;

  return (
    <div
      ref={heroRootRef}
      className={`relative h-full w-full overflow-hidden transition-colors duration-[380ms] ease-[cubic-bezier(0.33,1,0.68,1)] ${
        codigoMode ? "bg-white text-[var(--background)]" : ""
      }`}
      data-codigo-focus={codigoMode ? "" : undefined}
    >
      <div className="absolute inset-0 [word-spacing:0.45em]">
        {/* # + título: suben con el scroll y se fijan en el centro */}
        <TitleBar
          numero={numero}
          titulo={titulo}
          descripcion={descripcion}
          visible={showTitleBar}
          dark={codigoMode}
          descripcionOpacity={descripcionOpacity}
          descripcionOffsetVh={descripcionOffsetVh}
          showCodigo={showCodigo}
        />

        {/* Scroll: azul vacío (se asoma al bajar QUEDAN) */}
        <div
          className={`absolute inset-0 ${
            showIntro ? "z-[1]" : "z-0"
          } ${step <= 1 && showIntro ? "pointer-events-auto" : "pointer-events-none"}`}
          style={{
            opacity: introOpacity,
            transitionTimingFunction: EASE,
            transitionDuration: step === 2 ? "0ms" : `${STEP_MS}ms`,
            transitionProperty: "opacity",
          }}
          aria-hidden={!showIntro}
        >
          <div
            ref={scrollRef}
            data-hero-intro-scroll=""
            className="absolute inset-0 z-0 overflow-y-auto overflow-x-hidden overscroll-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <section
              className="relative w-full shrink-0"
              style={{ height: sectionH ?? "100%" }}
              aria-hidden
            />
            <div
              className="w-full shrink-0"
              style={{ height: sectionH ? Math.round(sectionH * 0.75) : "75%" }}
              aria-hidden
            />
          </div>
        </div>

        <div
          className={`${layerClass(showCodigo)} ${
            showCodigo
              ? "max-md:absolute max-md:inset-x-0 max-md:top-[calc(50%-0.65rem)] max-md:justify-start max-md:pt-0 max-md:translate-y-0"
              : ""
          }`}
          style={layerStyle}
          aria-hidden={!showCodigo}
        >
          <label
            data-codigo-field=""
            className={`flex w-full max-w-[92%] items-center justify-center [word-spacing:normal] md:max-w-[80%] ${
              obraEnviada ? "pointer-events-none" : "cursor-text"
            }`}
          >
            {obraEnviada ? (
              <div className="relative aspect-video w-[min(92vw,22rem)] md:w-[20rem]">
                <VideoThumbnail
                  videoUrl={mergedPreviewUrl ?? ""}
                  videoUid={mergedVideoUid}
                  alt={mergedTitulo ?? "Tu obra"}
                  loading="eager"
                />
              </div>
            ) : (
              <input
                ref={codigoInputRef}
                type="text"
                name="codigo"
                value={codigo}
                onChange={(event) => setCodigo(event.target.value)}
                onFocus={() => {
                  codigoFocusedRef.current = true;
                  setCodigoFieldEngaged(true);
                  setCodigoFocused(true);
                  dispatchCodigoFocus(true);
                }}
                placeholder="INTRODUCIR CODIGO DE PARTICIPACIÓN"
                aria-label="Introducir codigo de participación"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                size={38}
                className={`${GeistSans.className} ${RETO_DESCRIPCION_TEXT_SIZE_HERO} w-full min-w-0 bg-transparent text-center font-medium uppercase leading-snug tracking-normal [word-spacing:normal] outline-none ${
                  codigoMode
                    ? "text-[var(--background)] placeholder:text-[var(--background)]/55"
                    : "text-white placeholder:text-white/70"
                }`}
              />
            )}
          </label>
        </div>
      </div>

      <div
        data-codigo-actions=""
        className={`absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-4 px-[clamp(28px,6vw,56px)] pb-[max(1.5rem,calc(var(--safe-bottom)+0.75rem))] md:pb-10 ${
          codigoMode
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        style={{
          transitionProperty: "opacity",
          transitionDuration: `${STEP_MS}ms`,
          transitionTimingFunction: EASE,
        }}
        aria-hidden={!codigoMode || obraEnviada}
      >
        {!obraEnviada ? (
          <>
        <button
          type="button"
          className="text-left ui-btn-text font-normal leading-snug tracking-normal text-[var(--background)]"
        >
          ¿Cómo consigo un código?
        </button>
        <button
          type="button"
          className="shrink-0 ui-btn-text font-normal tracking-wide text-[var(--background)]"
          onClick={() => {
            const value = codigo;
            dismissCodigoEntry();
            dispatchParticipar(value);
          }}
        >
          [PARTICIPAR]
        </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
