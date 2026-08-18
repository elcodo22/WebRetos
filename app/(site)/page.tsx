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
    ? `Este reto te pide crear una pieza audiovisual alrededor de **${retoActivo.titulo}**. No hace falta que sea perfecta: busca una idea clara, un gesto visual y una intención que se entienda en poco tiempo. Grábala en vertical o horizontal, con lo que tengas a mano. La duración es de **15 a 60 segundos**; si te pasas un poco no pasa nada, pero evita piezas largas sin foco. Cuando se acabe el tiempo, tu vídeo aparecerá en la ficha de este reto y más adelante en Archivos, junto al resto de participaciones. Para poder subirla necesitas un **código de participación**: introdúcelo abajo y, si es válido, podrás enviar tu pieza antes de que cierre el reto.`
    : "";

  const hero = retoActivo ? (
    <RetoHero
      numero={retoActivo.numero}
      titulo={retoActivo.titulo}
      descripcion={descripcionLarga}
      fechaInicio={retoActivo.fecha_inicio}
      fechaFin={retoActivo.fecha_fin}
    />
  ) : (
    <div className="relative flex h-full w-full items-center justify-center">
      <div className="w-full max-w-3xl px-[var(--grid-margin)] text-center [word-spacing:0.45em]">
        <p className="text-[clamp(28px,5.5vw,40px)] font-normal uppercase leading-none tracking-normal">
          #---
        </p>
        <h1 className="mt-3 text-[clamp(36px,7vw,56px)] font-medium uppercase leading-tight tracking-normal md:mt-4">
          Sin reto activo
        </h1>
      </div>
    </div>
  );

  return (
    <HomeSnap
      header={<SiteHeader user={user} />}
      hero={hero}
      archivos={<ArchivosCarousel retos={retosArchivo} />}
    />
  );
}
