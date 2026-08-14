"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { ClickableText } from "@/components/diccionario/clickable-text";

type RetoHeroProps = {
  numero: string;
  titulo: string;
  descripcion: string;
  participarHref: string;
};

const BTN_LABEL = "[PARTICIPAR]";

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

function getEndOfTextRect(element: HTMLElement): DOMRect | null {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let lastText: Text | null = null;

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (node.textContent && node.textContent.length > 0) {
      lastText = node;
    }
  }

  if (!lastText || !lastText.textContent) return null;

  const range = document.createRange();
  const length = lastText.textContent.length;
  range.setStart(lastText, Math.max(0, length - 1));
  range.setEnd(lastText, length);
  const rects = range.getClientRects();
  return rects[rects.length - 1] ?? range.getBoundingClientRect();
}

type DotsBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function RetoHero({
  numero,
  titulo,
  descripcion,
  participarHref,
}: RetoHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const col7EndRef = useRef<HTMLDivElement>(null);
  const [dotsBox, setDotsBox] = useState<DotsBox | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    const col7End = col7EndRef.current;
    if (!container || !measure || !col7End) return;

    const update = () => {
      const last = getEndOfTextRect(measure);
      if (!last) {
        setDotsBox(null);
        return;
      }
      const col7Rect = col7End.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const height = Math.max(last.height, 20);
      const left = last.right - containerRect.left;
      const width = Math.max(0, col7Rect.right - last.right);
      setDotsBox({
        left,
        top: last.top - containerRect.top,
        width,
        height,
      });
    };

    update();
    const raf = requestAnimationFrame(update);
    const observer = new ResizeObserver(() => requestAnimationFrame(update));
    observer.observe(container);
    observer.observe(col7End);
    if (measure.parentElement) observer.observe(measure.parentElement);
    if (document.fonts?.ready) void document.fonts.ready.then(update);
    window.addEventListener("resize", update);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [descripcion]);

  return (
    <section className="site-grid w-full items-start text-white max-md:!flex max-md:flex-col max-md:gap-3">
      <p className="col-start-2 col-span-1 pt-1 text-[clamp(18px,4.5vw,24px)] font-normal leading-none tracking-wide max-md:col-auto max-md:w-full max-md:pt-0">
        #{numero}
      </p>

      <h1 className="col-start-3 col-span-4 min-h-[1.2em] text-[clamp(22px,5.5vw,32px)] font-medium leading-tight tracking-wide max-md:col-auto max-md:w-full">
        <ClickableText text={titulo} enabled />
      </h1>

      <div
        ref={containerRef}
        className="relative col-start-3 col-span-6 row-start-2 mt-6 grid grid-cols-subgrid max-md:col-auto max-md:mt-4 max-md:!flex max-md:w-full max-md:flex-col max-md:items-stretch max-md:gap-6 max-md:grid-cols-none"
      >
        <p className="relative col-span-4 min-h-[3em] w-full text-[clamp(16px,4vw,20px)] font-normal leading-relaxed tracking-wide max-md:col-auto max-md:min-h-0">
          <span
            ref={measureRef}
            className="pointer-events-none invisible absolute left-0 top-0 w-full"
            aria-hidden
          >
            {renderDescripcion(descripcion)}
          </span>
          <span>{renderDescripcion(descripcion)}</span>
        </p>

        <div
          ref={col7EndRef}
          className="col-start-5 pointer-events-none self-stretch max-md:hidden"
          aria-hidden
        />

        {dotsBox && dotsBox.width > 0 ? (
          <span
            aria-hidden
            className="pointer-events-none absolute overflow-hidden whitespace-nowrap text-[20px] font-normal leading-none tracking-wide max-md:hidden"
            style={{
              left: dotsBox.left,
              top: dotsBox.top,
              width: dotsBox.width,
              height: dotsBox.height,
              lineHeight: `${dotsBox.height}px`,
            }}
          >
            {".".repeat(500)}
          </span>
        ) : null}

        <Link
          href={participarHref}
          className="participar-bulb col-start-6 self-end pb-[0.15em] text-[clamp(18px,4.5vw,24px)] font-semibold leading-none max-md:col-auto max-md:self-center max-md:pb-0 max-md:text-center"
        >
          {BTN_LABEL}
        </Link>
      </div>
    </section>
  );
}
