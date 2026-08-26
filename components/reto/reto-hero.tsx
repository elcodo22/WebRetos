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
  fechaFin?: string | null;
  step?: HeroStep;
  /** 0 = descripción, 1 = descripción centrada (sigue el scroll). */
  introProgress?: number;
  /** 0 = QUEDAN abajo, 1 = centrado. */
  tiempoProgress?: number;
  panel?: 0 | 1;
};

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const STEP_MS = 480;
/** Altura aprox. de la fila # + título (para fijarla al centro). */
const TITLE_BAR_H = 32;
const TITLE_BAR_BOTTOM_PAD = 40;
/** En móvil: título abajo, encima del safe-bottom. */
const TITLE_BAR_BOTTOM_PAD_MOBILE = 56;

function titleBarTop(
  portH: number,
  introProgress: number,
  step: HeroStep,
  mobile: boolean,
  tiempoProgress = 1,
): number {
  if (mobile) {
    // No se usa con `bottom` fijo; se mantiene por tipado del call site.
    return TITLE_BAR_BOTTOM_PAD_MOBILE;
  }
  if (portH <= 0) return TITLE_BAR_BOTTOM_PAD;
  const trailer = Math.max(1, portH * 0.75);
  // Centro solo con QUEDAN/código a pantalla completa; si bajan, el título baja con ellos.
  const pinCenter =
    step >= 3 || (step >= 2 && tiempoProgress >= 0.999);
  const scrollTop = pinCenter ? trailer : introProgress * trailer;
  const naturalTop = portH - TITLE_BAR_BOTTOM_PAD - TITLE_BAR_H - scrollTop;
  const pinnedTop = (portH - TITLE_BAR_H) / 2;
  return Math.max(naturalTop, pinnedTop);
}

function TitleBar({
  numero,
  titulo,
  top,
  visible,
  dark,
  mobile,
}: {
  numero: string;
  titulo: string;
  top: number;
  visible: boolean;
  dark: boolean;
  mobile: boolean;
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 z-30 transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      } ${dark ? "text-[var(--background)]" : "text-white"}`}
      style={
        mobile
          ? {
              bottom:
                "max(1rem, calc(var(--safe-bottom, 0px) + 0.85rem))",
            }
          : {
              top,
              height: TITLE_BAR_H,
            }
      }
      aria-hidden={!visible}
    >
      <div className="site-grid w-full items-center">
        <div className="col-span-2 col-start-1 truncate text-[clamp(16px,3.8vw,25px)] font-normal uppercase leading-none tracking-wide md:col-span-2 md:col-start-2">
          <span className="pointer-events-auto">
            <ClickableText text={titulo} enabled={visible} />
          </span>
        </div>
        <div className="col-span-2 col-start-3 whitespace-nowrap text-right text-[clamp(16px,3.8vw,25px)] font-normal uppercase leading-none tracking-wide md:col-span-2 md:col-start-8">
          #{formatRetoNumero(numero)}
        </div>
      </div>
    </div>
  );
}

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

export function RetoHero({
  numero,
  titulo,
  descripcion,
  fechaFin,
  step: stepProp,
  introProgress: introProgressProp = 0,
  tiempoProgress: tiempoProgressProp = 0,
  panel = 0,
}: RetoHeroProps) {
  const [step, setStep] = useState<HeroStep>(stepProp ?? 0);
  const [introProgress, setIntroProgress] = useState(introProgressProp);
  const [tiempoProgress, setTiempoProgress] = useState(tiempoProgressProp);
  const [codigo, setCodigo] = useState("");
  const [codigoFocused, setCodigoFocused] = useState(false);
  const [portH, setPortH] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (stepProp !== undefined) setStep(stepProp);
  }, [stepProp]);

  useEffect(() => {
    setIntroProgress(introProgressProp);
  }, [introProgressProp]);

  useEffect(() => {
    setTiempoProgress(tiempoProgressProp);
  }, [tiempoProgressProp]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

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
  // Descripción visible en intro/vacío, y asomándose mientras QUEDAN baja.
  const showIntro = step <= 1 || (step === 2 && tiempoP < 0.999);
  const introOpacity =
    step === 2 ? Math.min(1, Math.max(0, (1 - tiempoP) * 1.15)) : showIntro ? 1 : 0;
  const showTiempo = tiempoP > 0.002 && step < 3;
  const showCodigo = step === 3;
  const codigoMode = showCodigo && codigoFocused && panel === 0;
  const p = Math.min(1, Math.max(0, introProgress));
  const barTop = titleBarTop(portH, p, step, isMobile, tiempoP);
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
  // Sube desde abajo → centro con el scroll; con código solo se funde.
  // En step 2 (tiempo) siempre anclado al centro si el progreso está completo.
  const tiempoOffsetY =
    step >= 3 ? 0 : step === 2 && tiempoP >= 0.999 ? 0 : (1 - tiempoP) * 52;
  const tiempoOpacity =
    step >= 3 ? 0 : Math.min(1, Math.max(0, tiempoP * 1.4));

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
          top={barTop}
          visible={showTitleBar}
          dark={codigoMode}
          mobile={isMobile}
        />

        {/* Scroll: descripción → azul vacío (se asoma al bajar QUEDAN) */}
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
              className="relative flex w-full shrink-0 flex-col"
              style={{ height: sectionH ?? "100%" }}
            >
              <div
                className={`flex min-h-0 flex-1 items-center justify-center px-[var(--grid-margin)] ${
                  isMobile ? "pb-20 pt-14" : "pb-16"
                }`}
              >
                <p className="w-full max-w-[min(48rem,90%)] text-center text-[clamp(18px,3.6vw,24px)] font-normal normal-case leading-snug tracking-normal [word-spacing:normal] md:max-w-[52rem]">
                  {renderDescripcion(descripcion)}
                </p>
              </div>
            </section>

            <div
              className="w-full shrink-0"
              style={{ height: sectionH ? Math.round(sectionH * 0.75) : "75%" }}
              aria-hidden
            />
          </div>
        </div>

        <div
          className={`home-hero-layer absolute inset-0 flex flex-col items-center justify-center px-[var(--grid-margin)] text-center ${
            showTiempo || step >= 3
              ? "z-[2] pointer-events-none"
              : "z-0 pointer-events-none"
          }`}
          style={{
            opacity: tiempoOpacity,
            transform: `translate3d(0, ${tiempoOffsetY}%, 0)`,
            transitionTimingFunction: EASE,
            transitionDuration: `${STEP_MS}ms`,
            transitionProperty: "opacity",
            willChange: "transform, opacity",
          }}
          aria-hidden={!showTiempo}
        >
          <div className="w-full [word-spacing:normal]">
            {fechaFin ? (
              <RetoTimeBar
                fechaFin={fechaFin}
                active={tiempoP > 0.05 || step >= 2}
                size="hero"
                align="center"
                format="phrase"
              />
            ) : (
              <RetoTimeBar
                active={tiempoP > 0.05 || step >= 2}
                size="hero"
                align="center"
                format="phrase"
              />
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
