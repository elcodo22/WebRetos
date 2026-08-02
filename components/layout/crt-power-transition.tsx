"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";

const STORAGE_KEY = "crt-power-on";
const POWER_OFF_MS = 700;
const POWER_ON_MS = 380;

type Ctx = {
  /** Apaga la pantalla CRT y navega a `href` al terminar. */
  powerOffTo: (href: string) => void;
};

const CrtPowerContext = createContext<Ctx | null>(null);

export function useCrtPower(): Ctx {
  const ctx = useContext(CrtPowerContext);
  if (!ctx) {
    throw new Error("useCrtPower must be used within a CrtPowerProvider");
  }
  return ctx;
}

type Phase = "idle" | "off" | "black" | "on";

/**
 * Transición tipo televisor CRT: apagado → negro → navegación → encendido.
 */
export function CrtPowerProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const pendingHref = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const awaitingOnRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const powerOffTo = useCallback(
    (href: string) => {
      if (phase === "off" || phase === "black") return;

      const reduceMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reduceMotion) {
        router.push(href);
        return;
      }

      clearTimer();
      pendingHref.current = href;
      awaitingOnRef.current = true;
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
      setPhase("off");
    },
    [phase, clearTimer, router],
  );

  useEffect(() => {
    if (phase !== "off") return;
    timerRef.current = setTimeout(() => {
      setPhase("black");
      const href = pendingHref.current;
      pendingHref.current = null;
      if (href) router.push(href);
    }, POWER_OFF_MS);
    return clearTimer;
  }, [phase, router, clearTimer]);

  useEffect(() => {
    let fromStorage = false;
    try {
      fromStorage = sessionStorage.getItem(STORAGE_KEY) === "1";
      if (fromStorage) sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      fromStorage = false;
    }

    if (fromStorage || awaitingOnRef.current || phase === "black") {
      awaitingOnRef.current = false;
      setPhase("on");
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== "on") return;
    timerRef.current = setTimeout(() => setPhase("idle"), POWER_ON_MS);
    return clearTimer;
  }, [phase, clearTimer]);

  const sceneClass =
    phase === "idle"
      ? "crt-power-scene"
      : `crt-power-scene crt-power-scene--${phase}`;

  return (
    <CrtPowerContext.Provider value={{ powerOffTo }}>
      <div className={sceneClass}>
        <div
          className={
            phase === "off"
              ? "crt-power-frame crt-power-frame--off"
              : phase === "on"
                ? "crt-power-frame crt-power-frame--on"
                : phase === "black"
                  ? "crt-power-frame crt-power-frame--black"
                  : "crt-power-frame"
          }
        >
          {children}
        </div>
      </div>
    </CrtPowerContext.Provider>
  );
}
