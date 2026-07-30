import { notFound } from "next/navigation";
import { RetoFeed } from "@/components/reto/reto-feed";
import { RetoSnap } from "@/components/reto/reto-snap";
import { SiteHeader } from "@/components/layout/site-header";
import { generarFeedRetoMock } from "@/lib/mocks/reto-feed";
import { getRetoArchivoById } from "@/lib/retos-archivo-data";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function RetoArchivoPage({ params }: PageProps) {
  const { id } = await params;
  const reto = await getRetoArchivoById(id);
  if (!reto) notFound();

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
      feed={<RetoFeed items={feed} />}
    />
  );
}
