"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { PerfilData } from "@/lib/mocks/perfil";
import { formatRetoNumero } from "@/lib/format-reto-numero";
import { formatUsername, perfilHref } from "@/lib/mocks/perfil";
import {
  PerfilCarousel,
  type PerfilFocusMeta,
} from "@/components/perfil/perfil-carousel";
import { useCrtPower } from "@/components/layout/crt-power-transition";
import { readSavedCajasForUi, type SavedCaja } from "@/lib/perfil-caja";

const EMPTY_CAJAS: SavedCaja[] = [];

function RetoFocusLabel({
  focus,
  onOpen,
}: {
  focus: PerfilFocusMeta;
  onOpen: (id: string) => void;
}) {
  if (!focus) return null;
  const className =
    "max-w-full truncate text-[clamp(14px,3.2vw,18px)] font-normal uppercase leading-none tracking-wide transition-opacity hover:opacity-80";
  if (focus.guardados) {
    return <p className={className}>GUARDADOS</p>;
  }
  if (!focus.retoTitulo || !focus.retoNumero) return null;
  const label = `${focus.retoTitulo} #${formatRetoNumero(focus.retoNumero)}`;
  if (focus.retoId) {
    return (
      <button
        type="button"
        onClick={() => onOpen(focus.retoId!)}
        className={className}
      >
        {label}
      </button>
    );
  }
  return (
    <p className={className}>
      {label}
    </p>
  );
}

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
      if (prev?.guardados && next?.guardados) return prev;
      if (
        prev &&
        next &&
        !prev.guardados &&
        !next.guardados &&
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

  const chromeHidden = lifting
    ? "pointer-events-none opacity-0"
    : "opacity-100";

  const profileIdentity = (
    <>
      <div className="flex min-w-0 items-center gap-2.5">
        <p className="truncate text-[clamp(18px,4vw,24px)] font-normal uppercase leading-none tracking-wide md:text-[clamp(20px,3.8vw,28px)]">
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
      <p className="mt-1 truncate text-[clamp(13px,3.2vw,16px)] font-normal leading-snug tracking-wide text-white/90 md:mt-1.5 md:leading-none">
        {perfil.nombreCompleto}
      </p>
    </>
  );

  return (
    <div className="relative flex h-full min-h-0 flex-col text-white select-none [-webkit-touch-callout:none] [-webkit-user-select:none]">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center max-md:pt-[max(0.5rem,var(--safe-top))]">
        <div className="flex w-full flex-col items-center justify-center max-md:shrink-0 md:min-h-0 md:flex-1">
          {showCarousel ? (
            <div className="flex w-full min-h-0 items-center justify-center max-md:h-[min(calc(min(48vw,42vh)*1.5),58vh)] md:flex-1">
              <PerfilCarousel
                obras={perfil.obras}
                cajas={isOwnProfile ? cajas : EMPTY_CAJAS}
                user={user}
                onFocusChange={onFocusChange}
                onLiftChange={setLifting}
              />
            </div>
          ) : null}

          {showEmptyMessage ? (
            <p className="pointer-events-none max-w-md px-[var(--grid-margin)] text-center text-[25px] font-normal tracking-wide text-white/[0.72]">
              todavía no hay guardados ni participaciones
            </p>
          ) : null}

          {focus && !lifting ? (
            <div
              className={`mt-4 shrink-0 px-[var(--grid-margin)] text-center transition-opacity duration-200 md:hidden ${chromeHidden}`}
            >
              <RetoFocusLabel
                focus={focus}
                onOpen={(id) => powerOffTo(`/reto/${id}`)}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div
        className={`shrink-0 px-[var(--grid-margin)] pb-[max(1rem,var(--safe-bottom))] pt-2 transition-opacity duration-200 md:hidden ${chromeHidden}`}
      >
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0 flex-1">{profileIdentity}</div>
          <p className="shrink-0 pb-0.5 text-right text-[clamp(12px,2.8vw,15px)] font-normal uppercase leading-snug tracking-wide">
            {perfil.participaciones} participaciones
          </p>
        </div>
      </div>

      {/* Desktop: barra inferior (usuario | título | participaciones) */}
      <div
        className={`max-md:hidden shrink-0 transition-opacity duration-200 ${
          lifting ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <div className="site-grid items-center gap-y-3 pb-[max(1rem,var(--safe-bottom))] pt-1">
          <div className="col-span-3 min-w-0">{profileIdentity}</div>

          <div className="col-span-4 min-w-0 px-2 text-center">
            <RetoFocusLabel
              focus={focus}
              onOpen={(id) => powerOffTo(`/reto/${id}`)}
            />
          </div>

          <div className="col-span-3 text-right">
            <p className="text-[clamp(13px,3vw,16px)] font-normal uppercase leading-none tracking-wide">
              {perfil.participaciones} participaciones
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
