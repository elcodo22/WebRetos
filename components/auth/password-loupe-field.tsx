"use client";

import { useCallback, useRef, useState } from "react";

/** Tamaño del cursor-ojo (px). */
const ICON = 88;
/** Centro del ojo (hotspot). */
const HOTSPOT_X = ICON / 2;
const HOTSPOT_Y = ICON / 2;
const MAG = 2.1;

/** Contorno del ojo en viewBox 32×32. */
const EYE_PATH =
  "M1 16C1 16 6 6 16 6s15 10 15 10-5 10-15 10S1 16 1 16Z";

/** Misma forma en coordenadas absolutas, escalada al tamaño del cursor. */
function eyeClipPath(size: number) {
  const p = (n: number) => (n * size) / 32;
  return `path('M ${p(1)} ${p(16)} C ${p(1)} ${p(16)} ${p(6)} ${p(6)} ${p(16)} ${p(6)} C ${p(26)} ${p(6)} ${p(31)} ${p(16)} ${p(31)} ${p(16)} C ${p(31)} ${p(16)} ${p(26)} ${p(26)} ${p(16)} ${p(26)} C ${p(6)} ${p(26)} ${p(1)} ${p(16)} ${p(1)} ${p(16)} Z')`;
}

type PasswordLoupeFieldProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  "aria-label"?: string;
};

export function PasswordLoupeField({
  value,
  onChange,
  className,
  placeholder = "contraseña",
  autoComplete = "current-password",
  required = true,
  "aria-label": ariaLabel = "contraseña",
}: PasswordLoupeFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [rel, setRel] = useState({ x: 0, y: 0, w: 0, h: 0 });

  const updatePos = useCallback((clientX: number, clientY: number) => {
    const input = inputRef.current;
    if (!input) return;

    const rect = input.getBoundingClientRect();
    setPos({ x: clientX, y: clientY });
    setRel({
      x: clientX - rect.left,
      y: clientY - rect.top,
      w: rect.width,
      h: rect.height,
    });
  }, []);

  // Ojo solo para “espiar”: hay texto, hover, y no estás escribiendo
  const showEye = hovering && !focused && value.length > 0;

  return (
    <div
      className={`relative w-full max-w-xl${showEye ? " cursor-loupe" : ""}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onMouseMove={(event) => updatePos(event.clientX, event.clientY)}
    >
      <input
        ref={inputRef}
        type="password"
        required={required}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className={className}
        style={showEye ? { cursor: "none" } : undefined}
        aria-label={ariaLabel}
      />

      {showEye && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[10000]"
          style={{
            left: pos.x - HOTSPOT_X,
            top: pos.y - HOTSPOT_Y,
            width: ICON,
            height: ICON,
          }}
        >
          {/* Contraseña visible en todo el agujero del ojo */}
          <div
            className="absolute inset-0 overflow-hidden bg-[var(--background)]"
            style={{ clipPath: eyeClipPath(ICON) }}
          >
            <div
              className="absolute flex items-center justify-center whitespace-nowrap font-normal tracking-wide text-white"
              style={{
                left: HOTSPOT_X - rel.x * MAG,
                top: HOTSPOT_Y - rel.y * MAG,
                width: Math.max(rel.w, 1) * MAG,
                height: Math.max(rel.h, 1) * MAG,
                fontSize: 24 * MAG,
                lineHeight: 1,
              }}
            >
              {value}
            </div>
          </div>

          <svg
            className="absolute inset-0 h-full w-full text-white"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ shapeRendering: "crispEdges" }}
          >
            <path
              d={EYE_PATH}
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinejoin="miter"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
