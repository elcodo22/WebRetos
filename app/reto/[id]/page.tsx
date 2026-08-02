import { notFound } from "next/navigation";
import { RetoFeed } from "@/components/reto/reto-feed";
import { RetoSnap } from "@/components/reto/reto-snap";
import { RetoTitleNav } from "@/components/reto/reto-title-nav";
import { SiteHeader } from "@/components/layout/site-header";
import { generarFeedRetoMock } from "@/lib/mocks/reto-feed";
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

  return (
    <RetoSnap
      header={<SiteHeader user={user} showCountdown={false} />}
      hero={<RetoTitleNav numero={reto.numero} titulo={reto.titulo} />}
      feed={
        <RetoFeed
          items={feed}
          retoNumero={reto.numero}
          retoTitulo={reto.titulo}
          retoId={reto.id}
          user={user}
        />
      }
    />
  );
}
