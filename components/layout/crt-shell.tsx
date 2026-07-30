"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

function shouldUsePerfCrt() {
  if (typeof window === "undefined") return false;

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  if (reducedMotion) return true;

  const nav = navigator as Navigator & { deviceMemory?: number };
  const lowMem = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4;
  const lowCpu =
    typeof nav.hardwareConcurrency === "number" &&
    nav.hardwareConcurrency <= 4;
  const saveData =
    "connection" in navigator &&
    Boolean(
      (navigator as Navigator & { connection?: { saveData?: boolean } })
        .connection?.saveData,
    );

  return lowMem || lowCpu || saveData;
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
      <div className="crt-scanlines" aria-hidden>
        <div className="crt-scanlines-move" />
      </div>
      {!perf ? (
        <>
          <div className="crt-beam" aria-hidden />
          <div className="crt-grain" aria-hidden />
        </>
      ) : null}
    </div>
  );
}
