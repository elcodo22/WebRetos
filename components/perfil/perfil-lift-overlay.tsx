"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PerfilObra } from "@/lib/mocks/perfil";
import { CartonBoxIcon } from "@/components/perfil/carton-box-icon";
import { PixelXIcon } from "@/components/perfil/pixel-x-icon";

export type LiftState = {
  obra: PerfilObra;
  x: number;
  y: number;
  w: number;
  h: number;
  grabX: number;
  grabY: number;
};

type PerfilLiftOverlayProps = {
  lift: LiftState;
  onCancel: () => void;
  /** Guardar en caja (modo save). */
  onDropInFolder?: () => void;
  /** Eliminar de guardados (modo remove). */
  onRemove?: () => void;
  mode?: "save" | "remove";
};

/**
 * Miniatura agarrada + destino: caja (guardar) o X (eliminar).
 */
export function PerfilLiftOverlay({
  lift,
  onCancel,
  onDropInFolder,
  onRemove,
  mode = "save",
}: PerfilLiftOverlayProps) {
  const targetRef = useRef<HTMLDivElement>(null);
  const [overTarget, setOverTarget] = useState(false);
  const [pos, setPos] = useState({ x: lift.x, y: lift.y });
  const [absorb, setAbsorb] = useState<{ tx: number; ty: number } | null>(
    null,
  );
  const [mounted, setMounted] = useState(false);

  const absorbRef = useRef(false);
  const doneRef = useRef(false);
  const armedRef = useRef(false);
  const grabRef = useRef({ x: lift.grabX, y: lift.grabY });
  const onCancelRef = useRef(onCancel);
  const onDropRef = useRef(onDropInFolder);
  const onRemoveRef = useRef(onRemove);
  const modeRef = useRef(mode);

  const isRemove = mode === "remove";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setPos({ x: lift.x, y: lift.y });
    grabRef.current = { x: lift.grabX, y: lift.grabY };
  }, [lift.x, lift.y, lift.grabX, lift.grabY]);

  useEffect(() => {
    onCancelRef.current = onCancel;
    onDropRef.current = onDropInFolder;
    onRemoveRef.current = onRemove;
    modeRef.current = mode;
  }, [onCancel, onDropInFolder, onRemove, mode]);

  useEffect(() => {
    absorbRef.current = false;
    doneRef.current = false;
    armedRef.current = false;

    const armTimer = window.setTimeout(() => {
      armedRef.current = true;
    }, 80);

    let finishTimer: ReturnType<typeof setTimeout> | null = null;

    const hitTarget = (clientX: number, clientY: number) => {
      const el = targetRef.current;
      if (!el) return false;
      const r = el.getBoundingClientRect();
      const pad = 28;
      return (
        clientX >= r.left - pad &&
        clientX <= r.right + pad &&
        clientY >= r.top - pad &&
        clientY <= r.bottom + pad
      );
    };

    const finishDrop = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      if (modeRef.current === "remove") onRemoveRef.current?.();
      else onDropRef.current?.();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (absorbRef.current) return;
      const { x: gx, y: gy } = grabRef.current;
      setPos({ x: event.clientX - gx, y: event.clientY - gy });
      setOverTarget(hitTarget(event.clientX, event.clientY));
    };

    const onPointerUp = (event: PointerEvent) => {
      if (absorbRef.current || doneRef.current) return;
      if (!armedRef.current) {
        // Soltar demasiado pronto: cancelar en vez de quedarse pillado.
        doneRef.current = true;
        onCancelRef.current();
        return;
      }
      if (hitTarget(event.clientX, event.clientY)) {
        const r = targetRef.current?.getBoundingClientRect();
        const tx = (r?.left ?? event.clientX) + (r?.width ?? 0) / 2 - 14;
        const ty = (r?.top ?? event.clientY) + (r?.height ?? 0) / 2 - 14;
        absorbRef.current = true;
        setAbsorb({ tx, ty });
        setOverTarget(true);
        finishTimer = window.setTimeout(finishDrop, 320);
        return;
      }
      doneRef.current = true;
      onCancelRef.current();
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.clearTimeout(armTimer);
      if (finishTimer != null) window.clearTimeout(finishTimer);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [lift.obra.id]);

  const left = absorb ? absorb.tx : pos.x;
  const top = absorb ? absorb.ty : pos.y;

  if (!mounted) return null;

  const label = absorb
    ? isRemove
      ? "eliminado"
      : "guardado"
    : overTarget
      ? "soltar"
      : "";

  return createPortal(
    <div
      className="pointer-events-auto fixed inset-0 z-[200] bg-black select-none"
      role="dialog"
      aria-modal
      aria-label={
        isRemove
          ? "Arrastra la miniatura a la X para eliminar"
          : "Arrastra la miniatura a la caja"
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={lift.obra.imageUrl}
        alt=""
        draggable={false}
        className="pointer-events-none fixed object-cover shadow-[0_12px_40px_rgba(0,0,0,0.65)] transition-[left,top,width,height,opacity] duration-300 ease-out"
        style={{
          left,
          top,
          width: absorb ? 28 : lift.w,
          height: absorb ? 28 : lift.h,
          opacity: absorb ? 0 : 1,
          zIndex: 2,
        }}
      />

      <div
        ref={targetRef}
        className={`fixed bottom-8 left-1/2 z-[3] flex -translate-x-1/2 flex-col items-center gap-3 text-white transition-transform duration-200 ${
          overTarget || absorb ? "scale-110" : "scale-100"
        }`}
      >
        {isRemove ? (
          <PixelXIcon
            size={64}
            className={overTarget || absorb ? "text-white" : "text-white/85"}
          />
        ) : (
          <CartonBoxIcon scale={0.85} className="brightness-0 invert" />
        )}
        <span className="text-[14px] tracking-wide text-white">{label}</span>
      </div>
    </div>,
    document.body,
  );
}
