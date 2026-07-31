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

export function CrtShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const blackScreen =
    pathname.startsWith("/reto/") || pathname.startsWith("/u/");
  const [perf, setPerf] = useState(false);

  useEffect(() => {
    setPerf(shouldUsePerfCrt());
  }, []);

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
