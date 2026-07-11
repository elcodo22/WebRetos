import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Perfil = Database["public"]["Tables"]["perfiles"]["Row"];

export function SiteHeader({
  user,
  perfil,
}: {
  user: User | null;
  perfil: Perfil | null;
}) {
  return (
    <header className="flex items-center justify-between px-6 py-4">
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        Retos Audiovisuales
      </p>

      <nav className="flex items-center gap-3">
        {user ? (
          <>
            <span className="hidden text-sm text-zinc-600 sm:inline dark:text-zinc-400">
              {perfil?.nombre_usuario ?? user.email}
            </span>
            {perfil?.es_admin && (
              <Link
                href="/admin"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
              >
                Admin
              </Link>
            )}
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
              >
                Salir
              </button>
            </form>
          </>
        ) : (
          <Link
            href="/login"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Iniciar sesión
          </Link>
        )}
      </nav>
    </header>
  );
}
