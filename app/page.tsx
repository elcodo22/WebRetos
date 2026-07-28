import { Suspense } from "react";
import { ArchivosSection } from "@/components/archivos/archivos-section";
import { HomeSnap } from "@/components/layout/home-snap";
import { SiteHeader } from "@/components/layout/site-header";
import { RetoHero } from "@/components/reto/reto-hero";
import { getRetoActivo, getRetosArchivo } from "@/lib/supabase/retos";
import { createClient } from "@/lib/supabase/server";

function formatearNumeroReto(totalAnteriores: number) {
  return (totalAnteriores + 1).toString().padStart(3, "0");
}

export default async function Home() {
  const supabase = await createClient();

  let user = null;
  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    user = authUser;
  } catch {
    user = null;
  }

  let retoActivo = null;
  let numeroReto = "000";
  let retosArchivo: Awaited<ReturnType<typeof getRetosArchivo>> = [];

  try {
    retoActivo = await getRetoActivo(supabase);
    retosArchivo = await getRetosArchivo(supabase);

    if (retoActivo) {
      const { count } = await supabase
        .from("retos")
        .select("id", { count: "exact", head: true })
        .lte("creado_en", retoActivo.creado_en ?? new Date().toISOString())
        .in("estado", ["activo", "en_cola", "finalizado"]);

      numeroReto = formatearNumeroReto(Math.max((count ?? 1) - 1, 0));
    }
  } catch {
    retoActivo = null;
    retosArchivo = [];
  }

  const hero = retoActivo ? (
    <RetoHero
      numero={numeroReto}
      titulo={retoActivo.titulo}
      descripcion={retoActivo.descripcion}
      participarHref={user ? "/subir" : "/login"}
    />
  ) : (
    <section className="site-grid w-full items-start">
      <p className="col-start-2 col-span-1 pt-1 text-[24px] font-normal leading-none">
        #---
      </p>
      <div className="col-start-3 col-span-4">
        <h1 className="text-[32px] font-medium leading-tight tracking-wide">
          Sin reto activo
        </h1>
        <p className="mt-6 text-[20px] font-normal leading-relaxed tracking-wide">
          Vuelve pronto. El próximo reto aparecerá aquí.
        </p>
      </div>
    </section>
  );

  return (
    <Suspense
      fallback={
        <div className="h-dvh bg-[var(--background)] text-white">
          <SiteHeader user={user} fechaFin={retoActivo?.fecha_fin} />
        </div>
      }
    >
      <HomeSnap
        header={<SiteHeader user={user} fechaFin={retoActivo?.fecha_fin} />}
        hero={hero}
        archivos={<ArchivosSection retos={retosArchivo} />}
      />
    </Suspense>
  );
}
