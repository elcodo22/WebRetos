"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { PerfilData } from "@/lib/mocks/perfil";
import { formatUsername, perfilHref } from "@/lib/mocks/perfil";
import {
  PerfilCarousel,
  type PerfilFocusMeta,
} from "@/components/perfil/perfil-carousel";
import { useCrtPower } from "@/components/layout/crt-power-transition";
import { readSavedCajasForUi, type SavedCaja } from "@/lib/perfil-caja";

const EMPTY_CAJAS: SavedCaja[] = [];

export function PerfilScreen({
  perfil,
  isOwnProfile = false,
  user = null,
}: {
  perfil: PerfilData;
  isOwnProfile?: boolean;
  user?: User | null;
}) {
  const { powerOffTo } = useCrtPower();
  const [focus, setFocus] = useState<PerfilFocusMeta>(() => {
    const last = perfil.obras[perfil.obras.length - 1];
    return last
      ? {
          retoNumero: last.retoNumero,
          retoTitulo: last.retoTitulo,
          retoId: last.retoId,
        }
      : null;
  });
  const [copied, setCopied] = useState(false);
  const [lifting, setLifting] = useState(false);
  const [cajas, setCajas] = useState<SavedCaja[]>([]);

  const hasParticipaciones =
    perfil.participaciones > 0 || perfil.obras.length > 0;

  const refreshCajas = useCallback(() => {
    if (!isOwnProfile) {
      setCajas((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    setCajas(readSavedCajasForUi());
  }, [isOwnProfile]);

  useEffect(() => {
    refreshCajas();
    if (!isOwnProfile) return;
    function onUpdate() {
      refreshCajas();
    }
    window.addEventListener("perfil-caja-updated", onUpdate);
    window.addEventListener("focus", onUpdate);
    return () => {
      window.removeEventListener("perfil-caja-updated", onUpdate);
      window.removeEventListener("focus", onUpdate);
    };
  }, [isOwnProfile, refreshCajas]);

  useEffect(() => {
    if (!lifting) refreshCajas();
  }, [lifting, refreshCajas]);

  const hasGuardados = cajas.length > 0;
  const showCarousel = hasParticipaciones || (isOwnProfile && hasGuardados);
  const showEmptyMessage = !hasParticipaciones && !hasGuardados;

  const onFocusChange = useCallback((next: PerfilFocusMeta) => {
    setFocus((prev) => {
      if (prev == null && next == null) return prev;
      if (
        prev &&
        next &&
        prev.retoNumero === next.retoNumero &&
        prev.retoTitulo === next.retoTitulo
      ) {
        return prev;
      }
      return next;
    });
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
    <div className="relative flex h-full min-h-0 flex-col text-white">
      <div className="relative flex min-h-0 flex-1 flex-col">
        {showCarousel ? (
          <PerfilCarousel
            obras={perfil.obras}
            cajas={isOwnProfile ? cajas : EMPTY_CAJAS}
            user={user}
            onFocusChange={onFocusChange}
            onLiftChange={setLifting}
          />
        ) : null}

        {showEmptyMessage ? (
          <p className="pointer-events-none absolute left-1/2 top-1/2 z-10 max-w-md -translate-x-1/2 -translate-y-1/2 text-center text-[25px] font-normal tracking-wide text-white/[0.72]">
            todavía no hay guardados ni participaciones
          </p>
        ) : null}
      </div>

      <div
        className={`site-grid shrink-0 items-center gap-y-3 pb-6 pt-3 transition-opacity duration-200 max-md:flex max-md:flex-col max-md:px-[var(--grid-margin)] md:pb-8 ${
          lifting ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <div className="col-span-3 min-w-0 max-md:order-2 max-md:mt-4 max-md:w-full max-md:text-center">
          <div className="flex min-w-0 items-center gap-2.5 max-md:justify-center">
            <p className="truncate text-[clamp(25px,5vw,35px)] font-normal leading-none tracking-wide">
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
                <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1.5 -translate-x-1/2 whitespace-nowrap bg-black px-2 py-1 text-[15px] font-normal leading-none tracking-wide text-white">
                  copiado
                </span>
              ) : null}
            </div>
          </div>
          <p className="mt-2 hidden truncate text-[clamp(18px,3.5vw,20px)] font-normal leading-none tracking-wide text-white/90 md:block">
            {perfil.nombreCompleto}
          </p>
        </div>

        <div className="col-span-4 min-w-0 px-2 text-center max-md:order-1 max-md:w-full max-md:px-0">
          {focus ? (
            focus.retoId ? (
              <button
                type="button"
                onClick={() => powerOffTo(`/reto/${focus.retoId}`)}
                className="max-w-full truncate text-[clamp(18px,3.8vw,25px)] font-normal leading-snug tracking-wide transition-opacity hover:opacity-80"
              >
                #{focus.retoNumero} {focus.retoTitulo}
              </button>
            ) : (
              <p className="truncate text-[clamp(18px,3.8vw,25px)] font-normal leading-snug tracking-wide">
                #{focus.retoNumero} {focus.retoTitulo}
              </p>
            )
          ) : null}
        </div>

        <div className="col-span-3 hidden text-right md:block">
          <p className="text-[clamp(18px,3.5vw,20px)] font-normal leading-none tracking-wide">
            {perfil.participaciones} participaciones
          </p>
        </div>

        <div className="order-3 mt-5 flex w-full items-end justify-between gap-3 md:hidden">
          <p className="min-w-0 truncate text-left text-[clamp(16px,3.5vw,20px)] font-normal leading-none tracking-wide text-white/90">
            {perfil.nombreCompleto}
          </p>
          <p className="shrink-0 text-right text-[clamp(16px,3.5vw,20px)] font-normal leading-none tracking-wide">
            {perfil.participaciones} participaciones
          </p>
        </div>
      </div>
    </div>
  );
}
