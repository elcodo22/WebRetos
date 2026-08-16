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
      <header className="site-grid relative shrink-0 items-center py-4 text-white max-md:flex max-md:gap-3 max-md:px-[var(--grid-margin)] md:py-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar búsqueda"
          className="col-start-1 col-span-1 inline-flex shrink-0 items-center leading-none max-md:col-auto"
        >
          <CloseIcon />
        </button>

        <div className="col-start-2 col-span-8 flex min-w-0 flex-1 items-stretch gap-3 max-md:col-auto md:gap-5">
          <label className="relative flex h-11 flex-1 items-center border border-white md:h-12">
            <span className="sr-only">Buscar</span>
            <input
              ref={inputRef}
              type="search"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar"
              className="h-full w-full bg-transparent px-3 text-[clamp(18px,3.8vw,25px)] font-normal tracking-wide text-white outline-none placeholder:text-white md:px-4"
            />
          </label>

          <div className="relative w-[min(42vw,220px)] shrink-0 md:w-[220px]">
            <button
              type="button"
              className="flex h-11 w-full items-center justify-between border border-white px-3 text-left text-[clamp(15px,3.2vw,25px)] font-normal tracking-wide md:h-12 md:px-4"
              aria-haspopup="listbox"
              aria-expanded={menuAbierto}
              onClick={() => setMenuAbierto((abierto) => !abierto)}
            >
              <span className="truncate">{ORDEN_LABEL[orden]}</span>
              <span aria-hidden className="shrink-0 text-[20px]">
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
                      className="block w-full px-4 py-3 text-left text-[clamp(18px,3.8vw,25px)] hover:bg-white/10"
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

      <div className="site-grid scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain pb-16 max-md:block max-md:px-[var(--grid-margin)]">
        <ul className="col-start-2 col-span-8 mt-8 flex flex-col gap-6 max-md:col-auto max-md:mt-6 md:mt-10 md:gap-8">
          {filtrados.length === 0 ? (
            <li className="text-[25px] tracking-wide text-white/70">
              No hay resultados.
            </li>
          ) : (
            filtrados.map((reto) => (
              <li
                key={reto.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-x-10 text-[25px] font-normal tracking-wide"
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
