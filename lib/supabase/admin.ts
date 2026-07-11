import { redirect } from "next/navigation";
import { getPerfil, getSession } from "@/lib/supabase/auth";

export async function requireAdmin() {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  const perfil = await getPerfil(user.id);

  if (!perfil?.es_admin) {
    redirect("/");
  }

  return { user, perfil };
}
