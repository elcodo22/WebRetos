"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PerfilObra } from "@/lib/mocks/perfil";
import { useVideoThumbnail } from "@/hooks/use-video-thumbnail";
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
  /** Sin sesión: abrir popup de login al soltar, sin animar ni guardar. */
  onAuthRequired?: () => void;
  requireAuth?: boolean;
  /** Eliminar de guardados (modo remove). */
  onRemove?: () => void;
  mode?: "save" | "remove";
};

function clientFromEvent(event: Event): { x: number; y: number } | null {
  if ("clientX" in event && typeof (event as PointerEvent).clientX === "number") {
    return { x: (event as PointerEvent).clientX, y: (event as PointerEvent).clientY };
  }
  const touchEvent = event as TouchEvent;
  const touch = touchEvent.touches?.[0] ?? touchEvent.changedTouches?.[0];
  if (!touch) return null;
  return { x: touch.clientX, y: touch.clientY };
}

/**
 * Miniatura agarrada + destino: caja (guardar) o X (eliminar).
 * Posición por transform (sin transition) para que el dedo no vaya a trompicones.
 */
export function PerfilLiftOverlay({
  lift,
  onCancel,
  onDropInFolder,
  onAuthRequired,
  requireAuth = false,
  onRemove,
  mode = "save",
}: PerfilLiftOverlayProps) {
  const targetRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const posRef = useRef({ x: lift.x, y: lift.y });
  const [overTarget, setOverTarget] = useState(false);
  const [absorb, setAbsorb] = useState<{ tx: number; ty: number } | null>(
    null,
  );
  const [mounted, setMounted] = useState(false);

  const absorbRef = useRef(false);
  const doneRef = useRef(false);
  const grabRef = useRef({ x: lift.grabX, y: lift.grabY });
  const onCancelRef = useRef(onCancel);
  const onDropRef = useRef(onDropInFolder);
  const onAuthRequiredRef = useRef(onAuthRequired);
  const requireAuthRef = useRef(requireAuth);
  const onRemoveRef = useRef(onRemove);
  const modeRef = useRef(mode);
  const overRef = useRef(false);

  const isRemove = mode === "remove";
  const thumbnailSrc = useVideoThumbnail(lift.obra.videoUrl, lift.obra.videoUid);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    posRef.current = { x: lift.x, y: lift.y };
    grabRef.current = { x: lift.grabX, y: lift.grabY };
  }, [lift.x, lift.y, lift.grabX, lift.grabY]);

  useEffect(() => {
    onCancelRef.current = onCancel;
    onDropRef.current = onDropInFolder;
    onAuthRequiredRef.current = onAuthRequired;
    requireAuthRef.current = requireAuth;
    onRemoveRef.current = onRemove;
    modeRef.current = mode;
  }, [onCancel, onDropInFolder, onAuthRequired, requireAuth, onRemove, mode]);

  const applyPos = (x: number, y: number) => {
    posRef.current = { x, y };
    const img = imgRef.current;
    if (!img || absorbRef.current) return;
    img.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  useLayoutEffect(() => {
    absorbRef.current = false;
    doneRef.current = false;
    overRef.current = false;
    window.getSelection()?.removeAllRanges();

    const hitTarget = (clientX: number, clientY: number) => {
      const el = targetRef.current;
      if (!el) return false;
      const r = el.getBoundingClientRect();
      const pad = 36;
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

    const onMove = (event: Event) => {
      if (absorbRef.current || doneRef.current) return;
      const pt = clientFromEvent(event);
      if (!pt) return;
      if (event.cancelable) event.preventDefault();
      const { x: gx, y: gy } = grabRef.current;
      applyPos(pt.x - gx, pt.y - gy);
      const over = hitTarget(pt.x, pt.y);
      if (over !== overRef.current) {
        overRef.current = over;
        setOverTarget(over);
      }
    };

    const onEnd = (event: Event) => {
      if (absorbRef.current || doneRef.current) return;
      const pt = clientFromEvent(event) ?? {
        x: posRef.current.x + grabRef.current.x,
        y: posRef.current.y + grabRef.current.y,
      };
      if (hitTarget(pt.x, pt.y)) {
        if (requireAuthRef.current && modeRef.current !== "remove") {
          doneRef.current = true;
          onAuthRequiredRef.current?.();
          return;
        }
        const r = targetRef.current?.getBoundingClientRect();
        const tx = (r?.left ?? pt.x) + (r?.width ?? 0) / 2 - 14;
        const ty = (r?.top ?? pt.y) + (r?.height ?? 0) / 2 - 14;
        absorbRef.current = true;
        setAbsorb({ tx, ty });
        setOverTarget(true);
        window.setTimeout(finishDrop, 280);
        return;
      }
      doneRef.current = true;
      onCancelRef.current();
    };

    const moveOpts: AddEventListenerOptions = { capture: true, passive: false };
    const endOpts: AddEventListenerOptions = { capture: true };

    window.addEventListener("pointermove", onMove, moveOpts);
    window.addEventListener("touchmove", onMove, moveOpts);
    window.addEventListener("pointerup", onEnd, endOpts);
    window.addEventListener("touchend", onEnd, endOpts);
    window.addEventListener("touchcancel", onEnd, endOpts);
    const blockMenu = (event: Event) => event.preventDefault();
    window.addEventListener("contextmenu", blockMenu, endOpts);

    return () => {
      window.removeEventListener("pointermove", onMove, moveOpts);
      window.removeEventListener("touchmove", onMove, moveOpts);
      window.removeEventListener("pointerup", onEnd, endOpts);
      window.removeEventListener("touchend", onEnd, endOpts);
      window.removeEventListener("touchcancel", onEnd, endOpts);
      window.removeEventListener("contextmenu", blockMenu, endOpts);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se ancla al gesto de esta obra
  }, [lift.obra.id]);

  if (!mounted) return null;

  const label = absorb
    ? isRemove
      ? "ELIMINADO"
      : "GUARDADO"
    : overTarget
      ? "SOLTAR"
      : "";

  const left = absorb ? absorb.tx : lift.x;
  const top = absorb ? absorb.ty : lift.y;

  return createPortal(
    <div
      className="pointer-events-auto fixed inset-0 z-[200] bg-black select-none touch-none [-webkit-touch-callout:none] [-webkit-user-select:none]"
      role="dialog"
      aria-modal
      aria-label={
        isRemove
          ? "Arrastra la miniatura a la X para eliminar"
          : "Arrastra la miniatura a la caja"
      }
      onContextMenu={(event) => event.preventDefault()}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={thumbnailSrc ?? undefined}
        alt=""
        draggable={false}
        className="pointer-events-none fixed object-cover shadow-[0_12px_40px_rgba(0,0,0,0.65)]"
        style={{
          left: 0,
          top: 0,
          width: absorb ? 28 : lift.w,
          height: absorb ? 28 : lift.h,
          opacity: absorb ? 0 : 1,
          transform: `translate3d(${left}px, ${top}px, 0)`,
          transition: absorb
            ? "transform 280ms ease-out, width 280ms ease-out, height 280ms ease-out, opacity 280ms ease-out"
            : "none",
          willChange: "transform",
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
        <span className="text-[18px] uppercase tracking-wide text-white">{label}</span>
      </div>
    </div>,
    document.body,
  );
}
