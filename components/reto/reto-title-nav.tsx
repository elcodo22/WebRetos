"use client";

import { ClickableText } from "@/components/diccionario/clickable-text";
import { GeistMono } from "geist/font/mono";
import { useRetoFeedNav } from "@/components/reto/reto-snap";
import {
  RETO_DESCRIPCION_CLASS_RETO_PAGE,
  RETO_DESCRIPCION_MAX_W,
  RETO_TITULO_CLASS,
} from "@/lib/reto-descripcion";
import { formatRetoNumero } from "@/lib/format-reto-numero";

type RetoTitleNavProps = {
  numero: string;
  titulo: string;
  descripcion?: string;
  /** En el feed deslizado solo se muestra título y número. */
  showDescripcion?: boolean;
};

type RetoFeedTitleBarProps = {
  numero: string;
  titulo: string;
  visible: boolean;
};

export function RetoFeedTitleBar({
  numero,
  titulo,
  visible,
}: RetoFeedTitleBarProps) {
  const numeroLabel = `#${formatRetoNumero(numero)}`;

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-0 z-[55] flex items-center justify-between gap-4 px-4 pb-[max(1rem,var(--safe-bottom,0px))] transition-opacity duration-300 md:px-8 md:pb-6 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!visible}
    >
      <span
        className={`${RETO_TITULO_CLASS} pointer-events-auto min-w-0 max-w-[min(68%,24rem)] truncate text-left drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]`}
      >
        <ClickableText text={titulo} enabled={visible} />
      </span>
      <span
        className={`${RETO_TITULO_CLASS} shrink-0 whitespace-nowrap tabular-nums text-right drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]`}
      >
        {numeroLabel}
      </span>
    </div>
  );
}

export function RetoTitleNav({
  numero,
  titulo,
  descripcion,
  showDescripcion = true,
}: RetoTitleNavProps) {
  const { panel } = useRetoFeedNav();
  const onFeed = panel === 1;
  const numeroLabel = `#${formatRetoNumero(numero)}`;

  return (
    <>
      <div
        className={`flex min-w-0 max-w-[min(100%,48rem)] flex-col items-center gap-4 px-2 text-center transition-opacity duration-300 md:gap-5 ${
          onFeed ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
        aria-hidden={onFeed}
      >
        <h1 className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <span className={`${RETO_TITULO_CLASS} min-w-0 max-w-[11rem] truncate`}>
            <ClickableText text={titulo} enabled={!onFeed} />
          </span>
          <span
            className={`${RETO_TITULO_CLASS} shrink-0 whitespace-nowrap tabular-nums`}
          >
            {numeroLabel}
          </span>
        </h1>
        {showDescripcion && descripcion ? (
          <p
            className={`${GeistMono.className} ${RETO_DESCRIPCION_CLASS_RETO_PAGE} ${RETO_DESCRIPCION_MAX_W} text-white/90`}
          >
            {descripcion}
          </p>
        ) : null}
      </div>
    </>
  );
}
