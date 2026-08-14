"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function AuthRequiredPopup({
  open,
  onClose,
  message = "Para guardar un vídeo tienes que iniciar sesión o registrarte.",
}: {
  open: boolean;
  onClose: () => void;
  message?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-white/10 backdrop-blur-[40px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-required-title"
        className="relative z-10 flex w-[min(92vw,22rem)] flex-col items-center gap-6 border border-black bg-white px-6 py-7 text-center text-black"
        onClick={(event) => event.stopPropagation()}
      >
        <p
          id="auth-required-title"
          className="text-[16px] font-normal leading-snug tracking-wide"
        >
          {message}
        </p>
        <div className="flex items-center gap-6 text-[20px] font-normal leading-none tracking-wide">
          <Link href="/login" className="text-black hover:opacity-70">
            [Login]
          </Link>
          <Link href="/registro" className="text-black hover:opacity-70">
            [Registro]
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
