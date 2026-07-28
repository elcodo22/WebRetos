import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import { StreamPlayer } from "@/components/video/stream-player";
import { UploadForm } from "@/components/video/upload-form";
import { getMaxVideoDurationSeconds } from "@/lib/cloudflare/stream";
import { requireUploadAccess } from "@/app/subir/actions";

export default async function SubirPage() {
  const { user, retoActivo, obraExistente } = await requireUploadAccess();
  const maxDurationSeconds = getMaxVideoDurationSeconds();

  return (
    <div className="flex min-h-full flex-col bg-zinc-50 dark:bg-black">
      <SiteHeader user={user} />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Subir obra</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Tu vídeo se sube directamente a Cloudflare Stream y quedará oculto hasta
            que termine el reto.
          </p>
        </div>

        {!retoActivo ? (
          <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-zinc-600 dark:text-zinc-400">
              No hay ningún reto activo en este momento.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
            >
              Volver al inicio
            </Link>
          </section>
        ) : obraExistente ? (
          <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-green-700 dark:text-green-400">
                Obra enviada
              </p>
              <h2 className="mt-1 text-xl font-semibold">{obraExistente.titulo}</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Reto: {retoActivo.titulo}
              </p>
            </div>
            <StreamPlayer videoUid={obraExistente.id_cloudflare} title={obraExistente.titulo} />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Estado: {obraExistente.estado}. Solo tú puedes verla hasta que finalice el
              reto.
            </p>
          </section>
        ) : (
          <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
            <div className="mb-6 rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-700">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {retoActivo.titulo}
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {retoActivo.descripcion}
              </p>
            </div>
            <UploadForm retoId={retoActivo.id} maxDurationSeconds={maxDurationSeconds} />
          </section>
        )}
      </main>
    </div>
  );
}
