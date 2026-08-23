"use client";

import { useEffect, useId, useRef, useState } from "react";
import { authFieldSize } from "@/components/auth/auth-field";
import { PixelarticonsEye } from "@/components/icons/PixelarticonsEye";
import { PixelarticonsEyeClosed } from "@/components/icons/PixelarticonsEyeClosed";

const ICON_SIZE = 28;

type PasswordLoupeFieldProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  shake?: boolean;
  "aria-label"?: string;
};

type FieldEyeState = {
  form: HTMLElement | null;
  hasPassword: boolean;
  visible: boolean;
};

const eyeRegistry = new Map<string, FieldEyeState>();

function syncRegistry(
  fieldId: string,
  form: HTMLElement | null,
  hasPassword: boolean,
  visible: boolean,
) {
  eyeRegistry.set(fieldId, { form, hasPassword, visible });
}

function formHasPassword(form: HTMLElement) {
  return [...eyeRegistry.values()].some(
    (entry) => entry.form === form && entry.hasPassword,
  );
}

function formPasswordVisible(form: HTMLElement) {
  return [...eyeRegistry.values()].some(
    (entry) => entry.form === form && entry.hasPassword && entry.visible,
  );
}

function isCursorHost(fieldId: string, form: HTMLElement | null) {
  if (!form) return false;
  for (const [id, entry] of eyeRegistry) {
    if (entry.form === form && entry.hasPassword) return id === fieldId;
  }
  return false;
}

function isFinePointer() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/** Zonas con cursor nativo (texto / pointer), no el ojo. */
function isNativeCursorTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "button, a, input, textarea, select, label, [role='button'], [data-password-field]",
    ),
  );
}

export function PasswordLoupeField({
  value,
  onChange,
  className,
  placeholder = "Contraseña",
  autoComplete = "current-password",
  required = true,
  shake = false,
  "aria-label": ariaLabel = "contraseña",
}: PasswordLoupeFieldProps) {
  const fieldId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [showCursor, setShowCursor] = useState(false);
  const [eyeClosed, setEyeClosed] = useState(false);
  const [host, setHost] = useState(false);
  const hasPassword = value.length > 0;

  useEffect(() => {
    const form = rootRef.current?.closest("form") ?? null;
    syncRegistry(fieldId, form, hasPassword, visible);
    setHost(isCursorHost(fieldId, form));
    if (form) setEyeClosed(formPasswordVisible(form));

    return () => {
      eyeRegistry.delete(fieldId);
    };
  }, [fieldId, hasPassword, visible]);

  useEffect(() => {
    function updateCursor(clientX: number, clientY: number, target: EventTarget | null) {
      const form = rootRef.current?.closest("form");
      if (!form || !isFinePointer() || !formHasPassword(form)) {
        setShowCursor(false);
        document.documentElement.classList.remove("cursor-eye-active");
        return;
      }

      const overNative = isNativeCursorTarget(target);

      setCursor({ x: clientX, y: clientY });
      setEyeClosed(formPasswordVisible(form));
      setHost(isCursorHost(fieldId, form));
      setShowCursor(!overNative);
      document.documentElement.classList.toggle(
        "cursor-eye-active",
        !overNative,
      );
    }

    function onMove(event: PointerEvent) {
      updateCursor(event.clientX, event.clientY, event.target);
    }

    function onPointerDown(event: PointerEvent) {
      if (!isFinePointer()) return;

      const form = rootRef.current?.closest("form");
      if (!form || !formHasPassword(form)) return;

      updateCursor(event.clientX, event.clientY, event.target);

      if (!hasPassword) return;
      // Solo toggle al clicar fuera de campos/botones (zona del cursor-ojo).
      if (isNativeCursorTarget(event.target)) return;

      setVisible((prev) => !prev);
    }

    function onWindowLeave() {
      setShowCursor(false);
      document.documentElement.classList.remove("cursor-eye-active");
    }

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerdown", onPointerDown);
    document.documentElement.addEventListener("mouseleave", onWindowLeave);

    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerdown", onPointerDown);
      document.documentElement.removeEventListener("mouseleave", onWindowLeave);
      document.documentElement.classList.remove("cursor-eye-active");
    };
  }, [fieldId, hasPassword]);

  return (
    <>
      <div
        ref={rootRef}
        data-password-field=""
        className={`relative inline-flex max-w-[min(100%,36rem)]${
          shake ? " field-shake" : ""
        }`}
      >
        <input
          type={visible ? "text" : "password"}
          required={required}
          autoComplete={autoComplete}
          value={value}
          size={authFieldSize(value, placeholder)}
          onChange={(event) => {
            onChange(event.target.value);
            if (event.target.value.length === 0) setVisible(false);
          }}
          placeholder={placeholder}
          className={className}
          aria-label={ariaLabel}
        />
      </div>

      {host && showCursor && cursor ? (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[10000] text-white"
          style={{
            left: cursor.x,
            top: cursor.y,
            width: ICON_SIZE,
            height: ICON_SIZE,
            transform: "translate(-50%, -50%)",
          }}
        >
          {eyeClosed ? (
            <PixelarticonsEyeClosed
              width={ICON_SIZE}
              height={ICON_SIZE}
              style={{ display: "block" }}
            />
          ) : (
            <PixelarticonsEye
              width={ICON_SIZE}
              height={ICON_SIZE}
              style={{ display: "block" }}
            />
          )}
        </div>
      ) : null}
    </>
  );
}
