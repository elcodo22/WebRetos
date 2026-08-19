"use client";

import { useEffect, useRef, useState } from "react";
import { RetoTimeBar } from "@/components/reto/reto-time-bar";

type RetoTimeCursorProps = {
  fechaFin?: string | null;
  active: boolean;
};

/** Contador que sigue al cursor en desktop cuando la descripcion esta abierta. */
export function RetoTimeCursor({ fechaFin, active }: RetoTimeCursorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }

    const isFinePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches;
    if (!isFinePointer) return;

    const onMove = (event: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      el.style.transform = `translate3d(${event.clientX + 18}px, ${event.clientY + 18}px, 0)`;
      setVisible(true);
    };

    const onLeave = () => setVisible(false);

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, [active]);

  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none fixed left-0 top-0 z-[9999] hidden select-none transition-opacity duration-150 md:block ${
        visible && active ? "opacity-100" : "opacity-0"
      }`}
    >
      <RetoTimeBar fechaFin={fechaFin} active={active} />
    </div>
  );
}
