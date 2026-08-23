"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import type { PerfilObra } from "@/lib/mocks/perfil";
import { perfilHref } from "@/lib/mocks/perfil";
import { FolderIcon } from "@/components/archivos/folder-icon";
import { useCrtPower } from "@/components/layout/crt-power-transition";
import { SiteMobileChrome } from "@/components/layout/site-mobile-chrome";
import {
  PerfilLiftOverlay,
  type LiftState,
} from "@/components/perfil/perfil-lift-overlay";
import { RetoVideoPlayer } from "@/components/reto/reto-video-player";
import {
  readSavedCajasForUi,
  removeObraFromCaja,
  type SavedCaja,
  type SavedObra,
} from "@/lib/perfil-caja";

const LIFT_DRAG_PX = 8;
/** Tiempo sobre la carpeta antes de agrandar / atenuar el resto. */
const FOLDER_HOVER_DELAY_MS = 420;

function retoKey(numero: string, titulo: string) {
  return `${numero.trim()}::${titulo.trim()}`.toLowerCase();
}

function toPerfilObra(obra: SavedObra): PerfilObra {
  return {
    id: obra.id,
    username: obra.username,
    titulo: obra.titulo,
    descripcion: obra.descripcion,
    imageUrl: obra.imageUrl,
    videoUrl: obra.videoUrl,
    retoNumero: obra.retoNumero,
    retoTitulo: obra.retoTitulo,
    retoId: obra.retoId,
  };
}

export function PerfilCajaOverlay({
  cajas,
  user = null,
  onClose,
}: {
  /** Carpetas = un reto con vídeos guardados. */
  cajas: SavedCaja[];
  user?: User | null;
  onClose: () => void;
}) {
  const { powerOffTo } = useCrtPower();
  const [openFolder, setOpenFolder] = useState<SavedCaja | null>(null);
  const [active, setActive] = useState<SavedObra | null>(null);
  const [lift, setLift] = useState<LiftState | null>(null);
  const [hoveredFolderKey, setHoveredFolderKey] = useState<string | null>(null);
  const folderHoverTimerRef = useRef<number | null>(null);

  const clearFolderHoverTimer = useCallback(() => {
    if (folderHoverTimerRef.current != null) {
      window.clearTimeout(folderHoverTimerRef.current);
      folderHoverTimerRef.current = null;
    }
  }, []);

  const onFolderPointerEnter = useCallback(
    (key: string) => {
      clearFolderHoverTimer();
      folderHoverTimerRef.current = window.setTimeout(() => {
        setHoveredFolderKey(key);
        folderHoverTimerRef.current = null;
      }, FOLDER_HOVER_DELAY_MS);
    },
    [clearFolderHoverTimer],
  );

  const onFolderPointerLeave = useCallback(() => {
    clearFolderHoverTimer();
    setHoveredFolderKey(null);
  }, [clearFolderHoverTimer]);

  useEffect(() => {
    return () => clearFolderHoverTimer();
  }, [clearFolderHoverTimer]);

  const pressRef = useRef<{
    obra: SavedObra;
    el: HTMLElement;
    originX: number;
    originY: number;
    lifted: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);

  function goBackToFolders() {
    setActive(null);
    setOpenFolder(null);
  }

  const syncOpenFolder = useCallback(() => {
    setOpenFolder((current) => {
      if (!current) return null;
      const key = retoKey(current.retoNumero, current.retoTitulo);
      const next = readSavedCajasForUi().find(
        (caja) => retoKey(caja.retoNumero, caja.retoTitulo) === key,
      );
      return next ?? null;
    });
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (lift) {
        setLift(null);
        return;
      }
      if (active) {
        setActive(null);
        return;
      }
      if (openFolder) {
        setOpenFolder(null);
        return;
      }
      onClose();
    }
    function onGoHome() {
      setLift(null);
      setActive(null);
      setOpenFolder(null);
      onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("perfil-go-home", onGoHome);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("perfil-go-home", onGoHome);
    };
  }, [active, lift, openFolder, onClose]);

  const beginLift = useCallback(
    (obra: SavedObra, el: HTMLElement, clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      suppressClickRef.current = true;
      setActive(null);
      setLift({
        obra: toPerfilObra(obra),
        x: rect.left,
        y: rect.top,
        w: rect.width,
        h: rect.height,
        grabX: clientX - rect.left,
        grabY: clientY - rect.top,
      });
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 120);
    },
    [],
  );

  const folderObras = openFolder?.obras ?? [];

  const onLiftCancel = useCallback(() => setLift(null), []);

  const onRemoveDrop = useCallback(() => {
    const id = lift?.obra.id;
    setLift(null);
    if (id) removeObraFromCaja(id);
    window.setTimeout(() => syncOpenFolder(), 0);
  }, [lift, syncOpenFolder]);

  const breadcrumb = openFolder ? (
    <p className="truncate px-4 text-center text-[clamp(18px,3.8vw,25px)] font-normal leading-snug tracking-wide md:px-24">
      <button
        type="button"
        onClick={goBackToFolders}
        className="text-white/40 transition-colors hover:text-white/60"
      >
        Guardados
      </button>
      <span className="mx-2 text-white/40">/</span>
      {(() => {
        const retoId =
          openFolder.retoId ||
          openFolder.obras.find((o) => o.retoId)?.retoId;
        const label = `#${openFolder.retoNumero} ${openFolder.retoTitulo}`;
        if (!retoId) {
          return <span>{label}</span>;
        }
        return (
          <button
            type="button"
            onClick={() => powerOffTo(`/reto/${retoId}`)}
            className="transition-opacity hover:opacity-80"
          >
            {label}
          </button>
        );
      })()}
    </p>
  ) : null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black text-white"
      role="dialog"
      aria-modal
      aria-label="Guardados"
    >
      <SiteMobileChrome
        user={user}
        desktopOverlay
        menuTone="black"
        zIndex={110}
      >
      {openFolder ? (
        <>
          {/* Lienzo a pantalla completa: las portadas pasan bajo header y pie */}
          <div className="absolute inset-0 overflow-y-auto scrollbar-none">
            <ul className="m-0 box-border grid w-full list-none grid-cols-2 gap-x-4 gap-y-10 p-0 px-4 pb-28 pt-[max(1.25rem,var(--safe-top))] sm:grid-cols-3 sm:gap-x-6 md:grid-cols-5 md:gap-x-8 md:gap-y-14 md:px-6 md:pt-[100px]">
              {folderObras.map((obra) => (
                <li key={obra.id} className="relative min-w-0">
                  <button
                    type="button"
                    onPointerDown={(event) => {
                      if (event.button !== 0) return;
                      pressRef.current = {
                        obra,
                        el: event.currentTarget,
                        originX: event.clientX,
                        originY: event.clientY,
                        lifted: false,
                      };
                      try {
                        event.currentTarget.setPointerCapture(event.pointerId);
                      } catch {
                        /* ignore */
                      }
                    }}
                    onPointerMove={(event) => {
                      const press = pressRef.current;
                      if (!press || press.lifted || press.obra.id !== obra.id)
                        return;
                      const dist = Math.hypot(
                        event.clientX - press.originX,
                        event.clientY - press.originY,
                      );
                      if (dist < LIFT_DRAG_PX) return;
                      press.lifted = true;
                      try {
                        if (
                          event.currentTarget.hasPointerCapture(event.pointerId)
                        ) {
                          event.currentTarget.releasePointerCapture(
                            event.pointerId,
                          );
                        }
                      } catch {
                        /* ignore */
                      }
                      beginLift(
                        press.obra,
                        press.el,
                        event.clientX,
                        event.clientY,
                      );
                    }}
                    onPointerUp={(event) => {
                      const press = pressRef.current;
                      const wasLifted =
                        press?.lifted && press.obra.id === obra.id;
                      if (press?.obra.id === obra.id) pressRef.current = null;
                      try {
                        if (
                          event.currentTarget.hasPointerCapture(event.pointerId)
                        ) {
                          event.currentTarget.releasePointerCapture(
                            event.pointerId,
                          );
                        }
                      } catch {
                        /* ignore */
                      }
                      if (wasLifted) {
                        event.preventDefault();
                        event.stopPropagation();
                      }
                    }}
                    onPointerCancel={() => {
                      if (pressRef.current?.obra.id === obra.id) {
                        pressRef.current = null;
                      }
                    }}
                    onClick={() => {
                      if (suppressClickRef.current) return;
                      setActive(obra);
                    }}
                    className="group relative z-0 block w-full cursor-pointer overflow-visible text-left hover:z-10"
                    aria-label={`Ver ${obra.titulo} de ${obra.username}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={obra.imageUrl}
                      alt=""
                      className="pointer-events-none aspect-[2/3] w-full origin-bottom rounded-none object-cover transition-transform duration-200 ease-out group-hover:scale-[1.07] select-none"
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                  </button>
                  <Link
                    href={perfilHref(obra.username)}
                    className="relative z-20 mt-2 block truncate text-[18px] font-normal leading-none tracking-wide text-white select-none hover:underline"
                    draggable={false}
                  >
                    {obra.username}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-50 bg-transparent px-[18px] pb-8 pt-10">
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black via-black/55 to-transparent"
              aria-hidden
            />
            <div className="pointer-events-auto relative bg-transparent drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
              {breadcrumb}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="absolute inset-0 overflow-y-auto scrollbar-none">
            {cajas.length === 0 ? (
              <div className="flex min-h-full items-center justify-center px-[18px] pt-[max(1.25rem,var(--safe-top))] pb-28">
                <p className="text-center text-[22px] tracking-wide text-white/[0.72]">
                  Arrastra un póster a la carpeta para guardar vídeos.
                </p>
              </div>
            ) : (
              <ul className="grid w-full grid-cols-2 justify-items-center gap-x-4 gap-y-10 overflow-visible px-[14px] pb-28 pt-[max(1.25rem,var(--safe-top))] sm:grid-cols-3 sm:gap-x-6 md:grid-cols-5 md:gap-x-6 md:px-[18px] md:pt-[100px]">
                {cajas.map((caja) => {
                  const key = retoKey(caja.retoNumero, caja.retoTitulo);
                  const label = `#${caja.retoNumero} ${caja.retoTitulo}`;
                  const wrapsTitle = label.length > 24;
                  const count = caja.obras.length;
                  const countLabel =
                    count === 1 ? "1 elemento" : `${count} elementos`;
                  const focused = hoveredFolderKey === key;
                  const dimmed =
                    hoveredFolderKey !== null && hoveredFolderKey !== key;
                  return (
                    <li
                      key={`${caja.retoNumero}-${caja.retoTitulo}`}
                      className={`relative z-0 flex w-full justify-center overflow-visible transition-opacity duration-500 ease-out ${
                        dimmed ? "opacity-35" : "opacity-100"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFolder(caja)}
                        onPointerEnter={() => onFolderPointerEnter(key)}
                        onPointerLeave={onFolderPointerLeave}
                        className={`relative flex w-full max-w-[208px] flex-col items-start overflow-visible text-left text-white transition-transform duration-500 ease-out ${
                          focused ? "z-30 scale-[1.07]" : "scale-100"
                        }`}
                        aria-label={`Carpeta reto #${caja.retoNumero} ${caja.retoTitulo}`}
                      >
                        <FolderIcon scale={1.05} className="shrink-0" />
                        <div className="mt-1.5 w-full min-w-0 text-left">
                          <p
                            className={`text-[20px] font-normal leading-snug tracking-wide text-white ${
                              focused && wrapsTitle
                                ? "whitespace-normal break-words"
                                : "truncate whitespace-nowrap"
                            }`}
                          >
                            {label}
                          </p>
                          <p className="mt-0.5 truncate text-[18px] font-normal leading-none tracking-wide text-white/55">
                            {countLabel}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-50 bg-transparent px-[18px] pb-8 pt-10">
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black via-black/55 to-transparent"
              aria-hidden
            />
            <div className="relative text-center text-[25px] font-normal leading-snug tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
              <p>Guardados</p>
            </div>
            <p className="pointer-events-none absolute bottom-8 right-[18px] text-[20px] font-normal tracking-wide text-white/70 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
              {cajas.length === 1 ? "1 carpeta" : `${cajas.length} carpetas`}
            </p>
          </div>
        </>
      )}

      </SiteMobileChrome>

      {lift ? (
        <PerfilLiftOverlay
          lift={lift}
          mode="remove"
          onCancel={onLiftCancel}
          onRemove={onRemoveDrop}
        />
      ) : null}

      {active && !lift ? (
        <RetoVideoPlayer
          item={active as PerfilObra}
          retoNumero={active.retoNumero}
          retoTitulo={active.retoTitulo}
          onClose={() => setActive(null)}
        />
      ) : null}
    </div>
  );
}
