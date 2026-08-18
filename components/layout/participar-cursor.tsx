"use client";

/** Botón fijo (móvil): mismo estilo de texto, sin fondo. */
export const PARTICIPAR_BTN_CLASS =
  "inline-flex items-center justify-center whitespace-nowrap text-center text-[clamp(24px,5vw,34px)] font-normal normal-case leading-none tracking-normal text-white [word-spacing:0.06em]";

function isParticiparHover(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  if (!target.closest("[data-participar-zone]")) return false;
  if (target.closest("header")) return false;
  if (target.closest(".diccionario-word")) return false;
  if (target.closest("[data-codigo-field]")) return false;
  if (target.closest("a, button, input, [role='menu']")) return false;
  return true;
}

export function isParticiparClickTarget(target: EventTarget | null) {
  return isParticiparHover(target);
}
