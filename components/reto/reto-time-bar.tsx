"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

const FILL_MS = 1100;
const BORDER = 2;
const PAD = 2;
const TICK_W = 8;
const TICK_GAP = 2;
const INNER_H = 10;
const OUTER_H = INNER_H + PAD * 2 + BORDER * 2;

function remainingRatio(fechaInicio: string, fechaFin: string) {
  const start = new Date(fechaInicio).getTime();
  const end = new Date(fechaFin).getTime();
  const now = Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 1;
  }
  if (now >= end) return 0;
  if (now <= start) return 1;
  return (end - now) / (end - start);
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

type RetoTimeBarProps = {
  fechaInicio?: string | null;
  fechaFin?: string | null;
  active?: boolean;
};

/**
 * Barra DOS: marco fino y bloques verticales con hueco de 2px.
 */
export function RetoTimeBar({
  fechaInicio,
  fechaFin,
  active = true,
}: RetoTimeBarProps) {
  const start = fechaInicio ?? fechaFin ?? null;
  const end = fechaFin ?? null;
  const innerRef = useRef<HTMLDivElement>(null);
  const [tickCount, setTickCount] = useState(28);
  const [targetPct, setTargetPct] = useState(100);
  const [displayPct, setDisplayPct] = useState(0);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef(targetPct);
  targetRef.current = targetPct;

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;

    const measure = () => {
      const w = el.clientWidth;
      const n = Math.max(1, Math.floor((w + TICK_GAP) / (TICK_W + TICK_GAP)));
      setTickCount(n);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!start || !end) {
      setTargetPct(100);
      return;
    }
    const tick = () => {
      setTargetPct(Math.round(remainingRatio(start, end) * 100));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [start, end]);

  useEffect(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (!active) {
      setDisplayPct(0);
      return;
    }

    const from = 0;
    const to = Math.min(100, Math.max(0, targetRef.current));
    const begun = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - begun) / FILL_MS);
      const value = from + (to - from) * easeOutCubic(t);
      setDisplayPct(Math.round(value));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
        setDisplayPct(to);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [active]);

  const filledTicks = Math.round((displayPct / 100) * tickCount);
  const svgW = tickCount * TICK_W + Math.max(0, tickCount - 1) * TICK_GAP;

  return (
    <div className="mx-auto mt-7 flex w-full max-w-[26rem] items-center gap-3 px-2 [word-spacing:normal]">
      <div
        className="box-border min-w-0 flex-1 bg-transparent"
        style={{
          height: OUTER_H,
          border: `${BORDER}px solid #fff`,
          padding: PAD,
        }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={displayPct}
        aria-label="Tiempo restante del reto"
      >
        <div
          ref={innerRef}
          className="h-full w-full overflow-hidden"
          style={{ height: INNER_H }}
        >
          <svg
            width={svgW}
            height={INNER_H}
            viewBox={`0 0 ${svgW} ${INNER_H}`}
            style={{ display: "block", shapeRendering: "crispEdges" }}
            aria-hidden
          >
            {Array.from({ length: tickCount }, (_, i) =>
              i < filledTicks ? (
                <rect
                  key={i}
                  x={i * (TICK_W + TICK_GAP)}
                  y={0}
                  width={TICK_W}
                  height={INNER_H}
                  fill="#ffffff"
                />
              ) : null,
            )}
          </svg>
        </div>
      </div>
      <p className="shrink-0 text-[clamp(16px,3vw,20px)] font-normal leading-none tracking-wide text-white tabular-nums">
        {displayPct}%
      </p>
    </div>
  );
}
