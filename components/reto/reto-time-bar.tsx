"use client";

import { useEffect, useRef, useState } from "react";

const FILL_MS = 1100;

type Tiempo = {
  dias: number;
  horas: number;
  minutos: number;
  segundos: number;
};

const ZERO: Tiempo = { dias: 0, horas: 0, minutos: 0, segundos: 0 };

function splitSeconds(totalSegundos: number): Tiempo {
  const safe = Math.max(0, Math.floor(totalSegundos));
  return {
    dias: Math.floor(safe / 86400),
    horas: Math.floor((safe % 86400) / 3600),
    minutos: Math.floor((safe % 3600) / 60),
    segundos: safe % 60,
  };
}

function remainingSeconds(fechaFin: string) {
  const ms = new Date(fechaFin).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.floor(ms / 1000);
}

function pad(valor: number) {
  return valor.toString().padStart(2, "0");
}

/** Una sola unidad: días, o horas, o minutos, o segundos. */
function primaryUnit(t: Tiempo): {
  value: number;
  suffix: string;
  singular: string;
  plural: string;
} {
  if (t.dias >= 1) {
    return { value: t.dias, suffix: "d", singular: "DÍA", plural: "DÍAS" };
  }
  if (t.horas >= 1) {
    return {
      value: t.horas,
      suffix: "h",
      singular: "HORA",
      plural: "HORAS",
    };
  }
  if (t.minutos >= 1) {
    return {
      value: t.minutos,
      suffix: "m",
      singular: "MINUTO",
      plural: "MINUTOS",
    };
  }
  return {
    value: t.segundos,
    suffix: "s",
    singular: "SEGUNDO",
    plural: "SEGUNDOS",
  };
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

type RetoTimeBarProps = {
  fechaFin?: string | null;
  active?: boolean;
  size?: "default" | "hero" | "xl";
  align?: "center" | "start" | "end";
  /** compact = "05d" · phrase = "4 DÍAS 12 HORAS 12 MINUTOS 23 SEGUNDOS" */
  format?: "compact" | "phrase";
};

function labelFor(value: number, singular: string, plural: string) {
  return value === 1 ? singular : plural;
}

/** Contador restante. */
export function RetoTimeBar({
  fechaFin,
  active = true,
  size = "default",
  align = "center",
  format = "compact",
}: RetoTimeBarProps) {
  const [targetSec, setTargetSec] = useState(0);
  const [display, setDisplay] = useState<Tiempo>(ZERO);
  const rafRef = useRef<number | null>(null);
  const targetSecRef = useRef(0);
  targetSecRef.current = targetSec;

  useEffect(() => {
    if (!fechaFin) {
      setTargetSec(0);
      return;
    }
    const tick = () => setTargetSec(remainingSeconds(fechaFin));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [fechaFin]);

  useEffect(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (!active) {
      setDisplay(ZERO);
      return;
    }

    const to = Math.max(0, targetSecRef.current);

    // Frase hero: sin conteo mágico; el slide lo hace la capa.
    if (format === "phrase") {
      setDisplay(splitSeconds(to));
      return;
    }

    const from = 0;
    const begun = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - begun) / FILL_MS);
      const value = from + (to - from) * easeOutCubic(t);
      setDisplay(splitSeconds(value));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
        setDisplay(splitSeconds(to));
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [active, format]);

  useEffect(() => {
    if (!active || rafRef.current != null) return;
    setDisplay(splitSeconds(targetSec));
  }, [targetSec, active]);

  const textClass =
    size === "xl"
      ? "text-[clamp(40px,9vw,72px)] font-normal leading-none tracking-wide"
      : size === "hero"
        ? "text-[clamp(16px,3vw,22px)] font-normal leading-none tracking-wide"
        : "text-[clamp(20px,4.6vw,28px)] font-normal leading-none tracking-wide md:text-[clamp(16px,3vw,20px)]";

  const unit = primaryUnit(display);
  const compactLabel =
    unit.suffix === "d" ? String(unit.value) : pad(unit.value);

  const phraseParts = [
    { key: "d", text: `${display.dias} ${labelFor(display.dias, "DÍA", "DÍAS")}` },
    { key: "h", text: `${display.horas} ${labelFor(display.horas, "HORA", "HORAS")}` },
    { key: "m", text: `${display.minutos} ${labelFor(display.minutos, "MINUTO", "MINUTOS")}` },
    { key: "s", text: `${display.segundos} ${labelFor(display.segundos, "SEGUNDO", "SEGUNDOS")}` },
  ];

  return (
    <p
      className={`flex flex-wrap items-baseline gap-x-[0.45em] gap-y-1 text-white tabular-nums [word-spacing:normal] ${
        align === "start"
          ? "justify-start text-left"
          : align === "end"
            ? "justify-end text-right"
            : "justify-center text-center"
      } ${textClass}`}
    >
      {format === "phrase" ? (
        phraseParts.map((part) => (
          <span key={part.key} className="whitespace-nowrap">
            {part.text}
          </span>
        ))
      ) : (
        <span>
          {compactLabel}
          <span className="text-[0.72em]">{unit.suffix}</span>
        </span>
      )}
    </p>
  );
}
