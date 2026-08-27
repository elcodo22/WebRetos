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
import type { UsuarioBusqueda } from "@/lib/usuario-busqueda";
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
  const [usuarios, setUsuarios] = useState<UsuarioBusqueda[]>([]);
  const fetchedRef = useRef(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isVisible = phase !== "closed";
  /** true mientras el panel de búsqueda está montado (abierto o cerrando). */
  const isOpen = isVisible;
  const panelActive = phase === "open";

  const ensureData = useCallback(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetch("/api/retos-archivo")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: RetoArchivo[]) => setRetos(Array.isArray(data) ? data : []))
      .catch(() => setRetos([]));
    fetch("/api/usuarios")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: UsuarioBusqueda[]) =>
        setUsuarios(Array.isArray(data) ? data : []),
      )
      .catch(() => setUsuarios([]));
  }, []);

  const open = useCallback(() => {
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    ensureData();
    setSession((n) => n + 1);
    setPhase("open");
  }, [ensureData]);

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
    if (!panelActive) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelActive, close]);

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
              panelActive
                ? "search-panel search-panel--in"
                : "search-panel search-panel--out"
            }
          >
            <ArchivosSearchScreen
              retos={retos}
              usuarios={usuarios}
              onClose={close}
            />
          </div>
        )}
      </div>
    </SearchOverlayContext.Provider>
  );
}
