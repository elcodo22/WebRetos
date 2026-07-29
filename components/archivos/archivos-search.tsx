"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RetoArchivo } from "@/lib/supabase/retos";

type Orden = "recientes" | "antiguos" | "az";

const ORDEN_LABEL: Record<Orden, string> = {
  recientes: "Recientes",
  antiguos: "Antiguos",
  az: "A–Z",
};

export function ArchivosSearch({ retos }: { retos: RetoArchivo[] }) {
  const [open, setOpen] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState<Orden>("recientes");
  const [menuAbierto, setMenuAbierto] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    let lista = retos.filter((reto) => {
      if (!q) return true;
      return (
        reto.titulo.toLowerCase().includes(q) ||
        reto.numero.includes(q) ||
        `#${reto.numero}`.includes(q)
      );
    });

    lista = [...lista].sort((a, b) => {
      if (orden === "az") return a.titulo.localeCompare(b.titulo, "es");
      if (orden === "antiguos") return a.fechaOrden - b.fechaOrden;
      return b.fechaOrden - a.fechaOrden;
    });

    return lista;
  }, [retos, busqueda, orden]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Buscar en archivos"
        className="inline-flex items-center leading-none"
        onClick={() => setOpen(true)}
      >
        <LupaIcon />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[90] flex flex-col bg-[var(--background)] text-white"
          role="dialog"
          aria-modal="true"
          aria-label="Buscar en archivos"
        >
          <header className="site-grid relative items-center py-6">
            <div className="col-start-1 col-span-1 text-[20px] leading-none">
              ✦
            </div>
            <nav className="absolute right-[18px] top-1/2 flex -translate-y-1/2 items-center gap-4 text-[20px] leading-none">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar buscador"
              >
                [Cerrar]
              </button>
            </nav>
          </header>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain pt-10 pb-16">
            <div className="site-grid">
              <div className="col-start-2 col-span-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:gap-5">
                  <label className="relative min-h-[48px] flex-1 border border-white">
                    <span className="sr-only">Buscar</span>
                    <input
                      ref={inputRef}
                      type="search"
                      value={busqueda}
                      onChange={(event) => setBusqueda(event.target.value)}
                      placeholder="Buscar"
                      className="h-full w-full bg-transparent px-4 py-3 text-[20px] font-normal tracking-wide text-white outline-none placeholder:text-white"
                    />
                  </label>

                  <div className="relative w-full sm:w-[220px]">
                    <button
                      type="button"
                      className="flex h-full min-h-[48px] w-full items-center justify-between border border-white px-4 py-3 text-left text-[20px] font-normal tracking-wide"
                      aria-haspopup="listbox"
                      aria-expanded={menuAbierto}
                      onClick={() => setMenuAbierto((abierto) => !abierto)}
                    >
                      <span>{ORDEN_LABEL[orden]}</span>
                      <span aria-hidden className="text-[16px]">
                        v
                      </span>
                    </button>

                    {menuAbierto && (
                      <ul
                        role="listbox"
                        className="absolute right-0 z-20 mt-1 w-full border border-white bg-[var(--background)]"
                      >
                        {(Object.keys(ORDEN_LABEL) as Orden[]).map((opcion) => (
                          <li key={opcion}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={orden === opcion}
                              className="block w-full px-4 py-3 text-left text-[20px] hover:bg-white/10"
                              onClick={() => {
                                setOrden(opcion);
                                setMenuAbierto(false);
                              }}
                            >
                              {ORDEN_LABEL[opcion]}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <ul className="mt-14 flex flex-col gap-8">
                  {filtrados.length === 0 ? (
                    <li className="text-[20px] tracking-wide text-white/70">
                      No hay resultados.
                    </li>
                  ) : (
                    filtrados.map((reto) => (
                      <li
                        key={reto.id}
                        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-x-10 text-[20px] font-normal tracking-wide"
                      >
                        <span className="tabular-nums">#{reto.numero}</span>
                        <span className="min-w-0 truncate">{reto.titulo}</span>
                        <span className="whitespace-nowrap tabular-nums">
                          {reto.fechaLabel}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function LupaIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      style={{ shapeRendering: "crispEdges" }}
      aria-hidden
    >
      {/* Círculo (pixel-art 8x8) */}
      <rect x="4" y="2" width="4" height="1" fill="currentColor" />
      <rect x="3" y="3" width="1" height="1" fill="currentColor" />
      <rect x="8" y="3" width="1" height="1" fill="currentColor" />
      <rect x="2" y="4" width="1" height="4" fill="currentColor" />
      <rect x="9" y="4" width="1" height="4" fill="currentColor" />
      <rect x="3" y="8" width="1" height="1" fill="currentColor" />
      <rect x="8" y="8" width="1" height="1" fill="currentColor" />
      <rect x="4" y="9" width="4" height="1" fill="currentColor" />
      {/* Mango */}
      <rect x="9" y="10" width="1" height="1" fill="currentColor" />
      <rect x="10" y="11" width="1" height="1" fill="currentColor" />
      <rect x="11" y="12" width="1" height="1" fill="currentColor" />
      <rect x="12" y="13" width="1" height="1" fill="currentColor" />
      <rect x="13" y="14" width="1" height="1" fill="currentColor" />
      <rect x="14" y="15" width="1" height="1" fill="currentColor" />
    </svg>
  );
}
