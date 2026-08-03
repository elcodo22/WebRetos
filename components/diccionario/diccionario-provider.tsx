"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { categoryLabel, type DiccionarioResult } from "@/lib/diccionario";

type Ctx = {
  isOpen: boolean;
  open: (palabra: string) => void;
  close: () => void;
};

const DiccionarioContext = createContext<Ctx | null>(null);

export function useDiccionario(): Ctx {
  const ctx = useContext(DiccionarioContext);
  if (!ctx) {
    throw new Error("useDiccionario must be used within a DiccionarioProvider");
  }
  return ctx;
}

type State =
  | { phase: "closed" }
  | { phase: "loading"; word: string }
  | { phase: "ready"; word: string; data: DiccionarioResult }
  | { phase: "error"; word: string; message: string };

/**
 * Overlay fullscreen blanco: palabra + acepciones RAE al hacer clic en un término.
 */
export function DiccionarioProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ phase: "closed" });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const close = useCallback(() => {
    setState({ phase: "closed" });
  }, []);

  const open = useCallback((palabra: string) => {
    const word = palabra.trim().toLowerCase();
    if (!word) return;

    setState({ phase: "loading", word });

    void fetch(`/api/diccionario?palabra=${encodeURIComponent(word)}`)
      .then(async (res) => {
        if (res.status === 404) {
          setState({
            phase: "error",
            word,
            message: "No se encontró en el diccionario.",
          });
          return;
        }
        if (!res.ok) {
          setState({
            phase: "error",
            word,
            message: "No se pudo consultar el diccionario.",
          });
          return;
        }
        const data = (await res.json()) as DiccionarioResult;
        setState({ phase: "ready", word: data.word || word, data });
      })
      .catch(() => {
        setState({
          phase: "error",
          word,
          message: "No se pudo consultar el diccionario.",
        });
      });
  }, []);

  const isOpen = state.phase !== "closed";

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [isOpen, close]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const stopBackgroundScroll = (event: Event) => {
      // Solo bloquea el scroll de fondo; el panel interno puede hacer overflow.
      const target = event.target;
      if (!(target instanceof Element)) {
        event.preventDefault();
        return;
      }
      const scrollRoot = target.closest("[data-diccionario-scroll]");
      if (scrollRoot) return;
      event.preventDefault();
    };

    window.addEventListener("wheel", stopBackgroundScroll, {
      passive: false,
      capture: true,
    });
    window.addEventListener("touchmove", stopBackgroundScroll, {
      passive: false,
      capture: true,
    });

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("wheel", stopBackgroundScroll, true);
      window.removeEventListener("touchmove", stopBackgroundScroll, true);
    };
  }, [isOpen]);

  const overlay =
    isOpen && mounted
      ? createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Definición de ${"word" in state ? state.word : ""}`}
            className="fixed inset-0 z-[9998] flex flex-col bg-white text-black"
            onClick={close}
          >
            <div
              className="w-full flex-1 overflow-y-auto overscroll-contain py-16 pl-[8vw] pr-[10vw] md:pl-[12vw] md:pr-[18vw]"
              data-diccionario-scroll
              onClick={(event) => event.stopPropagation()}
              onWheel={(event) => event.stopPropagation()}
            >
              <div className="max-w-[36rem]">
                <p className="text-[28px] font-medium leading-tight tracking-wide md:text-[32px]">
                  {"word" in state ? state.word : ""}
                </p>

                {state.phase === "loading" ? (
                  <p className="mt-8 text-[16px] font-normal leading-relaxed tracking-wide text-black/50">
                    …
                  </p>
                ) : null}

                {state.phase === "error" ? (
                  <p className="mt-8 text-[16px] font-normal leading-relaxed tracking-wide">
                    {state.message}
                  </p>
                ) : null}

                {state.phase === "ready" ? (
                  <ul className="mt-8 list-none space-y-5 p-0">
                    {state.data.senses.map((sense) => {
                      const cat = categoryLabel(sense.category);
                      return (
                        <li
                          key={`${sense.n}-${sense.description}`}
                          className="text-[16px] font-normal leading-relaxed tracking-wide md:text-[17px]"
                        >
                          <span className="text-black/55">
                            {sense.n}.
                            {cat ? ` ${cat}` : ""}{" "}
                          </span>
                          {sense.description}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              className="absolute right-[18px] top-[18px] text-[18px] font-normal tracking-wide text-black/70 hover:text-black"
              style={{ cursor: 'url("/xp_link_xl.cur"), pointer' }}
              onClick={close}
              aria-label="Cerrar diccionario"
            >
              [cerrar]
            </button>
          </div>,
          document.body,
        )
      : null;

  return (
    <DiccionarioContext.Provider value={{ isOpen, open, close }}>
      {children}
      {overlay}
    </DiccionarioContext.Provider>
  );
}
