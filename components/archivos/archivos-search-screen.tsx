"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RetoArchivo } from "@/lib/supabase/retos";

type Orden = "recientes" | "antiguos" | "az";

const ORDEN_LABEL: Record<Orden, string> = {
  recientes: "Recientes",
  antiguos: "Antiguos",
  az: "A–Z",
};

type Props = {
  retos: RetoArchivo[];
  onClose?: () => void;
};

export function ArchivosSearchScreen({ retos, onClose }: Props) {
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
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="search-panel-content flex h-full min-h-0 flex-col">
      {/*
       * Barra superior: la X a la altura del logo; búsqueda + filtro ocupan
       * las mismas columnas que la lista (2–9) para alinear bordes.
       */}
      <header className="site-grid relative shrink-0 items-center py-6 text-white">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar búsqueda"
          className="col-start-1 col-span-1 inline-flex items-center leading-none"
        >
          <CloseIcon />
        </button>

        <div className="col-start-2 col-span-8 flex items-stretch gap-5">
          <label className="relative flex h-12 flex-1 items-center border border-white">
            <span className="sr-only">Buscar</span>
            <input
              ref={inputRef}
              type="search"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar"
              className="h-full w-full bg-transparent px-4 text-[20px] font-normal tracking-wide text-white outline-none placeholder:text-white"
            />
          </label>

          <div className="relative w-[220px] shrink-0">
            <button
              type="button"
              className="flex h-12 w-full items-center justify-between border border-white px-4 text-left text-[20px] font-normal tracking-wide"
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
      </header>

      <div className="site-grid scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain pb-16">
        <ul className="col-start-2 col-span-8 mt-10 flex flex-col gap-8">
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
  );
}

/**
 * Icono `close` oficial de Pixelarticons. Se pinta en blanco heredando el
 * color del padre.
 */
function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="34"
      height="34"
      viewBox="0 0 24 24"
      fill="none"
      style={{ shapeRendering: "crispEdges" }}
      aria-hidden
    >
      <path
        d="M5 5h2v2H5V5zm4 4H7V7h2v2zm2 2H9V9h2v2zm2 0h-2v2H9v2H7v2H5v2h2v-2h2v-2h2v-2h2v2h2v2h2v2h2v-2h-2v-2h-2v-2h-2v-2zm2-2v2h-2V9h2zm2-2v2h-2V7h2zm0 0V5h2v2h-2z"
        fill="currentColor"
      />
    </svg>
  );
}
