"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ClickableText } from "@/components/diccionario/clickable-text";
import { useCrtPower } from "@/components/layout/crt-power-transition";
import { PixelHelpIcon } from "@/components/reto/pixel-help-icon";

export const RETO_DETALLE_EVENT = "reto-detalle";

type RetoHeroProps = {
  numero: string;
  titulo: string;
  descripcion: string;
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

export function RetoHero({ numero, titulo, descripcion }: RetoHeroProps) {
  const { powerOffTo } = useCrtPower();
  const [detalle, setDetalle] = useState(false);

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
      if (event.key === "Escape") setOpen(false);
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
            "top 500ms cubic-bezier(0.4, 0, 0.2, 1), transform 500ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <p className="text-[clamp(28px,5.5vw,40px)] font-normal uppercase leading-none tracking-normal">
          #{numero}
        </p>

        <h1 className="mt-3 text-[clamp(36px,7vw,56px)] font-medium uppercase leading-tight tracking-normal md:mt-4">
          <ClickableText text={titulo} enabled />
        </h1>

        <div
          className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            detalle
              ? "mt-0 grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          }`}
          aria-hidden={!detalle}
        >
          <div className="overflow-hidden">
            <p className="mt-6 w-full text-center text-[clamp(18px,3.6vw,24px)] font-normal normal-case leading-snug tracking-normal [word-spacing:normal] md:mt-8">
              {renderDescripcion(descripcion)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            powerOffTo("/subir");
          }}
          className="mt-6 text-[clamp(18px,3.8vw,24px)] font-normal normal-case tracking-normal text-current [word-spacing:0.2em] md:hidden"
        >
          [Participar]
        </button>
      </div>

      {!detalle ? (
        <button
          type="button"
          aria-label="Ver descripción del reto"
          aria-expanded={false}
          onClick={(event) => {
            event.stopPropagation();
            setOpen(true);
          }}
          className="absolute bottom-[18px] right-[18px] z-10 text-current md:bottom-6 md:right-6"
          style={{ cursor: 'url("/xp_link_xl.cur"), pointer' }}
        >
          <PixelHelpIcon className="h-6 w-6 md:h-7 md:w-7" size={28} />
        </button>
      ) : null}
    </div>
  );
}
