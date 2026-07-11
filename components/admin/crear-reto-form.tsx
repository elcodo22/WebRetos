"use client";

import { useActionState } from "react";
import { crearReto, type AdminActionState } from "@/app/admin/actions";

const initialState: AdminActionState = {};

export function CrearRetoForm() {
  const [state, formAction, pending] = useActionState(crearReto, initialState);

  return (
    <form action={formAction} className="w-full max-w-lg space-y-4">
      <div className="space-y-2">
        <label htmlFor="titulo" className="text-sm font-medium">
          Título
        </label>
        <input
          id="titulo"
          name="titulo"
          type="text"
          required
          placeholder="Ej. Reto de la semana: 60 segundos"
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="descripcion" className="text-sm font-medium">
          Descripción
        </label>
        <textarea
          id="descripcion"
          name="descripcion"
          required
          rows={4}
          placeholder="Describe el reto para los participantes..."
          className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {pending ? "Creando..." : "Crear reto"}
      </button>

      {state.success && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          {state.success}
        </p>
      )}

      {state.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {state.error}
        </p>
      )}
    </form>
  );
}
