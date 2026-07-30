import { ArchivosCarousel } from "@/components/archivos/archivos-carousel";
import { HomeSnap } from "@/components/layout/home-snap";
import { SiteHeader } from "@/components/layout/site-header";
import { RetoHero } from "@/components/reto/reto-hero";
import { getCurrentUser, getRetoActivoHome } from "@/lib/home-data";
import { loadRetosArchivo } from "@/lib/retos-archivo-data";

/**
 * Home: espera a datos reales (sin timer/números inventados).
 * La percepción de velocidad la da `loading.tsx` + caché de datos públicos.
 */
export default async function Home() {
  const [user, retoActivo, retosArchivo] = await Promise.all([
    getCurrentUser(),
    getRetoActivoHome(),
    loadRetosArchivo(),
  ]);

  const hero = retoActivo ? (
    <RetoHero
      numero={retoActivo.numero}
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
    <HomeSnap
      header={
        <SiteHeader user={user} fechaFin={retoActivo?.fecha_fin ?? null} />
      }
      hero={hero}
      archivos={<ArchivosCarousel retos={retosArchivo} />}
    />
  );
}
