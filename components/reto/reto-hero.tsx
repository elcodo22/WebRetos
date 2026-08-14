"use client";

import { ClickableText } from "@/components/diccionario/clickable-text";

type RetoHeroProps = {
  numero: string;
  titulo: string;
  descripcion: string;
};

function renderDescripcion(texto: string) {
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

export function RetoHero({ numero, titulo, descripcion }: RetoHeroProps) {
  return (
    <section className="site-grid w-full items-start text-white max-md:!flex max-md:flex-col max-md:gap-3">
      <p className="col-start-2 col-span-1 pt-1 text-[clamp(18px,4.5vw,24px)] font-normal leading-none tracking-wide max-md:col-auto max-md:w-full max-md:pt-0">
        #{numero}
      </p>

      <h1 className="col-start-3 col-span-4 min-h-[1.2em] text-[clamp(22px,5.5vw,32px)] font-medium leading-tight tracking-wide max-md:col-auto max-md:w-full">
        <ClickableText text={titulo} enabled />
      </h1>

      <p className="col-start-3 col-span-4 row-start-2 mt-6 text-[clamp(16px,4vw,20px)] font-normal leading-relaxed tracking-wide max-md:col-auto max-md:mt-4 max-md:w-full">
        {renderDescripcion(descripcion)}
      </p>
    </section>
  );
}
