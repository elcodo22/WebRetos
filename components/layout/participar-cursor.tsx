"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const LABEL = "[PARTICIPAR]";

function isParticiparHover(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  if (!target.closest("[data-participar-zone]")) return false;
  if (target.closest("header")) return false;
  if (target.closest(".diccionario-word")) return false;
  if (target.closest("a, button, input, [role='menu']")) return false;
  return true;
}

export function isParticiparClickTarget(target: EventTarget | null) {
  return isParticiparHover(target);
}

/**
 * El cursor del home (panel reto) es el botón [PARTICIPAR].
 * En Archivos, cabecera y palabras del diccionario no se muestra.
 */
export function ParticiparCursor({ active }: { active: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!active) {
      setShown(false);
      return;
    }

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!fine.matches) return;

    function onMove(event: PointerEvent) {
      setPos({ x: event.clientX, y: event.clientY });
      setShown(isParticiparHover(event.target));
    }

    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [active]);

  if (!mounted || !active || !shown) return null;

  return createPortal(
    <div
      aria-hidden
      className="participar-bulb pointer-events-none fixed z-[80] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[clamp(18px,4.5vw,24px)] font-semibold leading-none tracking-wide text-white"
      style={{ left: pos.x, top: pos.y }}
    >
      {LABEL}
    </div>,
    document.body,
  );
}
