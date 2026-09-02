"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/** CRT ligero en equipos justos / ahorro de datos / reduced-motion. */
function shouldUsePerfCrt() {
  if (typeof window === "undefined") return false;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return true;
  }

  const nav = navigator as Navigator & { deviceMemory?: number };
  const lowMem = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4;
  const lowCpu =
    typeof nav.hardwareConcurrency === "number" &&
    nav.hardwareConcurrency <= 4;
  const saveData = Boolean(
    (
      navigator as Navigator & {
        connection?: { saveData?: boolean };
      }
    ).connection?.saveData,
  );

  return saveData || lowMem || lowCpu;
}

function applyThemeColor(hex: string) {
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", hex);
}

function applyStatusBarStyle(chrome: "blue" | "white" | "black") {
  let meta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "apple-mobile-web-app-status-bar-style");
    document.head.appendChild(meta);
  }
  meta.setAttribute(
    "content",
    chrome === "white" ? "default" : "black-translucent",
  );
}

export function setChromeTheme(chrome: "blue" | "white" | "black") {
  document.documentElement.dataset.chrome = chrome;
  applyThemeColor(
    chrome === "black" ? "#000000" : chrome === "white" ? "#ffffff" : "#006eff",
  );
  applyStatusBarStyle(chrome);
}

export const CRT_FILTERS_EVENT = "crt-filters";

/** Activa/desactiva scanlines, grano y demás filtros CRT (el marco sigue visible). */
export function setCrtFiltersActive(active: boolean) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(CRT_FILTERS_EVENT, { detail: { active } }),
  );
}

/** Contenido útil de la tele: overlays internos deben ir aquí para heredar marco y filtros. */
export function getCrtScreenElement(): HTMLElement | null {
  return document.querySelector(".crt-screen");
}

export function CrtShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const blackScreen =
    pathname.startsWith("/reto/") ||
    pathname.startsWith("/u/") ||
    pathname.startsWith("/ajustes") ||
    pathname.startsWith("/admin");
  const [perf, setPerf] = useState(false);
  const [filtersActive, setFiltersActive] = useState(isHome);

  useEffect(() => {
    setPerf(shouldUsePerfCrt());
  }, []);

  useEffect(() => {
    const onFilters = (event: Event) => {
      const active = (event as CustomEvent<{ active: boolean }>).detail.active;
      setFiltersActive(active);
    };
    window.addEventListener(CRT_FILTERS_EVENT, onFilters);
    return () => window.removeEventListener(CRT_FILTERS_EVENT, onFilters);
  }, []);

  useEffect(() => {
    if (!isHome) {
      setFiltersActive(false);
      return;
    }
    setFiltersActive(true);
  }, [isHome]);

  useEffect(() => {
    if (pathname === "/") return;
    setChromeTheme(blackScreen ? "black" : "blue");
  }, [blackScreen, pathname]);

  const shellClass = [
    "crt-shell",
    blackScreen ? "crt-shell--black" : "",
    perf ? "crt-shell--perf" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClass}>
      <div className="crt-glass">
        <div className="crt-screen">{children}</div>
        {filtersActive ? (
          <>
            <div className="crt-phosphor" aria-hidden />
            <div className="crt-scanlines" aria-hidden />
            <div className="crt-grain" aria-hidden />
            <div className="crt-sheen" aria-hidden />
            {!perf ? (
              <>
                <div className="crt-beam crt-beam--a" aria-hidden />
                <div className="crt-beam crt-beam--b" aria-hidden />
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
