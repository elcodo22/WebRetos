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
