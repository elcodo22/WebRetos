"use client";

import { ClickableText } from "@/components/diccionario/clickable-text";
import { formatRetoNumero } from "@/lib/format-reto-numero";

type RetoTitleNavProps = {
  numero: string;
  titulo: string;
};

export function RetoTitleNav({ numero, titulo }: RetoTitleNavProps) {
  return (
    <h1 className="flex min-w-0 max-w-[min(100%,42rem)] flex-wrap items-baseline justify-center gap-x-2.5 gap-y-1 px-2 text-center text-[clamp(15px,2.8vw,20px)] font-normal uppercase leading-tight tracking-wide md:gap-x-3 md:leading-none">
      <span className="min-w-0">
        <ClickableText text={titulo} />
      </span>
      <span className="shrink-0 tabular-nums">#{formatRetoNumero(numero)}</span>
    </h1>
  );
}
