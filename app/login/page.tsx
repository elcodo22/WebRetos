import { LoginForm } from "@/components/auth/login-form";
import { SiteHeader } from "@/components/layout/site-header";
import { getRetoActivo } from "@/lib/supabase/retos";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function LoginPage() {
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
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[var(--background)] text-white">
      <div className="shrink-0">
        <SiteHeader user={null} fechaFin={fechaFin} />
      </div>
      <LoginForm />
    </div>
  );
}
