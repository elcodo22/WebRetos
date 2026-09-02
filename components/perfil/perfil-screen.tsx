"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { PerfilData } from "@/lib/mocks/perfil";
import {
  PerfilCarousel,
  type PerfilFocusMeta,
} from "@/components/perfil/perfil-carousel";
import { formatRetoNumero } from "@/lib/format-reto-numero";
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
  const [lifting, setLifting] = useState(false);
  const [focus, setFocus] = useState<PerfilFocusMeta>(null);
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

  const chromeHidden = lifting
    ? "pointer-events-none opacity-0"
    : "opacity-100";

  const bottomLeftLabel = focus?.guardados
    ? "GUARDADOS"
    : focus?.retoTitulo && focus?.obraTitulo
      ? `${focus.retoTitulo} - ${focus.obraTitulo}`
      : focus?.retoTitulo ?? "";
  const bottomRightLabel =
    focus?.guardados || !focus?.retoNumero
      ? ""
      : `#${formatRetoNumero(focus.retoNumero)}`;

  return (
    <div className="relative flex h-full min-h-0 flex-col text-white select-none [-webkit-touch-callout:none] [-webkit-user-select:none]">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
        <div className="flex w-full min-h-0 flex-1 flex-col items-center justify-center">
          {showCarousel ? (
            <div className="flex w-full min-h-0 flex-1 -translate-y-[clamp(0.75rem,2.5vh,1.5rem)] items-center justify-center max-md:max-h-[min(calc(min(64vw,56vh)*0.5625),68vh)]">
              <PerfilCarousel
                obras={perfil.obras}
                cajas={isOwnProfile ? cajas : EMPTY_CAJAS}
                user={user}
                onFocusChange={setFocus}
                onLiftChange={setLifting}
              />
            </div>
          ) : null}

          {showEmptyMessage ? (
            <p className="pointer-events-none max-w-md px-[var(--grid-margin)] text-center text-[25px] font-normal tracking-wide text-white/[0.72]">
              todavía no hay guardados ni participaciones
            </p>
          ) : null}
        </div>
      </div>

      {showCarousel ? (
        <div
          className={`shrink-0 px-[var(--grid-margin)] pb-[max(1.75rem,var(--safe-bottom))] pt-2 transition-opacity duration-200 ${chromeHidden}`}
        >
          <div className="flex items-baseline justify-between gap-6">
            <p className="min-w-0 flex-1 truncate text-[clamp(12px,2.6vw,16px)] font-normal uppercase leading-none tracking-wide md:text-[clamp(13px,2.4vw,17px)]">
              {bottomLeftLabel}
            </p>
            <p className="shrink-0 text-right text-[clamp(22px,5vw,32px)] font-normal uppercase leading-none tracking-wide tabular-nums md:text-[clamp(24px,4.5vw,36px)]">
              {bottomRightLabel}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
