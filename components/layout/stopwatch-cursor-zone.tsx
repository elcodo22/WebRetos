"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

const HOTSPOT_X = 16;
const HOTSPOT_Y = 19;
const FRAME_COUNT = 8;
const DURATIONS_MS = [133, 266, 266, 133, 133, 133, 133, 133];

function frameSrc(frame: number) {
  return `/cursors/stopwatch/frame_${String(frame).padStart(2, "0")}.png`;
}

function cursorUrl(frame: number) {
  return `url("${frameSrc(frame)}") ${HOTSPOT_X} ${HOTSPOT_Y}, auto`;
}

export function StopwatchCursorZone({ children }: { children: ReactNode }) {
  const zoneRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    for (let i = 0; i < FRAME_COUNT; i += 1) {
      const img = new Image();
      img.src = frameSrc(i);
    }
  }, []);

  const clearAnim = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    const el = zoneRef.current;
    if (!el) return;

    el.style.cursor = cursorUrl(frameRef.current);
    const delay = DURATIONS_MS[frameRef.current] ?? 133;
    frameRef.current = (frameRef.current + 1) % FRAME_COUNT;
    timerRef.current = setTimeout(tick, delay);
  }, []);

  const onEnter = useCallback(() => {
    clearAnim();
    frameRef.current = 0;
    tick();
  }, [clearAnim, tick]);

  const onLeave = useCallback(() => {
    clearAnim();
    if (zoneRef.current) {
      zoneRef.current.style.cursor = "";
    }
  }, [clearAnim]);

  useEffect(() => () => clearAnim(), [clearAnim]);

  return (
    <div
      ref={zoneRef}
      className="cursor-stopwatch inline-flex"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {children}
    </div>
  );
}
