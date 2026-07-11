import Link from "next/link";
import { CrearRetoForm } from "@/components/admin/crear-reto-form";
import { RetoItem } from "@/components/admin/reto-item";
import { requireAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const { perfil } = await requireAdmin();

  const supabase = await createClient();
  const { data: retos, error: retosError } = await supabase
    .from("retos")
    .select(
      "id, titulo, descripcion, estado, orden_cola, fecha_inicio, fecha_fin, creado_en"
    )
    .in("estado", ["activo", "en_cola", "finalizado"])
    .order("estado", { ascending: true })
    .order("orden_cola", { ascending: true, nullsFirst: true })
    .order("creado_en", { ascending: false });

  return (
    <div className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Panel Admin</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Hola, {perfil.nombre_usuario}
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Volver al inicio
          </Link>
        </div>

        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-medium">Crear reto</h2>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            Si ya hay un reto activo, el nuevo se añadirá automáticamente a la cola.
          </p>
          <CrearRetoForm />
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-medium">Retos existentes</h2>
          {retosError && (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              Error al cargar retos: {retosError.message}
            </p>
          )}
          {retos && retos.length > 0 ? (
            <ul className="space-y-4">
              {retos.map((reto) => (
                <RetoItem key={reto.id} reto={reto} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Aún no hay retos creados.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
