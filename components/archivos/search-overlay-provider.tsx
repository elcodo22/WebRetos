"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { RetoArchivo } from "@/lib/supabase/retos";
import { ArchivosSearchScreen } from "./archivos-search-screen";

const EXIT_MS = 180;

type Ctx = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const SearchOverlayContext = createContext<Ctx | null>(null);

/**
 * Devuelve el controlador del overlay de búsqueda. Debe usarse dentro de un
 * `<SearchOverlayProvider>`.
 */
export function useSearchOverlay(): Ctx {
  const ctx = useContext(SearchOverlayContext);
  if (!ctx) {
    throw new Error(
      "useSearchOverlay must be used within a SearchOverlayProvider",
    );
  }
  return ctx;
}

type Phase = "closed" | "open" | "closing";

/**
 * Overlay de búsqueda pantalla completa: al abrir, la página actual desaparece
 * y solo queda la pantalla de búsqueda.
 */
export function SearchOverlayProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("closed");
  const [session, setSession] = useState(0);
  const [retos, setRetos] = useState<RetoArchivo[]>([]);
  const fetchedRef = useRef(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isVisible = phase !== "closed";
  const isOpen = phase === "open";

  const ensureRetos = useCallback(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetch("/api/retos-archivo", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: RetoArchivo[]) => setRetos(Array.isArray(data) ? data : []))
      .catch(() => setRetos([]));
  }, []);

  const open = useCallback(() => {
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    ensureRetos();
    setSession((n) => n + 1);
    setPhase("open");
  }, [ensureRetos]);

  const close = useCallback(() => {
    setPhase((current) => (current === "closed" ? current : "closing"));
  }, []);

  useEffect(() => {
    if (phase !== "closing") return;
    exitTimerRef.current = setTimeout(() => {
      setPhase("closed");
      exitTimerRef.current = null;
    }, EXIT_MS);
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, [phase]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  return (
    <SearchOverlayContext.Provider value={{ isOpen, open, close }}>
      <div className="search-root">
        <div
          className={
            isVisible ? "search-stage search-stage--hidden" : "search-stage"
          }
          inert={isVisible ? true : undefined}
        >
          {children}
        </div>

        {isVisible && (
          <div
            key={session}
            role="dialog"
            aria-modal="true"
            aria-label="Búsqueda"
            className={
              isOpen
                ? "search-panel search-panel--in"
                : "search-panel search-panel--out"
            }
          >
            <ArchivosSearchScreen retos={retos} onClose={close} />
          </div>
        )}
      </div>
    </SearchOverlayContext.Provider>
  );
}
