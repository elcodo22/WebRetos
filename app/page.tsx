import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPerfil } from "@/lib/supabase/auth";

async function getConnectionStatus() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return {
      configured: false,
      connected: false,
      message: "Faltan las variables de entorno de Supabase.",
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("retos").select("id").limit(1);

    if (error) {
      return {
        configured: true,
        connected: false,
        message: `Credenciales detectadas, pero la conexión falló: ${error.message}`,
      };
    }

    return {
      configured: true,
      connected: true,
      message: "Conexión con Supabase establecida correctamente.",
    };
  } catch {
    return {
      configured: true,
      connected: false,
      message: "No se pudo conectar con Supabase. Revisa tus credenciales.",
    };
  }
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const perfil = user ? await getPerfil(user.id) : null;
  const status = await getConnectionStatus();

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center gap-8 py-32 px-16">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Plataforma de Retos Audiovisuales
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Accede con un código OTP enviado a tu email.
          </p>
        </div>

        {user ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-zinc-200 bg-white px-6 py-5 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Sesión iniciada como{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {perfil?.nombre_usuario ?? user.email}
              </span>
            </p>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Iniciar sesión con OTP
          </Link>
        )}

        <div
          className={`rounded-xl border px-6 py-4 text-sm ${
            status.connected
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
              : status.configured
                ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
                : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
          }`}
        >
          <p className="font-medium">
            {status.connected
              ? "Supabase conectado"
              : status.configured
                ? "Supabase configurado parcialmente"
                : "Supabase pendiente de configurar"}
          </p>
          <p className="mt-1">{status.message}</p>
        </div>
      </main>
    </div>
  );
}
