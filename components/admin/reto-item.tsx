"use client";

import { useActionState, useState } from "react";
import {
  actualizarReto,
  eliminarReto,
  type AdminActionState,
} from "@/app/admin/actions";
import type { EstadoReto } from "@/types/database";

type Reto = {
  id: string;
  titulo: string;
  descripcion: string;
  estado: EstadoReto;
  orden_cola: number | null;
  fecha_fin: string | null;
};

const estadoLabels: Record<EstadoReto, string> = {
  activo: "Activo",
  en_cola: "En cola",
  finalizado: "Finalizado",
  eliminado: "Eliminado",
};

const estadoStyles: Record<EstadoReto, string> = {
  activo:
    "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  en_cola:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  finalizado:
    "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  eliminado:
    "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

const initialState: AdminActionState = {};

const inputClassName =
  "w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900";

export function RetoItem({ reto }: { reto: Reto }) {
  const [editing, setEditing] = useState(false);
  const [editState, editAction, editPending] = useActionState(
    actualizarReto,
    initialState
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    eliminarReto,
    initialState
  );

  const puedeGestionar = reto.estado === "activo" || reto.estado === "en_cola";
  const feedback = editState.success || editState.error || deleteState.success || deleteState.error;

  if (editing) {
    return (
      <li className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-700">
        <form action={editAction} className="space-y-3">
          <input type="hidden" name="id" value={reto.id} />

          <div className="space-y-2">
            <label htmlFor={`titulo-${reto.id}`} className="text-sm font-medium">
              Título
            </label>
            <input
              id={`titulo-${reto.id}`}
              name="titulo"
              type="text"
              required
              defaultValue={reto.titulo}
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`descripcion-${reto.id}`}
              className="text-sm font-medium"
            >
              Descripción
            </label>
            <textarea
              id={`descripcion-${reto.id}`}
              name="descripcion"
              required
              rows={3}
              defaultValue={reto.descripcion}
              className={inputClassName}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={editPending}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {editPending ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
          </div>

          {feedback && (
            <p
              className={`rounded-lg border px-4 py-3 text-sm ${
                editState.success
                  ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
                  : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
              }`}
            >
              {feedback}
            </p>
          )}
        </form>
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-700">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoStyles[reto.estado]}`}
        >
          {estadoLabels[reto.estado]}
          {reto.estado === "en_cola" && reto.orden_cola
            ? ` #${reto.orden_cola}`
            : ""}
        </span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{reto.titulo}</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {reto.descripcion}
          </p>
          {reto.estado === "activo" && reto.fecha_fin && (
            <p className="mt-2 text-xs text-zinc-500">
              Finaliza: {new Date(reto.fecha_fin).toLocaleString("es-ES")}
            </p>
          )}
        </div>

        {puedeGestionar && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
            >
              Editar
            </button>

            <form action={deleteAction}>
              <input type="hidden" name="id" value={reto.id} />
              <button
                type="submit"
                disabled={deletePending}
                onClick={(e) => {
                  const mensaje =
                    reto.estado === "activo"
                      ? "¿Eliminar el reto activo? El siguiente en cola se activará automáticamente."
                      : "¿Eliminar este reto de la cola?";
                  if (!confirm(mensaje)) e.preventDefault();
                }}
                className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
              >
                {deletePending ? "..." : "Eliminar"}
              </button>
            </form>
          </div>
        )}
      </div>

      {feedback && !editing && (
        <p
          className={`mt-3 rounded-lg border px-4 py-3 text-sm ${
            deleteState.success
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
          }`}
        >
          {feedback}
        </p>
      )}
    </li>
  );
}
