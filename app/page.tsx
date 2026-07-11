import { SiteHeader } from "@/components/layout/site-header";
import { RetoActivoCard } from "@/components/reto/reto-activo-card";
import { getPerfil } from "@/lib/supabase/auth";
import { getRetoActivo } from "@/lib/supabase/retos";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const perfil = user ? await getPerfil(user.id) : null;

  let retoActivo = null;
  try {
    retoActivo = await getRetoActivo(supabase);
  } catch {
    retoActivo = null;
  }

  return (
    <div className="flex min-h-full flex-col bg-zinc-50 dark:bg-black">
      <SiteHeader user={user} perfil={perfil} />

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {retoActivo?.fecha_fin ? (
          <RetoActivoCard
            reto={{
              titulo: retoActivo.titulo,
              descripcion: retoActivo.descripcion,
              fecha_fin: retoActivo.fecha_fin,
            }}
          />
        ) : (
          <section className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              No hay reto activo
            </h1>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
              Vuelve pronto. El próximo reto se publicará aquí.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
