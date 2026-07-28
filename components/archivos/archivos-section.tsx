"use client";

import { useMemo, useState } from "react";
import type { RetoArchivo } from "@/lib/supabase/retos";

type Orden = "recientes" | "antiguos" | "az";

const ORDEN_LABEL: Record<Orden, string> = {
  recientes: "Recientes",
  antiguos: "Antiguos",
  az: "A–Z",
};

export function ArchivosSection({ retos }: { retos: RetoArchivo[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState<Orden>("recientes");
  const [menuAbierto, setMenuAbierto] = useState(false);

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

  return (
    <section id="archivos" className="pb-24 pt-10 text-white">
      {/* Todo el bloque: columnas 2 → 9 */}
      <div className="site-grid">
        <div className="col-start-2 col-span-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:gap-5">
            <label className="relative min-h-[48px] flex-1 border border-white">
              <span className="sr-only">Buscar</span>
              <input
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
                No hay retos en el archivo.
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
    </section>
  );
}
