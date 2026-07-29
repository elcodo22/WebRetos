import { Suspense } from "react";
import { ArchivosCarousel } from "@/components/archivos/archivos-carousel";
import { HomeSnap } from "@/components/layout/home-snap";
import { SiteHeader } from "@/components/layout/site-header";
import { RetoHero } from "@/components/reto/reto-hero";
import { generarRetosArchivoMock } from "@/lib/mocks/retos-archivo";
import { getRetoActivo, getRetosArchivo } from "@/lib/supabase/retos";
import { createClient } from "@/lib/supabase/server";

const MOSTRAR_MOCKS_ARCHIVO = true;

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

  if (MOSTRAR_MOCKS_ARCHIVO) {
    const mocks = generarRetosArchivoMock();
    retosArchivo = [...mocks, ...retosArchivo]
      .sort((a, b) => a.fechaOrden - b.fechaOrden)
      .map((reto, i) => ({
        ...reto,
        numero: (i + 1).toString().padStart(2, "0"),
      }));
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
        <div className="h-full bg-[var(--background)] text-white">
          <SiteHeader user={user} fechaFin={retoActivo?.fecha_fin} />
        </div>
      }
    >
      <HomeSnap
        header={
          <SiteHeader user={user} fechaFin={retoActivo?.fecha_fin} />
        }
        hero={hero}
        archivos={<ArchivosCarousel retos={retosArchivo} />}
      />
    </Suspense>
  );
}
