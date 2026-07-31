"use client";

import { useCallback, useState } from "react";
import type { PerfilData, PerfilObra } from "@/lib/mocks/perfil";
import { formatUsername, perfilHref } from "@/lib/mocks/perfil";
import { PerfilCarousel } from "@/components/perfil/perfil-carousel";

export function PerfilScreen({ perfil }: { perfil: PerfilData }) {
  const [focus, setFocus] = useState<PerfilObra | null>(
    perfil.obras[0] ?? null,
  );
  const [copied, setCopied] = useState(false);

  const onFocusChange = useCallback((obra: PerfilObra) => {
    setFocus(obra);
  }, []);

  const copyProfileUrl = useCallback(async () => {
    const path = perfilHref(perfil.username);
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${path}`
        : path;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  }, [perfil.username]);

  return (
    <div className="flex h-full min-h-0 flex-col text-white">
      <div className="flex min-h-0 flex-1 flex-col">
        <PerfilCarousel obras={perfil.obras} onFocusChange={onFocusChange} />
      </div>

      <div className="site-grid shrink-0 items-center pb-8 pt-3">
        <div className="col-span-3 min-w-0">
          <div className="flex min-w-0 items-center gap-2.5">
            <p className="truncate text-[28px] font-normal leading-none tracking-wide">
              {formatUsername(perfil.username)}
            </p>
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={copyProfileUrl}
                className="flex items-center justify-center transition-opacity hover:opacity-80"
                aria-label="Copiar enlace del perfil"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/copy.png"
                  alt=""
                  width={20}
                  height={20}
                  className="h-5 w-5 brightness-0 invert"
                  draggable={false}
                />
              </button>
              {copied ? (
                <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1.5 -translate-x-1/2 whitespace-nowrap bg-black px-2 py-1 text-[12px] font-normal leading-none tracking-wide text-white">
                  copiado
                </span>
              ) : null}
            </div>
          </div>
          <p className="mt-2 truncate text-[16px] font-normal leading-none tracking-wide text-white/90">
            {perfil.nombreCompleto}
          </p>
        </div>

        <div className="col-span-4 min-w-0 px-2 text-center">
          {focus ? (
            <p className="truncate text-[20px] font-normal leading-snug tracking-wide">
              #{focus.retoNumero} {focus.retoTitulo}
            </p>
          ) : null}
        </div>

        <div className="col-span-3 text-right">
          <p className="text-[16px] font-normal leading-none tracking-wide">
            {perfil.participaciones} participaciones
          </p>
        </div>
      </div>
    </div>
  );
}
