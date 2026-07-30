"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/** Solo fuerza CRT ligero si el dispositivo lo pide de verdad. */
function shouldUsePerfCrt() {
  if (typeof window === "undefined") return false;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return true;
  }

  const nav = navigator as Navigator & { deviceMemory?: number };
  const lowMem = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 2;
  const lowCpu =
    typeof nav.hardwareConcurrency === "number" &&
    nav.hardwareConcurrency <= 2;
  const saveData = Boolean(
    (
      navigator as Navigator & {
        connection?: { saveData?: boolean };
      }
    ).connection?.saveData,
  );

  return saveData || (lowMem && lowCpu);
}

export function CrtShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const blackScreen = pathname.startsWith("/reto/");
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
      <div className="crt-scanlines" aria-hidden />
      <div className="crt-vignette" aria-hidden />
      {!perf ? (
        <div className="crt-beams" aria-hidden>
          <div className="crt-beam crt-beam--mid" />
          <div className="crt-beam crt-beam--thin" />
          <div className="crt-beam crt-beam--thin crt-beam--thin-b" />
          <div className="crt-beam crt-beam--wide" />
          <div className="crt-beam crt-beam--hair" />
        </div>
      ) : null}
    </div>
  );
}
