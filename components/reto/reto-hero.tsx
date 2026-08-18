"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ClickableText } from "@/components/diccionario/clickable-text";
import { useCrtPower } from "@/components/layout/crt-power-transition";
import { PARTICIPAR_BTN_CLASS } from "@/components/layout/participar-cursor";
import { RetoTimeBar } from "@/components/reto/reto-time-bar";

export const RETO_DETALLE_EVENT = "reto-detalle";

type RetoHeroProps = {
  numero: string;
  titulo: string;
  descripcion: string;
  fechaInicio?: string | null;
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

export function RetoHero({
  numero,
  titulo,
  descripcion,
  fechaInicio,
  fechaFin,
}: RetoHeroProps) {
  const { powerOffTo } = useCrtPower();
  const [detalle, setDetalle] = useState(false);
  const [codigo, setCodigo] = useState("");

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
    <div
      className="relative h-full w-full overflow-hidden"
      onClick={
        detalle
          ? (event) => {
              // Desktop: el clic es Participar (sube al zone). Móvil: tap cierra.
              if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
                return;
              }
              event.stopPropagation();
              setOpen(false);
            }
          : undefined
      }
      onContextMenu={
        detalle
          ? (event) => {
              event.preventDefault();
              event.stopPropagation();
              setOpen(false);
            }
          : undefined
      }
    >
      <div
        className="absolute left-1/2 w-full px-[var(--grid-margin)] text-center [word-spacing:0.45em]"
        style={{
          top: detalle ? "10%" : "50%",
          transform: detalle ? "translate(-50%, 0)" : "translate(-50%, -50%)",
          transition:
            "top 480ms cubic-bezier(0.22, 1, 0.36, 1), transform 480ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <p className="text-[clamp(28px,5.5vw,40px)] font-normal uppercase leading-none tracking-normal">
          #{numero}
        </p>

        <h1 className="mt-3 text-[clamp(36px,7vw,56px)] font-medium uppercase leading-tight tracking-normal md:mt-4">
          <ClickableText text={titulo} enabled />
        </h1>

        <div
          className={`grid transition-[grid-template-rows,opacity] duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
            detalle
              ? "mt-0 grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          }`}
          aria-hidden={!detalle}
        >
          <div className="overflow-hidden">
            <RetoTimeBar
              fechaInicio={fechaInicio}
              fechaFin={fechaFin}
              active={detalle}
            />

            <p className="mx-auto mt-6 w-full max-w-[80%] text-center text-[clamp(18px,3.6vw,24px)] font-normal normal-case leading-snug tracking-normal [word-spacing:normal] md:mt-8">
              {renderDescripcion(descripcion)}
            </p>

            <label
              data-codigo-field=""
              className="mx-auto mt-16 flex w-full max-w-[92%] cursor-text items-center justify-center [word-spacing:normal] md:mt-20"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <input
                type="text"
                name="codigo"
                value={codigo}
                onChange={(event) => setCodigo(event.target.value)}
                placeholder="INTRODUCIR CODIGO DE PARTICIPACIÓN"
                aria-label="Introducir codigo de participación"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                size={38}
                className="w-full min-w-0 bg-transparent text-center text-[clamp(13px,2.8vw,22px)] font-normal uppercase leading-none tracking-normal text-white outline-none placeholder:text-white/70"
              />
            </label>
          </div>
        </div>

        {/* Móvil: botón fijo (también en descripción). Desktop: cursor. */}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            powerOffTo("/subir");
          }}
          className={`mt-6 ${detalle ? "!mt-8" : ""} ${PARTICIPAR_BTN_CLASS} md:hidden`}
          style={{ cursor: 'url("/xp_link_xl.cur"), pointer' }}
        >
          <span>[Participar]</span>
        </button>
      </div>
    </div>
  );
}
