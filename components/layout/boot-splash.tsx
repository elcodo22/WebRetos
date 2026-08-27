"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const STORAGE_KEY = "unjam-boot-done";
const POWER_MS = 520;
const LOGO_HOLD_MS = 1400;
const REVEAL_MS = 480;
const LOAD_MS = POWER_MS + LOGO_HOLD_MS;

type Phase = "pending" | "power" | "logo" | "reveal" | "done";

/**
 * Encendido tipo televisor al cargar: azul → logo UJ + % → web normal.
 * Solo una vez por sesión de pestaña.
 */
export function BootSplash({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("pending");
  const [percent, setPercent] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let already = false;
    try {
      already = sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      already = false;
    }

    if (already || reduceMotion) {
      setPhase("done");
      return;
    }

    setPhase("power");
    const begun = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - begun) / LOAD_MS);
      // Ease out suave para el número.
      const eased = 1 - (1 - t) ** 2;
      setPercent(Math.round(eased * 100));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
        setPercent(100);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    const t1 = window.setTimeout(() => setPhase("logo"), POWER_MS);
    const t2 = window.setTimeout(() => setPhase("reveal"), LOAD_MS);
    const t3 = window.setTimeout(() => {
      setPhase("done");
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
    }, LOAD_MS + REVEAL_MS);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, []);

  const showSplash = phase !== "done";
  const contentVisible = phase === "reveal" || phase === "done";
  const showLoadUi = phase === "power" || phase === "logo";

  return (
    <div className="relative h-full w-full">
      <div
        className={`h-full w-full ${
          contentVisible ? "opacity-100" : "opacity-0"
        } ${phase === "reveal" ? "boot-content-reveal" : ""}`}
        aria-hidden={showSplash && phase !== "reveal"}
      >
        {children}
      </div>

      {showSplash ? (
        <div
          className={`boot-splash ${
            phase === "pending" ? "boot-splash--pending" : `boot-splash--${phase}`
          }`}
          role="status"
          aria-live="polite"
          aria-label={`Cargando ${percent}%`}
        >
          <div className="boot-splash-beam" aria-hidden />
          <div className="boot-splash-screen">
            <div
              className={`boot-splash-center ${showLoadUi ? "opacity-100" : "opacity-0"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/logo-uj.png"
                alt=""
                className="boot-splash-logo"
                width={128}
                height={75}
                draggable={false}
              />
            </div>
            <p
              className={`boot-splash-percent tabular-nums ${
                showLoadUi ? "" : "opacity-0"
              }`}
            >
              {percent}%
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
