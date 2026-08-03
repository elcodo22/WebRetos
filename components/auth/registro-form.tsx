"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { authCallbackUrl } from "@/lib/auth-urls";
import { PasswordLoupeField } from "@/components/auth/password-loupe-field";

const fieldClassName =
  "w-full max-w-xl bg-transparent text-center text-[24px] font-normal tracking-wide text-white outline-none placeholder:text-white/[0.72]";

const FIELD_ORDER = [
  "nombre",
  "nombreUsuario",
  "email",
  "password",
  "password2",
] as const;

type FieldKey = (typeof FIELD_ORDER)[number];

type FieldErrors = Partial<Record<FieldKey, string>>;

function normalizeUsername(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

function isValidEmail(value: string) {
  const email = value.trim();
  return email.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(value: string) {
  return (
    value.length >= 6 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /[0-9]/.test(value)
  );
}

import { authCallbackUrl } from "@/lib/auth-urls";

function firstErrorMessage(errors: FieldErrors) {
  for (const key of FIELD_ORDER) {
    if (errors[key]) return errors[key]!;
  }
  return null;
}

export function RegistroForm() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [pendingVerify, setPendingVerify] = useState(false);

  function clearFieldError(key: FieldKey) {
    setFormMessage(null);
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function handleSiguiente(event: React.FormEvent) {
    event.preventDefault();
    if (loading || pendingVerify) return;

    const username = normalizeUsername(nombreUsuario);
    const missing =
      !nombre.trim() ||
      !nombreUsuario.trim() ||
      !email.trim() ||
      !password ||
      !password2;

    if (missing) {
      setFieldErrors({});
      setFormMessage("rellena todos los campos");
      return;
    }

    const errors: FieldErrors = {};

    if (username.length < 3) {
      errors.nombreUsuario =
        "El nombre de usuario debe tener al menos 3 caracteres.";
    }
    if (!isValidEmail(email)) {
      errors.email = "Introduce un correo electrónico válido.";
    }
    if (!isValidPassword(password)) {
      errors.password =
        "La contraseña debe tener mínimo 6 caracteres, con mayúscula, minúscula y número.";
    }
    if (password !== password2) {
      errors.password2 = "Las contraseñas no coinciden.";
    }

    if (Object.keys(errors).length > 0) {
      setFormMessage(null);
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    setFieldErrors({});
    setFormMessage(null);

    const supabase = createClient();
    const nombreCompleto = nombre.trim();

    const { data: existing, error: lookupError } = await supabase
      .from("perfiles")
      .select("id")
      .eq("nombre_usuario", username)
      .maybeSingle();

    if (lookupError) {
      setLoading(false);
      setFieldErrors({ nombreUsuario: lookupError.message });
      return;
    }
    if (existing) {
      setLoading(false);
      setFieldErrors({
        nombreUsuario: "Ese nombre de usuario ya está en uso.",
      });
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: authCallbackUrl(),
        data: {
          nombre: nombreCompleto,
          nombre_usuario: username,
          nombre_completo: nombreCompleto,
        },
      },
    });

    if (signUpError) {
      setLoading(false);
      const msg = signUpError.message.toLowerCase();
      if (msg.includes("already registered") || msg.includes("already been")) {
        setFieldErrors({ email: "Ya existe una cuenta con ese correo." });
      } else if (msg.includes("weak_password") || msg.includes("characters")) {
        setFieldErrors({
          password:
            "La contraseña debe tener mínimo 6 caracteres, con mayúscula, minúscula y número.",
        });
      } else if (
        msg.includes("confirmation email") ||
        msg.includes("sending confirmation") ||
        msg.includes("smtp") ||
        msg.includes("error sending")
      ) {
        setFieldErrors({
          email:
            "No se pudo enviar el correo de verificación. Configura SMTP en Supabase (Auth → SMTP) o desactiva Confirm email temporalmente.",
        });
      } else if (msg.includes("email") && msg.includes("invalid")) {
        setFieldErrors({ email: "Introduce un correo electrónico válido." });
      } else {
        setFieldErrors({ email: signUpError.message });
      }
      return;
    }

    const identities = data.user?.identities ?? [];
    if (data.user && identities.length === 0) {
      setLoading(false);
      setFieldErrors({ email: "Ya existe una cuenta con ese correo." });
      return;
    }

    const userId = data.user?.id;
    if (userId && data.session) {
      const { error: perfilError } = await supabase.from("perfiles").upsert({
        id: userId,
        nombre_usuario: username,
        nombre_completo: nombreCompleto,
      });

      if (perfilError) {
        setLoading(false);
        if (perfilError.code === "23505") {
          setFieldErrors({
            nombreUsuario: "Ese nombre de usuario ya está en uso.",
          });
        } else {
          setFieldErrors({ nombreUsuario: perfilError.message });
        }
        return;
      }

      setLoading(false);
      router.push("/");
      router.refresh();
      return;
    }

    setLoading(false);
    setPendingVerify(true);
  }

  const bottomMessage = formMessage ?? firstErrorMessage(fieldErrors);

  if (pendingVerify) {
    return (
      <div className="relative flex h-full min-h-0 flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-[18px] text-center">
          <p className="max-w-xl text-[24px] font-normal tracking-wide text-white">
            revisa tu correo
          </p>
          <p className="max-w-xl text-[18px] tracking-wide text-white/[0.72]">
            Te hemos enviado un enlace a{" "}
            <span className="text-white">{email.trim()}</span> para verificar tu
            cuenta. Cuando lo confirmes, ya podrás iniciar sesión.
          </p>
        </div>
        <div className="flex items-end justify-end px-[18px] pb-10 text-[20px] font-normal tracking-wide">
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-white"
          >
            [Ir al login]
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSiguiente}
      className="relative flex h-full min-h-0 flex-1 flex-col"
      noValidate
    >
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 overflow-y-auto scrollbar-none px-[18px] py-6">
        <input
          type="text"
          autoComplete="name"
          value={nombre}
          onChange={(event) => {
            setNombre(event.target.value);
            clearFieldError("nombre");
          }}
          placeholder="nombre"
          className={fieldClassName}
          aria-label="nombre"
          aria-invalid={Boolean(fieldErrors.nombre)}
        />

        <input
          type="text"
          autoComplete="username"
          value={nombreUsuario}
          onChange={(event) => {
            setNombreUsuario(event.target.value);
            clearFieldError("nombreUsuario");
          }}
          placeholder="nombre de usuario"
          className={fieldClassName}
          aria-label="nombre de usuario"
          aria-invalid={Boolean(fieldErrors.nombreUsuario)}
        />

        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            clearFieldError("email");
          }}
          placeholder="correo electrónico"
          className={fieldClassName}
          aria-label="correo electrónico"
          aria-invalid={Boolean(fieldErrors.email)}
        />

        <PasswordLoupeField
          value={password}
          onChange={(value) => {
            setPassword(value);
            clearFieldError("password");
          }}
          className={fieldClassName}
          placeholder="contraseña"
          autoComplete="new-password"
          aria-label="contraseña"
          required={false}
        />

        <PasswordLoupeField
          value={password2}
          onChange={(value) => {
            setPassword2(value);
            clearFieldError("password2");
          }}
          className={fieldClassName}
          placeholder="repetir contraseña"
          autoComplete="new-password"
          aria-label="repetir contraseña"
          required={false}
        />
      </div>

      <div className="flex flex-col gap-4 px-[18px] pb-10">
        <p
          className="min-h-[24px] text-center text-[16px] tracking-wide text-white"
          role={bottomMessage ? "alert" : undefined}
        >
          {bottomMessage ?? "\u00A0"}
        </p>
        <div className="flex items-end justify-end text-[20px] font-normal tracking-wide">
          <button
            type="submit"
            disabled={loading}
            className={
              loading ? "cursor-default text-white/[0.72]" : "text-white"
            }
          >
            {loading ? "[...]" : "[Siguiente]"}
          </button>
        </div>
      </div>
    </form>
  );
}
