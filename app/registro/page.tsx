import { RegistroForm } from "@/components/auth/registro-form";
import { SiteHeader } from "@/components/layout/site-header";
import { getRetoActivo } from "@/lib/supabase/retos";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function RegistroPage() {
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

  if (user) {
    redirect("/");
  }

  let fechaFin: string | null = null;
  try {
    const reto = await getRetoActivo(supabase);
    fechaFin = reto?.fecha_fin ?? null;
  } catch {
    fechaFin = null;
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[var(--background)] text-white">
      <div className="shrink-0">
        <SiteHeader user={null} fechaFin={fechaFin} variant="registro" />
      </div>
      <RegistroForm />
    </div>
  );
}
