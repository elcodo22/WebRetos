"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCrtPower } from "@/components/layout/crt-power-transition";
import { formatRetoNumero } from "@/lib/format-reto-numero";
import {
  formatUsername,
  perfilHref,
  slugUsername,
} from "@/lib/mocks/perfil";
import type { RetoArchivo } from "@/lib/supabase/retos";
import type { UsuarioBusqueda } from "@/lib/usuario-busqueda";

type Props = {
  retos: RetoArchivo[];
  usuarios: UsuarioBusqueda[];
  onClose?: () => void;
};

type Resultado =
  | { kind: "reto"; id: string; numero: string; titulo: string }
  | { kind: "usuario"; username: string };

export function ArchivosSearchScreen({ retos, usuarios, onClose }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { powerOffTo } = useCrtPower();

  const resultados = useMemo(() => {
    const raw = busqueda.trim();
    if (!raw) return [] as Resultado[];

    const wantsUser = raw.startsWith("@");
    const q = slugUsername(raw).toLowerCase();
    if (!q) return [] as Resultado[];

    const out: Resultado[] = [];

    if (!wantsUser) {
      for (const reto of retos) {
        const num = formatRetoNumero(reto.numero);
        const hit =
          reto.titulo.toLowerCase().includes(q) ||
          reto.numero.includes(q) ||
          num.includes(q) ||
          `#${reto.numero}`.includes(q) ||
          `#${num}`.includes(q);
        if (hit) {
          out.push({
            kind: "reto",
            id: reto.id,
            numero: num,
            titulo: reto.titulo,
          });
        }
      }
    }

    for (const user of usuarios) {
      const slug = slugUsername(user.username);
      const nombre = (user.nombreCompleto ?? "").toLowerCase();
      if (slug.includes(q) || nombre.includes(q)) {
        out.push({ kind: "usuario", username: slug });
      }
    }

    return out;
  }, [busqueda, retos, usuarios]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, []);

  function openReto(id: string) {
    onClose?.();
    powerOffTo(`/reto/${id}`);
  }

  function openUsuario(username: string) {
    onClose?.();
    powerOffTo(perfilHref(username));
  }

  return (
    <div className="search-panel-content relative flex h-full min-h-0 flex-col">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-4 px-[18px] pt-3 md:pt-6">
        <label className="pointer-events-auto min-w-0 flex-1">
          <span className="sr-only">Buscar</span>
          <input
            ref={inputRef}
            type="search"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar"
            autoComplete="off"
            spellCheck={false}
            className="w-full appearance-none border-0 bg-transparent text-[clamp(16px,3.2vw,20px)] font-normal leading-none tracking-wide text-white outline-none placeholder:text-white/[0.72] [&::-webkit-search-cancel-button]:hidden"
          />
        </label>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar búsqueda"
          className="pointer-events-auto shrink-0 ui-btn-text font-normal leading-none tracking-wide text-white transition-opacity hover:opacity-80"
        >
          [CERRAR]
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-[18px] pb-16 pt-16 md:pt-20">
        {busqueda.trim() ? (
          <ul className="flex flex-col gap-5 md:gap-6">
            {resultados.length === 0 ? (
              <li className="text-[clamp(16px,3.2vw,20px)] tracking-wide text-white/[0.72]">
                Sin resultados
              </li>
            ) : (
              resultados.map((item) =>
                item.kind === "reto" ? (
                  <li key={`reto-${item.id}`}>
                    <button
                      type="button"
                      onClick={() => openReto(item.id)}
                      className="flex max-w-full items-baseline gap-x-4 text-left text-[clamp(16px,3.2vw,22px)] font-normal tracking-wide text-white transition-opacity hover:opacity-80"
                    >
                      <span className="shrink-0 tabular-nums">
                        #{item.numero}
                      </span>
                      <span className="min-w-0 truncate uppercase">
                        {item.titulo}
                      </span>
                    </button>
                  </li>
                ) : (
                  <li key={`user-${item.username}`}>
                    <button
                      type="button"
                      onClick={() => openUsuario(item.username)}
                      className="text-left text-[clamp(16px,3.2vw,22px)] font-normal tracking-wide text-white transition-opacity hover:opacity-80"
                    >
                      {formatUsername(item.username)}
                    </button>
                  </li>
                ),
              )
            )}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
