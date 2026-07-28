"use client";

import { useCallback, useRef, useState } from "react";

/** Asset 48×48 (pixel art chunky). Escala entera ×2. */
const BASE = 48;
const SCALE = 2;
const ICON = BASE * SCALE;
/** Centro del hueco de la lupa en el asset 48×48 */
const HOTSPOT_X = 19.5 * SCALE;
const HOTSPOT_Y = 19.5 * SCALE;
/** Radio interior del aro (para no tapar el pixel ring) */
const LENS_R = 10.5 * SCALE;
const MAG = 2.1;

type PasswordLoupeFieldProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function PasswordLoupeField({
  value,
  onChange,
  className,
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

  // Lupa solo para “espiar”: hay texto, hover, y no estás escribiendo
  const showLoupe = hovering && !focused && value.length > 0;

  return (
    <div
      className={`relative w-full max-w-xl${showLoupe ? " cursor-loupe" : ""}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onMouseMove={(event) => updatePos(event.clientX, event.clientY)}
    >
      <input
        ref={inputRef}
        type="password"
        required
        autoComplete="current-password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="contraseña"
        className={className}
        style={showLoupe ? { cursor: "none" } : undefined}
        aria-label="contraseña"
      />

      {showLoupe && (
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
          <div
            className="absolute overflow-hidden bg-[var(--background)]"
            style={{
              left: HOTSPOT_X - LENS_R,
              top: HOTSPOT_Y - LENS_R,
              width: LENS_R * 2,
              height: LENS_R * 2,
              borderRadius: "50%",
            }}
          >
            <div
              className="absolute flex items-center justify-center whitespace-nowrap font-normal tracking-wide text-white"
              style={{
                left: LENS_R - rel.x * MAG,
                top: LENS_R - rel.y * MAG,
                width: Math.max(rel.w, 1) * MAG,
                height: Math.max(rel.h, 1) * MAG,
                fontSize: 24 * MAG,
                lineHeight: 1,
              }}
            >
              {value}
            </div>
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/lupa.png"
            alt=""
            width={ICON}
            height={ICON}
            className="absolute inset-0 h-full w-full"
            style={{ imageRendering: "pixelated" }}
            draggable={false}
          />
        </div>
      )}
    </div>
  );
}
