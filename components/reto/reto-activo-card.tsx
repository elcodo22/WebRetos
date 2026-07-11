import { Countdown } from "@/components/reto/countdown";

type RetoActivo = {
  titulo: string;
  descripcion: string;
  fecha_fin: string;
};

export function RetoActivoCard({ reto }: { reto: RetoActivo }) {
  return (
    <section className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <p className="mb-2 text-sm font-medium uppercase tracking-wide text-green-700 dark:text-green-400">
        Reto activo
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {reto.titulo}
      </h1>
      <p className="mt-4 text-base leading-7 text-zinc-600 dark:text-zinc-400">
        {reto.descripcion}
      </p>

      <div className="mt-8">
        <p className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Tiempo restante
        </p>
        <Countdown fechaFin={reto.fecha_fin} />
      </div>
    </section>
  );
}
