"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PasswordLoupeField } from "@/components/auth/password-loupe-field";

const fieldClassName =
  "w-full max-w-xl bg-transparent text-center text-[24px] font-normal tracking-wide text-white outline-none placeholder:text-white/[0.72]";

export function RegistroForm() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nombreOk = nombre.trim().length > 0;
  const apellidosOk = apellidos.trim().length > 0;
  const usuarioOk = nombreUsuario.trim().length > 0;
  const emailOk = email.trim().length > 0 && email.includes("@");
  const passwordOk = password.trim().length > 0;
  const passwordMatch = password.length > 0 && password === password2;

  const canSubmit =
    !loading &&
    nombreOk &&
    apellidosOk &&
    usuarioOk &&
    emailOk &&
    passwordOk &&
    passwordMatch;

  async function handleSiguiente(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const nombreCompleto = `${nombre.trim()} ${apellidos.trim()}`.trim();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          nombre: nombre.trim(),
          apellidos: apellidos.trim(),
          nombre_usuario: nombreUsuario.trim(),
          nombre_completo: nombreCompleto,
        },
      },
    });

    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }

    const userId = data.user?.id;
    if (userId) {
      const { error: perfilError } = await supabase.from("perfiles").upsert({
        id: userId,
        nombre_usuario: nombreUsuario.trim(),
        nombre_completo: nombreCompleto,
      });

      if (perfilError) {
        setLoading(false);
        setError(perfilError.message);
        return;
      }
    }

    setLoading(false);
    router.push("/");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSiguiente}
      className="relative flex h-full min-h-0 flex-1 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 overflow-y-auto scrollbar-none px-[18px] py-6">
        <input
          type="text"
          required
          autoComplete="given-name"
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
          placeholder="Nombre"
          className={fieldClassName}
          aria-label="Nombre"
        />

        <input
          type="text"
          required
          autoComplete="family-name"
          value={apellidos}
          onChange={(event) => setApellidos(event.target.value)}
          placeholder="Apellidos"
          className={fieldClassName}
          aria-label="Apellidos"
        />

        <input
          type="text"
          required
          autoComplete="username"
          value={nombreUsuario}
          onChange={(event) => setNombreUsuario(event.target.value)}
          placeholder="Nombre de usuario"
          className={fieldClassName}
          aria-label="Nombre de usuario"
        />

        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="correo electrónico"
          className={fieldClassName}
          aria-label="correo electrónico"
        />

        <PasswordLoupeField
          value={password}
          onChange={setPassword}
          className={fieldClassName}
          placeholder="contraseña"
          autoComplete="new-password"
          aria-label="contraseña"
        />

        <PasswordLoupeField
          value={password2}
          onChange={setPassword2}
          className={fieldClassName}
          placeholder="repetir contraseña"
          autoComplete="new-password"
          aria-label="repetir contraseña"
        />

        {error && (
          <p className="max-w-xl text-center text-[16px] tracking-wide text-white/[0.72]">
            {error}
          </p>
        )}
      </div>

      <div className="flex items-end justify-end px-[18px] pb-10 text-[20px] font-normal tracking-wide">
        <button
          type="submit"
          disabled={!canSubmit}
          className={
            canSubmit ? "text-white" : "cursor-default text-white/[0.72]"
          }
        >
          {loading ? "[...]" : "[Siguiente]"}
        </button>
      </div>
    </form>
  );
}
