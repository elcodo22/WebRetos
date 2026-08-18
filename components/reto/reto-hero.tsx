"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ClickableText } from "@/components/diccionario/clickable-text";
import { RetoTimeBar } from "@/components/reto/reto-time-bar";

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
        className={`mt-3 text-[clamp(36px,7vw,56px)] font-medium uppercase leading-tight tracking-normal md:mt-4 ${
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
      <div
        className={`absolute left-1/2 z-10 w-full px-[var(--grid-margin)] text-center [word-spacing:0.45em] transition-[top,transform] duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          detalle
            ? "top-[88px] -translate-x-1/2 translate-y-0 md:top-[92px]"
            : "top-1/2 -translate-x-1/2 -translate-y-1/2"
        }`}
      >
        <TituloBlock numero={numero} titulo={titulo} />
      </div>

      <div
        className={`absolute inset-x-0 bottom-0 top-[88px] flex flex-col px-[var(--grid-margin)] text-center [word-spacing:0.45em] transition-opacity duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] md:top-[92px] ${
          detalle
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!detalle}
      >
        <div className="shrink-0" aria-hidden>
          <TituloBlock numero={numero} titulo={titulo} hidden />
        </div>

        <p className="mx-auto mt-10 w-full shrink-0 text-center text-[clamp(18px,3.6vw,24px)] font-normal normal-case leading-snug tracking-normal [word-spacing:normal] md:mt-8 md:max-w-[80%]">
          {renderDescripcion(descripcion)}
        </p>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 pb-8 pt-2">
          <RetoTimeBar fechaFin={fechaFin} active={detalle} />

          <label
            data-codigo-field=""
            className="flex w-full max-w-[92%] cursor-text items-center justify-center [word-spacing:normal]"
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
              className="w-full min-w-0 touch-auto bg-transparent text-center text-[clamp(18px,4.6vw,26px)] font-normal uppercase leading-none tracking-normal text-white outline-none placeholder:text-white/70"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
