"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PasswordLoupeField } from "@/components/auth/password-loupe-field";
import { SiteHeader } from "@/components/layout/site-header";

const fieldClassName =
  "w-full max-w-xl bg-transparent text-center text-[24px] font-normal tracking-wide text-white outline-none placeholder:text-white/[0.72]";

type Mode = "login" | "forgot";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(() => {
    if (searchParams.get("error") === "auth") {
      const detail = searchParams.get("detail");
      return detail
        ? `No se pudo verificar el enlace: ${detail}`
        : "No se pudo verificar el enlace. Prueba a iniciar sesión o registra de nuevo.";
    }
    return null;
  });
  const [error, setError] = useState<string | null>(null);

  const emailOk = email.trim().length > 0 && email.includes("@");
  const passwordOk = password.length > 0;
  const canSubmitLogin = !loading && emailOk && passwordOk;
  const canSubmitForgot = !loading && emailOk;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (mode === "forgot") {
      await handleForgotPassword();
      return;
    }
    if (!canSubmitLogin) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (signInError) {
      const msg = signInError.message.toLowerCase();
      if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
        setError("Correo o contraseña incorrectos.");
      } else if (msg.includes("email not confirmed")) {
        setError("Confirma tu correo antes de entrar.");
      } else {
        setError(signInError.message);
      }
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleForgotPassword() {
    if (!canSubmitForgot) {
      setError("Introduce tu correo electrónico.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: `${origin}/auth/callback?next=/login` },
    );

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage("Te hemos enviado un enlace para restablecer la contraseña.");
  }

  function enterForgotMode() {
    setMode("forgot");
    setError(null);
    setMessage(null);
  }

  function exitForgotMode() {
    setMode("login");
    setError(null);
    setMessage(null);
  }

  return (
    <>
      <div className="shrink-0">
        <SiteHeader
          user={null}
          variant={mode === "forgot" ? "forgot" : "login"}
          onLoginClick={mode === "forgot" ? exitForgotMode : undefined}
        />
      </div>

      <form
        onSubmit={handleSubmit}
        className="relative flex h-full min-h-0 flex-1 flex-col"
      >
        {mode === "forgot" ? (
          <div className="relative flex flex-1 flex-col items-center px-[18px]">
            <div className="absolute left-1/2 top-[38%] flex w-full max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-8">
              <p className="text-center text-[18px] font-normal tracking-wide text-white/[0.72]">
                Ingresa tu email y te enviaremos un enlace para restablecer tu
                contraseña.
              </p>

              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="correo electrónico"
                className={fieldClassName}
                aria-label="correo electrónico"
                autoFocus
              />

              {error ? (
                <p className="text-center text-[16px] tracking-wide text-white/[0.72]">
                  {error}
                </p>
              ) : null}
              {message ? (
                <p className="text-center text-[16px] tracking-wide text-white/[0.72]">
                  {message}
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-[18px]">
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
              autoComplete="current-password"
            />

            {error ? (
              <p className="max-w-xl text-center text-[16px] tracking-wide text-white/[0.72]">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="max-w-xl text-center text-[16px] tracking-wide text-white/[0.72]">
                {message}
              </p>
            ) : null}
          </div>
        )}

        <div className="flex items-end justify-between px-[18px] pb-10 text-[20px] font-normal tracking-wide">
          {mode === "forgot" ? (
            <button
              type="button"
              onClick={exitForgotMode}
              disabled={loading}
              className="text-left text-white disabled:opacity-50"
            >
              volver
            </button>
          ) : (
            <button
              type="button"
              onClick={enterForgotMode}
              disabled={loading}
              className="text-left text-white disabled:opacity-50"
            >
              ¿contraseña olvidada?
            </button>
          )}

          <button
            type="submit"
            disabled={mode === "forgot" ? !canSubmitForgot : !canSubmitLogin}
            className={
              (mode === "forgot" ? canSubmitForgot : canSubmitLogin)
                ? "text-white"
                : "cursor-default text-white/[0.72]"
            }
          >
            {loading ? "[...]" : "[Siguiente]"}
          </button>
        </div>
      </form>
    </>
  );
}
