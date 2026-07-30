import { notFound } from "next/navigation";
import { RetoFeed } from "@/components/reto/reto-feed";
import { RetoSnap } from "@/components/reto/reto-snap";
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
      hero={
        <h1 className="flex max-w-4xl flex-wrap items-baseline justify-center gap-x-5 gap-y-2 text-center text-[32px] font-normal leading-none tracking-wide">
          <span className="shrink-0">#{reto.numero}</span>
          <span className="min-w-0">{reto.titulo}</span>
        </h1>
      }
      feed={
        <RetoFeed
          items={feed}
          retoNumero={reto.numero}
          retoTitulo={reto.titulo}
        />
      }
    />
  );
}
