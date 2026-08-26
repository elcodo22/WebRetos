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

  const descripcionLarga = retoActivo
    ? `Graba una pieza audiovisual de entre 30 segundos y 4 minutos usando únicamente planos fijos. Sin mover la cámara, haz que todo pase dentro del encuadre. Sube tu pieza antes de que termine el tiempo del reto y, tranqui, puedes hacer scroll por la web para participar. ¿Qué puedes contar sin mover la cámara?`
    : "";

  const hero = retoActivo ? (
    <RetoHero
      numero={retoActivo.numero}
      titulo={retoActivo.titulo}
      descripcion={descripcionLarga}
      fechaFin={retoActivo.fecha_fin}
    />
  ) : (
    <div className="relative flex h-full w-full items-center justify-center">
      <div className="relative z-10 w-full max-w-3xl px-[var(--grid-margin)] text-center [word-spacing:0.45em]">
        <h1 className="flex flex-wrap items-baseline justify-center gap-x-[0.35em] gap-y-1 text-center text-[clamp(26px,4.5vw,38px)] font-medium uppercase leading-tight tracking-normal">
          <span className="font-normal">#---</span>
          <span>Sin reto activo</span>
        </h1>
      </div>
    </div>
  );

  return (
    <div className="h-full min-h-0">
      <HomeSnap
        user={user}
        header={<SiteHeader user={user} />}
        hero={hero}
        archivos={<ArchivosCarousel retos={retosArchivo} />}
      />
    </div>
  );
}
