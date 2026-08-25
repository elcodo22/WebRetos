"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ClickableText } from "@/components/diccionario/clickable-text";
import { RetoTimeBar } from "@/components/reto/reto-time-bar";

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
  fechaFin?: string | null;
  step?: HeroStep;
  /** 0 = solo título, 1 = descripción centrada (sigue el scroll). */
  introProgress?: number;
  panel?: 0 | 1;
};

const EASE = "cubic-bezier(0.33, 1, 0.68, 1)";
const STEP_MS = 380;

function renderDescripcion(texto: string): ReactNode[] {
  const parts = texto.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) {
      return (
        <strong key={index} className="font-bold">
          {bold[1]}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
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

function TituloBlock({
  numero,
  titulo,
}: {
  numero: string;
  titulo: string;
}) {
  return (
    <h1 className="flex flex-wrap items-baseline justify-center gap-x-[0.35em] gap-y-1 text-center text-[clamp(26px,4.5vw,38px)] font-medium uppercase leading-tight tracking-normal">
      <span className="font-normal">#{numero}</span>
      <span>
        <ClickableText text={titulo} enabled />
      </span>
    </h1>
  );
}

export function RetoHero({
  numero,
  titulo,
  descripcion,
  fechaFin,
  step: stepProp,
  introProgress: introProgressProp = 0,
  panel = 0,
}: RetoHeroProps) {
  const [step, setStep] = useState<HeroStep>(stepProp ?? 0);
  const [introProgress, setIntroProgress] = useState(introProgressProp);
  const [codigo, setCodigo] = useState("");
  const [codigoFocused, setCodigoFocused] = useState(false);
  const [portH, setPortH] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (stepProp !== undefined) setStep(stepProp);
  }, [stepProp]);

  useEffect(() => {
    setIntroProgress(introProgressProp);
  }, [introProgressProp]);

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

  const showIntro = step <= 1;
  const showTiempo = step === 2;
  const showCodigo = step === 3;
  const codigoMode = showCodigo && codigoFocused && panel === 0;
  // Solo transparentar al scrollear; desaparece al centrarse la descripción
  const p = step >= 1 ? 1 : Math.min(1, Math.max(0, introProgress));
  // Se transparenta despacio (sin irse tan pronto)
  const TITLE_FADE_START = 0.05;
  const TITLE_FADE_END = 0.4;
  const fadeT =
    p <= TITLE_FADE_START
      ? 0
      : Math.min(
          1,
          (p - TITLE_FADE_START) / (TITLE_FADE_END - TITLE_FADE_START),
        );
  const titleOpacity = step === 0 ? 1 - Math.pow(fadeT, 2.8) : 0;

  const layerClass = (visible: boolean) =>
    `home-hero-layer absolute inset-0 flex flex-col items-center justify-center px-[var(--grid-margin)] text-center ${
      visible
        ? "z-[2] pointer-events-auto translate-y-0 scale-100 opacity-100"
        : "z-0 pointer-events-none translate-y-2 scale-[0.992] opacity-0"
    }`;

  const layerStyle = {
    transitionTimingFunction: EASE,
    transitionDuration: `${STEP_MS}ms`,
    transitionProperty: "opacity, transform",
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
        {/* Scroll: título fijo (se transparenta) + descripción que sube */}
        <div
          className={`absolute inset-0 ${
            showIntro
              ? "z-[2] pointer-events-auto opacity-100"
              : "z-0 pointer-events-none opacity-0"
          }`}
          style={{
            transitionTimingFunction: EASE,
            transitionDuration: `${STEP_MS}ms`,
            transitionProperty: "opacity",
          }}
          aria-hidden={!showIntro}
        >
          {/* Título fijo en el centro: no sube, solo se transparenta */}
          <div
            className="pointer-events-none absolute inset-x-0 top-1/2 z-20 flex -translate-y-1/2 justify-center px-[var(--grid-margin)]"
            style={{ opacity: titleOpacity }}
            aria-hidden={titleOpacity < 0.05}
          >
            <div className="w-full max-w-4xl">
              <TituloBlock numero={numero} titulo={titulo} />
            </div>
          </div>

          <div
            ref={scrollRef}
            data-hero-intro-scroll=""
            className="absolute inset-0 z-0 overflow-y-auto overflow-x-hidden overscroll-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {/* 1) Hasta aquí la descripción queda centrada y el título ya es 0 */}
            <div
              className="w-full shrink-0"
              style={{ height: sectionH ?? "100%" }}
              aria-hidden
            />

            {/* 2) Descripción */}
            <section
              className="flex w-full shrink-0 items-center justify-center px-[var(--grid-margin)]"
              style={{ height: sectionH ?? "100%" }}
            >
              <p className="w-full max-w-[min(48rem,90%)] text-center text-[clamp(18px,3.6vw,24px)] font-normal normal-case leading-snug tracking-normal [word-spacing:normal] md:max-w-[52rem]">
                {renderDescripcion(descripcion)}
              </p>
            </section>

            {/* 3) Sale → azul vacío (un pelín más corto: el tiempo un poco antes) */}
            <div
              className="w-full shrink-0"
              style={{ height: sectionH ? Math.round(sectionH * 0.75) : "75%" }}
              aria-hidden
            />
          </div>
        </div>

        <div
          className={layerClass(showTiempo)}
          style={layerStyle}
          aria-hidden={!showTiempo}
        >
          <div className="[word-spacing:normal]">
            {fechaFin ? (
              <RetoTimeBar
                fechaFin={fechaFin}
                active={showTiempo}
                size="hero"
                align="center"
              />
            ) : (
              <RetoTimeBar active={showTiempo} size="hero" align="center" />
            )}
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
              className={`w-full min-w-0 bg-transparent text-center text-[clamp(18px,4.6vw,26px)] font-normal uppercase leading-none tracking-normal outline-none ${
                codigoMode
                  ? "text-[var(--background)] placeholder:text-[var(--background)]/55"
                  : "text-white placeholder:text-white/70"
              }`}
            />
          </label>
        </div>
      </div>

      <div
        className={`absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-4 px-[var(--grid-margin)] pb-[max(1.5rem,calc(var(--safe-bottom)+0.75rem))] md:pb-10 ${
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
