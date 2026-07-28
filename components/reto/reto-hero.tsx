"use client";

import Link from "next/link";
import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type RetoHeroProps = {
  numero: string;
  titulo: string;
  descripcion: string;
  participarHref: string;
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

export function RetoHero({
  numero,
  titulo,
  descripcion,
  participarHref,
}: RetoHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const col7EndRef = useRef<HTMLDivElement>(null);
  const [dots, setDots] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    const col7End = col7EndRef.current;
    if (!container || !text || !col7End) return;

    const update = () => {
      const last = getEndOfTextRect(text);
      if (!last) {
        setDots(null);
        return;
      }

      const col7Rect = col7End.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const height = Math.max(last.height, 20);

      setDots({
        left: last.right - containerRect.left,
        top: last.top - containerRect.top,
        // Puntos hasta el final de la columna 7
        width: Math.max(0, col7Rect.right - last.right),
        height,
      });
    };

    update();
    const raf = requestAnimationFrame(() => {
      update();
      requestAnimationFrame(update);
    });

    const observer = new ResizeObserver(() => requestAnimationFrame(update));
    observer.observe(container);
    observer.observe(col7End);
    if (document.fonts?.ready) {
      void document.fonts.ready.then(update);
    }
    window.addEventListener("resize", update);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [descripcion]);

  return (
    <section className="site-grid w-full items-start text-white">
      <p className="col-start-2 col-span-1 pt-1 text-[24px] font-normal leading-none tracking-wide">
        #{numero}
      </p>

      <h1 className="col-start-3 col-span-4 text-[32px] font-medium leading-tight tracking-wide">
        {titulo}
      </h1>

      {/*
        Subgrid cols 3–8:
        - descripción: span 4 → cols 3–6
        - marcador col 7 → fin de puntos
        - [PARTICIPAR]: col-start-6 del subgrid → inicio columna 8
      */}
      <div
        ref={containerRef}
        className="relative col-start-3 col-span-6 row-start-2 mt-6 grid grid-cols-subgrid"
      >
        <p className="col-span-4 text-[20px] font-normal leading-relaxed tracking-wide">
          <span ref={textRef}>{renderDescripcion(descripcion)}</span>
        </p>

        {/* Ancla invisible: ocupa la columna 7 para medir su borde derecho */}
        <div
          ref={col7EndRef}
          className="col-start-5 pointer-events-none self-stretch"
          aria-hidden
        />

        {dots && dots.width > 0 && (
          <span
            aria-hidden
            className="pointer-events-none absolute overflow-hidden whitespace-nowrap text-[20px] font-normal leading-none"
            style={{
              left: dots.left,
              top: dots.top,
              width: dots.width,
              height: dots.height,
              lineHeight: `${dots.height}px`,
            }}
          >
            {".".repeat(500)}
          </span>
        )}

        <Link
          href={participarHref}
          className="col-start-6 self-end pb-[0.15em] text-[24px] font-semibold leading-none"
        >
          [PARTICIPAR]
        </Link>
      </div>
    </section>
  );
}
