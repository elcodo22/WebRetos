"use client";

import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ClickableText,
} from "@/components/diccionario/clickable-text";

type RetoHeroProps = {
  numero: string;
  titulo: string;
  descripcion: string;
  participarHref: string;
};

const BTN_LABEL = "[PARTICIPAR]";
/** ms por carácter (más bajo = más rápido). */
const MS_PER_CHAR = 14;
/** Pausa corta entre bloques. */
const PAUSE_MS = 90;
/** Duración del barrido de puntos. */
const DOTS_MS = 420;

function stripMarkdown(texto: string) {
  return texto.replace(/\*\*([^*]+)\*\*/g, "$1");
}

function renderDescripcion(texto: string) {
  const parts = texto.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) {
      return (
        <strong key={index} className="font-bold">
          {bold[1]}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function getEndOfTextRect(element: HTMLElement): DOMRect | null {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let lastText: Text | null = null;

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (node.textContent && node.textContent.length > 0) {
      lastText = node;
    }
  }

  if (!lastText || !lastText.textContent) return null;

  const range = document.createRange();
  const length = lastText.textContent.length;
  range.setStart(lastText, Math.max(0, length - 1));
  range.setEnd(lastText, length);
  const rects = range.getClientRects();
  return rects[rects.length - 1] ?? range.getBoundingClientRect();
}

type Phase = "numero" | "titulo" | "descripcion" | "puntos" | "boton" | "done";

type TypeState = {
  phase: Phase;
  n: number;
  t: number;
  d: number;
  dotsProgress: number; // 0..1
  b: number;
};

type DotsBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function RetoHero({
  numero,
  titulo,
  descripcion,
  participarHref,
}: RetoHeroProps) {
  const numeroFull = useMemo(() => `#${numero}`, [numero]);
  const descPlain = useMemo(() => stripMarkdown(descripcion), [descripcion]);

  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const col7EndRef = useRef<HTMLDivElement>(null);

  const [dotsBox, setDotsBox] = useState<DotsBox | null>(null);
  const [cursorOn, setCursorOn] = useState(true);
  const [state, setState] = useState<TypeState>({
    phase: "numero",
    n: 0,
    t: 0,
    d: 0,
    dotsProgress: 0,
    b: 0,
  });

  const stateRef = useRef(state);
  const dotsBoxRef = useRef(dotsBox);
  stateRef.current = state;
  dotsBoxRef.current = dotsBox;

  // Medir desde el último carácter de la descripción (mismo ancho que el <p>)
  // hasta el final de la columna 7.
  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    const col7End = col7EndRef.current;
    if (!container || !measure || !col7End) return;

    const update = () => {
      const last = getEndOfTextRect(measure);
      if (!last) {
        setDotsBox(null);
        return;
      }
      const col7Rect = col7End.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const height = Math.max(last.height, 20);
      const left = last.right - containerRect.left;
      const width = Math.max(0, col7Rect.right - last.right);
      setDotsBox({
        left,
        top: last.top - containerRect.top,
        width,
        height,
      });
    };

    update();
    const raf = requestAnimationFrame(update);
    const observer = new ResizeObserver(() => requestAnimationFrame(update));
    observer.observe(container);
    observer.observe(col7End);
    if (measure.parentElement) observer.observe(measure.parentElement);
    if (document.fonts?.ready) void document.fonts.ready.then(update);
    window.addEventListener("resize", update);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [descripcion]);

  // Un solo bucle rAF: avanza por tiempo (sin timeouts encadenados).
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (mq.matches) {
      setState({
        phase: "done",
        n: numeroFull.length,
        t: titulo.length,
        d: descPlain.length,
        dotsProgress: 1,
        b: BTN_LABEL.length,
      });
      return;
    }

    setState({
      phase: "numero",
      n: 0,
      t: 0,
      d: 0,
      dotsProgress: 0,
      b: 0,
    });

    let raf = 0;
    let last = performance.now();
    let carry = 0;
    let pauseLeft = 0;
    let finished = false;
    let cur: TypeState = {
      phase: "numero",
      n: 0,
      t: 0,
      d: 0,
      dotsProgress: 0,
      b: 0,
    };

    const commit = (next: TypeState) => {
      cur = next;
      stateRef.current = next;
      setState(next);
      if (next.phase === "done") finished = true;
    };

    const tick = (now: number) => {
      if (finished) return;

      const dt = Math.min(32, now - last);
      last = now;

      if (pauseLeft > 0) {
        pauseLeft -= dt;
        raf = requestAnimationFrame(tick);
        return;
      }

      let { phase, n, t, d, dotsProgress, b } = cur;

      if (phase === "puntos") {
        const box = dotsBoxRef.current;
        if (!box || box.width <= 0) {
          commit({ phase: "boton", n, t, d, dotsProgress: 1, b });
          pauseLeft = PAUSE_MS;
          if (!finished) raf = requestAnimationFrame(tick);
          return;
        }
        const nextDots = Math.min(1, dotsProgress + dt / DOTS_MS);
        if (nextDots !== dotsProgress) {
          dotsProgress = nextDots;
          if (dotsProgress >= 1) {
            phase = "boton";
            pauseLeft = PAUSE_MS;
            commit({ phase, n, t, d, dotsProgress: 1, b });
          } else {
            commit({ phase, n, t, d, dotsProgress, b });
          }
        }
        if (!finished) raf = requestAnimationFrame(tick);
        return;
      }

      carry += dt;
      let remaining = Math.floor(carry / MS_PER_CHAR);
      if (remaining <= 0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      carry -= remaining * MS_PER_CHAR;

      let changed = false;

      while (remaining > 0 && phase !== "done") {
        if (phase === "numero") {
          if (n >= numeroFull.length) {
            phase = "titulo";
            pauseLeft = PAUSE_MS;
            changed = true;
            break;
          }
          const take = Math.min(remaining, numeroFull.length - n);
          n += take;
          remaining -= take;
          changed = true;
          if (n >= numeroFull.length) {
            phase = "titulo";
            pauseLeft = PAUSE_MS;
            break;
          }
        } else if (phase === "titulo") {
          if (t >= titulo.length) {
            phase = "descripcion";
            pauseLeft = PAUSE_MS;
            changed = true;
            break;
          }
          const take = Math.min(remaining, titulo.length - t);
          t += take;
          remaining -= take;
          changed = true;
          if (t >= titulo.length) {
            phase = "descripcion";
            pauseLeft = PAUSE_MS;
            break;
          }
        } else if (phase === "descripcion") {
          if (d >= descPlain.length) {
            phase = "puntos";
            pauseLeft = PAUSE_MS;
            changed = true;
            break;
          }
          const take = Math.min(remaining, descPlain.length - d);
          d += take;
          remaining -= take;
          changed = true;
          if (d >= descPlain.length) {
            phase = "puntos";
            pauseLeft = PAUSE_MS;
            break;
          }
        } else if (phase === "boton") {
          if (b >= BTN_LABEL.length) {
            phase = "done";
            changed = true;
            break;
          }
          const take = Math.min(remaining, BTN_LABEL.length - b);
          b += take;
          remaining -= take;
          changed = true;
          if (b >= BTN_LABEL.length) {
            phase = "done";
            break;
          }
        } else {
          break;
        }
      }

      if (changed) {
        commit({ phase, n, t, d, dotsProgress, b });
      }

      if (!finished) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      finished = true;
      cancelAnimationFrame(raf);
    };
  }, [numeroFull, titulo, descPlain]);

  useEffect(() => {
    if (state.phase === "done") return;
    const id = window.setInterval(() => setCursorOn((v) => !v), 420);
    return () => window.clearInterval(id);
  }, [state.phase]);

  const typedNumero = numeroFull.slice(0, state.n);
  const typedTitulo = titulo.slice(0, state.t);
  const typedBtn = BTN_LABEL.slice(0, state.b);
  const showCursor = state.phase !== "done" && cursorOn;
  const wordsEnabled = state.phase === "done";
  const descComplete = state.d >= descPlain.length;
  const descVisible = descComplete
    ? renderDescripcion(descripcion)
    : descPlain.slice(0, state.d);

  const showDots =
    !!dotsBox &&
    dotsBox.width > 0 &&
    (state.phase === "puntos" ||
      state.phase === "boton" ||
      state.phase === "done");

  return (
    <section className="site-grid w-full items-start text-white">
      <p className="col-start-2 col-span-1 pt-1 text-[24px] font-normal leading-none tracking-wide">
        <span>{typedNumero}</span>
        {state.phase === "numero" && showCursor ? <Caret /> : null}
      </p>

      <h1 className="col-start-3 col-span-4 min-h-[1.2em] text-[32px] font-medium leading-tight tracking-wide">
        {wordsEnabled ? (
          <ClickableText text={titulo} enabled />
        ) : (
          <span>{typedTitulo}</span>
        )}
        {state.phase === "titulo" && showCursor ? <Caret /> : null}
      </h1>

      <div
        ref={containerRef}
        className="relative col-start-3 col-span-6 row-start-2 mt-6 grid grid-cols-subgrid"
      >
        {/* Descripción: columnas 3–6 del site (1–4 del subgrid) */}
        <p className="relative col-span-4 min-h-[3em] text-[20px] font-normal leading-relaxed tracking-wide">
          {/* Misma caja que el texto visible → wrapping correcto para medir */}
          <span
            ref={measureRef}
            className="pointer-events-none invisible absolute left-0 top-0 w-full"
            aria-hidden
          >
            {renderDescripcion(descripcion)}
          </span>
          <span>{descVisible}</span>
          {state.phase === "descripcion" && showCursor ? <Caret /> : null}
        </p>

        {/* Fin de columna 7 (5 del subgrid) */}
        <div
          ref={col7EndRef}
          className="col-start-5 pointer-events-none self-stretch"
          aria-hidden
        />

        {showDots && dotsBox ? (
          <span
            aria-hidden
            className="pointer-events-none absolute overflow-hidden whitespace-nowrap text-[20px] font-normal leading-none tracking-wide"
            style={{
              left: dotsBox.left,
              top: dotsBox.top,
              width: dotsBox.width * state.dotsProgress,
              height: dotsBox.height,
              lineHeight: `${dotsBox.height}px`,
            }}
          >
            {".".repeat(500)}
            {state.phase === "puntos" && showCursor ? <Caret /> : null}
          </span>
        ) : null}

        {/* [PARTICIPAR] columna 8 (6 del subgrid) */}
        <Link
          href={participarHref}
          className={[
            "col-start-6 self-end pb-[0.15em] text-[24px] font-semibold leading-none",
            state.phase === "done" ? "participar-bulb" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-hidden={state.b === 0 ? true : undefined}
          tabIndex={state.b === 0 ? -1 : undefined}
          style={state.b === 0 ? { opacity: 0 } : undefined}
        >
          <span>{typedBtn}</span>
          {state.phase === "boton" && showCursor ? <Caret /> : null}
        </Link>
      </div>
    </section>
  );
}

function Caret() {
  return (
    <span
      aria-hidden
      className="ml-[1px] inline-block h-[0.9em] w-[0.55ch] translate-y-[0.08em] bg-white align-baseline"
    />
  );
}
