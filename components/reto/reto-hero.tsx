"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ClickableText } from "@/components/diccionario/clickable-text";
import { formatRetoNumero } from "@/lib/format-reto-numero";

export type HeroStep = 0 | 1 | 2 | 3;

export const RETO_HERO_STEP_EVENT = "reto-hero-step";
export const RETO_CODIGO_FOCUS_EVENT = "reto-codigo-focus";
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
};

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const STEP_MS = 480;

function TitleBar({
  numero,
  titulo,
  descripcion,
  visible,
  dark,
  descripcionOpacity,
  descripcionOffsetVh,
}: {
  numero: string;
  titulo: string;
  descripcion: string;
  visible: boolean;
  dark: boolean;
  descripcionOpacity: number;
  /** vh desde el centro: 0 = centro, negativo = sube y sale por arriba. */
  descripcionOffsetVh: number;
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-30 transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      } ${dark ? "text-[var(--background)]" : "text-white"}`}
      aria-hidden={!visible}
    >
      <div
        className="absolute inset-0 flex items-center justify-center px-[var(--grid-margin)]"
        style={{
          opacity: descripcionOpacity,
          transform: `translateY(${descripcionOffsetVh}vh)`,
        }}
      >
        <p className="w-full max-w-[28rem] text-center text-[clamp(14px,2.6vw,19px)] font-normal uppercase leading-snug tracking-normal [word-spacing:normal] md:max-w-[min(72%,28rem)]">
          {descripcion}
        </p>
      </div>

      {/* Título + #num: abajo en móvil, centrado en desktop. */}
      <div className="site-grid absolute inset-x-0 bottom-[max(1.25rem,var(--safe-bottom))] w-full items-center md:bottom-auto md:top-1/2 md:-translate-y-1/2">
        <div className="col-span-4 col-start-1 flex min-w-0 items-center justify-between gap-4 font-normal uppercase leading-none tracking-wide md:col-span-8 md:col-start-2">
          <span className="relative z-10 min-w-0 max-w-[34%] truncate text-[clamp(13px,2.8vw,18px)] pointer-events-auto">
            <ClickableText text={titulo} enabled={visible} />
          </span>
          <span className="relative z-10 shrink-0 whitespace-nowrap text-[clamp(16px,3.8vw,25px)]">
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
}: RetoHeroProps) {
  const [step, setStep] = useState<HeroStep>(stepProp ?? 0);
  const [tiempoProgress, setTiempoProgress] = useState(tiempoProgressProp);
  const [codigo, setCodigo] = useState("");
  const [codigoFocused, setCodigoFocused] = useState(false);
  const [portH, setPortH] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    if (step !== 3 && codigoFocused) {
      setCodigoFocused(false);
      dispatchCodigoFocus(false);
    }
  }, [step, codigoFocused]);

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
  const codigoMode = showCodigo && codigoFocused && panel === 0;
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
          className={layerClass(showCodigo)}
          style={layerStyle}
          aria-hidden={!showCodigo}
        >
          <label
            data-codigo-field=""
            className="flex w-full max-w-[92%] cursor-text items-center justify-center [word-spacing:normal] md:max-w-[80%]"
          >
            <input
              type="text"
              name="codigo"
              value={codigo}
              onChange={(event) => setCodigo(event.target.value)}
              onFocus={() => {
                setCodigoFocused(true);
                dispatchCodigoFocus(true);
              }}
              onBlur={() => {
                setCodigoFocused(false);
                dispatchCodigoFocus(false);
              }}
              placeholder="INTRODUCIR CODIGO DE PARTICIPACIÓN"
              aria-label="Introducir codigo de participación"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              size={38}
              className={`w-full min-w-0 bg-transparent text-center text-[clamp(16px,3vw,22px)] font-normal uppercase leading-none tracking-normal outline-none ${
                codigoMode
                  ? "text-[var(--background)] placeholder:text-[var(--background)]/55"
                  : "text-white placeholder:text-white/70"
              }`}
            />
          </label>
        </div>
      </div>

      <div
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
        aria-hidden={!codigoMode}
      >
        <button
          type="button"
          className="text-left ui-btn-text font-normal leading-snug tracking-normal text-[var(--background)]"
        >
          ¿Cómo consigo un código?
        </button>
        <button
          type="button"
          className="shrink-0 ui-btn-text font-normal tracking-wide text-[var(--background)]"
        >
          [PARTICIPAR]
        </button>
      </div>
    </div>
  );
}
