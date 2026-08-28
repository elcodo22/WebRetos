"use client";

import { ClickableText } from "@/components/diccionario/clickable-text";
import { formatRetoNumero } from "@/lib/format-reto-numero";

type RetoTitleNavProps = {
  numero: string;
  titulo: string;
};

export function RetoTitleNav({ numero, titulo }: RetoTitleNavProps) {
  return (
    <h1 className="flex min-w-0 max-w-[min(100%,42rem)] flex-wrap items-center justify-center gap-x-3 gap-y-1 px-2 text-center">
      <span className="reto-page-heading-text min-w-0 max-w-[11rem] truncate">
        <ClickableText text={titulo} />
      </span>
      <span className="reto-page-heading-text shrink-0 whitespace-nowrap tabular-nums">
        #{formatRetoNumero(numero)}
      </span>
    </h1>
  );
}
