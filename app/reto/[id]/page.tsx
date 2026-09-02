import { notFound } from "next/navigation";
import { RetoFeed } from "@/components/reto/reto-feed";
import { RetoSnap } from "@/components/reto/reto-snap";
import { RetoTitleNav } from "@/components/reto/reto-title-nav";
import { SiteHeaderWithTime } from "@/components/layout/site-header-with-time";
import { generarFeedRetoMock } from "@/lib/mocks/reto-feed";
import { RETO_DESCRIPCION_EJEMPLO } from "@/lib/reto-descripcion";
import { getCurrentUser } from "@/lib/home-data";
import { getRetoArchivoById } from "@/lib/retos-archivo-data";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function RetoArchivoPage({ params }: PageProps) {
  const { id } = await params;

  const [reto, user] = await Promise.all([
    getRetoArchivoById(id),
    getCurrentUser(),
  ]);

  if (!reto) notFound();

  const feed = generarFeedRetoMock(reto.id);
  const descripcionReto = reto.descripcion ?? RETO_DESCRIPCION_EJEMPLO;

  return (
    <RetoSnap
      user={user}
      titulo={reto.titulo}
      numero={reto.numero}
      header={<SiteHeaderWithTime user={user} />}
      hero={
        <RetoTitleNav
          numero={reto.numero}
          titulo={reto.titulo}
          descripcion={descripcionReto}
          showDescripcion
        />
      }
      feed={
        <RetoFeed
          items={feed}
          retoNumero={reto.numero}
          retoTitulo={reto.titulo}
          retoDescripcion={descripcionReto}
          retoId={reto.id}
          user={user}
        />
      }
    />
  );
}
