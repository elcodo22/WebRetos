"use client";

import { usePathname } from "next/navigation";

export function CrtShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const blackScreen = pathname.startsWith("/reto/");

  return (
    <div className={blackScreen ? "crt-shell crt-shell--black" : "crt-shell"}>
      <div className="crt-screen">{children}</div>
      <div className="crt-scanlines" aria-hidden>
        <div className="crt-scanlines-move" />
      </div>
      <div className="crt-beam" aria-hidden />
      <div className="crt-glitch-band" aria-hidden />
      <div className="crt-glitch-band crt-glitch-band--delayed" aria-hidden />
      <div className="crt-grain" aria-hidden />
    </div>
  );
}
