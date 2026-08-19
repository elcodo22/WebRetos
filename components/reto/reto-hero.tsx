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
import { RetoTimeCursor } from "@/components/reto/reto-time-cursor";

export const RETO_DETALLE_EVENT = "reto-detalle";

type RetoHeroProps = {
  numero: string;
  titulo: string;
  descripcion: string;
  fechaFin?: string | null;
};

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

function dispatchDetalle(open: boolean) {
  window.dispatchEvent(
    new CustomEvent(RETO_DETALLE_EVENT, { detail: { open } }),
  );
}

function TituloBlock({
  numero,
  titulo,
  hidden = false,
}: {
  numero: string;
  titulo: string;
  hidden?: boolean;
}) {
  return (
    <>
      <p
        className={`text-[clamp(28px,5.5vw,40px)] font-normal uppercase leading-none tracking-normal ${
          hidden ? "invisible" : ""
        }`}
      >
        #{numero}
      </p>
      <h1
        className={`mt-0.5 text-[clamp(36px,7vw,56px)] font-medium uppercase leading-tight tracking-normal md:mt-1 ${
          hidden ? "invisible" : ""
        }`}
      >
        {hidden ? titulo : <ClickableText text={titulo} enabled />}
      </h1>
    </>
  );
}

export function RetoHero({
  numero,
  titulo,
  descripcion,
  fechaFin,
}: RetoHeroProps) {
  const [detalle, setDetalle] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [codigoOverlay, setCodigoOverlay] = useState(false);
  const overlayInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!codigoOverlay) return;
    const id = requestAnimationFrame(() => overlayInputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [codigoOverlay]);

  useEffect(() => {
    if (!detalle && codigoOverlay) setCodigoOverlay(false);
  }, [detalle, codigoOverlay]);

  const setOpen = useCallback((open: boolean) => {
    setDetalle(open);
    dispatchDetalle(open);
  }, []);

  useEffect(() => {
    function onDetalle(event: Event) {
      const open = (event as CustomEvent<{ open?: boolean }>).detail?.open;
      if (typeof open === "boolean") setDetalle(open);
    }

    window.addEventListener(RETO_DETALLE_EVENT, onDetalle);
    return () => {
      window.removeEventListener(RETO_DETALLE_EVENT, onDetalle);
      dispatchDetalle(false);
    };
  }, []);

  useEffect(() => {
    if (!detalle) return;

    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (event.target instanceof HTMLInputElement) {
        event.target.blur();
        return;
      }
      setOpen(false);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detalle, setOpen]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Contador que sigue al cursor, solo desktop y solo en descripcion */}
      <RetoTimeCursor fechaFin={fechaFin} active={detalle} />

      {/* Contador arriba centrado, solo movil y solo en descripcion */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-[max(12px,var(--safe-top))] z-20 flex justify-center transition-opacity duration-[480ms] md:hidden ${
          detalle ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden={!detalle}
      >
        <RetoTimeBar fechaFin={fechaFin} active={detalle} />
      </div>

      <div
        className={`absolute left-1/2 z-10 w-full px-[var(--grid-margin)] text-center [word-spacing:0.45em] transition-[top,transform] duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          detalle
            ? "top-[calc(max(12px,var(--safe-top))+80px)] -translate-x-1/2 translate-y-0 md:top-[calc(80px+max(20px,var(--safe-top)))]"
            : "top-1/2 -translate-x-1/2 -translate-y-1/2"
        }`}
      >
        <TituloBlock numero={numero} titulo={titulo} />
      </div>

      <div
        className={`absolute inset-x-0 bottom-0 top-[calc(max(12px,var(--safe-top))+80px)] flex flex-col px-[var(--grid-margin)] text-center [word-spacing:0.45em] md:top-[calc(80px+max(20px,var(--safe-top)))] ${
          detalle ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!detalle}
      >
        <div className="shrink-0" aria-hidden>
          <TituloBlock numero={numero} titulo={titulo} hidden />
        </div>

        <div
          className={`grid min-h-0 flex-1 transition-[grid-template-rows,opacity] duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
            detalle
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="flex min-h-0 flex-col overflow-hidden">
            <p className="mx-auto mt-10 w-full shrink-0 text-center text-[clamp(18px,3.6vw,24px)] font-normal normal-case leading-snug tracking-normal [word-spacing:normal] md:mt-8 md:max-w-[80%]">
              {renderDescripcion(descripcion)}
            </p>

            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 pb-[calc(72px+var(--safe-bottom)+0.5rem)] pt-2 md:pb-8">
              <label
                data-codigo-field=""
                className="flex w-full max-w-[92%] cursor-text items-center justify-center [word-spacing:normal]"
                onClick={(event) => {
                  event.stopPropagation();
                  setCodigoOverlay(true);
                }}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <input
                  type="text"
                  name="codigo"
                  value={codigo}
                  onFocus={(event) => {
                    event.currentTarget.blur();
                    setCodigoOverlay(true);
                  }}
                  readOnly
                  placeholder="INTRODUCIR CODIGO DE PARTICIPACIÓN"
                  aria-label="Introducir codigo de participación"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  size={38}
                  className="w-full min-w-0 cursor-text touch-auto bg-transparent text-center text-[clamp(18px,4.6vw,26px)] font-normal uppercase leading-none tracking-normal text-white outline-none placeholder:text-white/70"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay al pulsar codigo: pantalla azul con input centrado y boton participar */}
      <div
        className={`fixed inset-0 z-[60] flex flex-col bg-[var(--background)] transition-opacity duration-200 ${
          codigoOverlay
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setCodigoOverlay(false);
        }}
        onTouchStart={(event) => {
          if (event.target === event.currentTarget) setCodigoOverlay(false);
        }}
        aria-hidden={!codigoOverlay}
      >
        <div className="flex min-h-0 flex-1 items-center justify-center px-[var(--grid-margin)]">
          <input
            ref={overlayInputRef}
            type="text"
            value={codigo}
            onChange={(event) => setCodigo(event.target.value)}
            placeholder="INTRODUCIR CODIGO DE PARTICIPACIÓN"
            aria-label="Introducir codigo de participación"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="w-full max-w-2xl bg-transparent text-center text-[clamp(20px,5vw,32px)] font-normal uppercase leading-none tracking-normal text-white outline-none placeholder:text-white/70"
            onBlur={() => setCodigoOverlay(false)}
          />
        </div>
        <div className="flex shrink-0 justify-end px-[var(--grid-margin)] pb-[max(1.5rem,calc(var(--safe-bottom)+0.75rem))]">
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => {
              event.stopPropagation();
              // TODO: validar y participar
            }}
            className="btn-pixel"
          >
            Participar
          </button>
        </div>
      </div>
    </div>
  );
}
