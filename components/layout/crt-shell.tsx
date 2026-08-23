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

export function CrtShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const blackScreen =
    pathname.startsWith("/reto/") || pathname.startsWith("/u/");
  const [perf, setPerf] = useState(false);

  useEffect(() => {
    setPerf(shouldUsePerfCrt());
  }, []);

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
      <div className="crt-screen">{children}</div>
      {/* Estático: sin animación = casi gratis */}
      <div className="crt-scanlines" aria-hidden />
      {/* Solo 2 barridos con transform (GPU), no background-position */}
      {!perf ? (
        <>
          <div className="crt-beam crt-beam--a" aria-hidden />
          <div className="crt-beam crt-beam--b" aria-hidden />
        </>
      ) : null}
    </div>
  );
}
