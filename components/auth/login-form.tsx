"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { authCallbackUrl } from "@/lib/auth-urls";
import { PasswordLoupeField } from "@/components/auth/password-loupe-field";
import {
  authFieldClassName,
  authFieldSize,
} from "@/components/auth/auth-field";
import { SiteMobileChrome } from "@/components/layout/site-mobile-chrome";
import { AuthMobileTopNav } from "@/components/auth/auth-mobile-top-nav";

const fieldClassName = authFieldClassName;

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
  const [forgotSent, setForgotSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [shakeTick, setShakeTick] = useState(0);
  const [shakeFields, setShakeFields] = useState<Array<"email" | "password">>(
    [],
  );

  const emailOk = email.trim().length > 0 && email.includes("@");
  const passwordOk = password.length > 0;
  const canSubmitForgot = !loading && !forgotSent;

  function shake(fields: Array<"email" | "password">) {
    setShakeFields([]);
    window.requestAnimationFrame(() => {
      setShakeFields(fields);
      setShakeTick((tick) => tick + 1);
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (mode === "forgot") {
      await handleForgotPassword();
      return;
    }

    const invalid: Array<"email" | "password"> = [];
    if (!emailOk) invalid.push("email");
    if (!passwordOk) invalid.push("password");
    if (invalid.length > 0) {
      shake(invalid);
      return;
    }

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
        shake(["email", "password"]);
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
    if (forgotSent || loading) return;
    if (!emailOk) {
      shake(["email"]);
      setError("Introduce tu correo electrónico.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: authCallbackUrl("/login") },
    );

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSentEmail(email.trim());
    setForgotSent(true);
    setMessage(null);
  }

  function enterForgotMode() {
    setMode("forgot");
    setForgotSent(false);
    setSentEmail("");
    setError(null);
    setMessage(null);
  }

  function exitForgotMode() {
    setMode("login");
    setForgotSent(false);
    setSentEmail("");
    setError(null);
    setMessage(null);
  }

  return (
    <SiteMobileChrome
      user={null}
      variant={mode === "forgot" ? "forgot" : "login"}
      onLoginClick={mode === "forgot" ? exitForgotMode : undefined}
      hideMenu
    >
      <AuthMobileTopNav
        oppositeLabel={mode === "forgot" ? "[LOGIN]" : "[REGISTRO]"}
        oppositeHref={mode === "forgot" ? undefined : "/registro"}
        onOppositeClick={mode === "forgot" ? exitForgotMode : undefined}
      />
      <form
        onSubmit={handleSubmit}
        noValidate
        className="relative flex h-full min-h-0 flex-1 flex-col"
      >
        {mode === "forgot" ? (
          <div className="relative flex flex-1 flex-col items-center px-[18px]">
            <div className="absolute left-1/2 top-[38%] flex w-full max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-8">
              {forgotSent ? (
                <p className="text-center text-[16px] font-normal tracking-wide text-white">
                  Se ha enviado un enlace a {sentEmail} para restablecer tu
                  contraseña.
                </p>
              ) : (
                <>
                  <p className="text-center text-[16px] font-normal tracking-wide text-white">
                    Ingresa tu email y te enviaremos un enlace para restablecer
                    tu contraseña.
                  </p>

                  <input
                    key={`forgot-email-${shakeTick}`}
                    type="email"
                    autoComplete="email"
                    value={email}
                    size={authFieldSize(email, "Correo electrónico")}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Correo electrónico"
                    className={`${fieldClassName}${
                      shakeFields.includes("email") ? " field-shake" : ""
                    }`}
                    aria-label="correo electrónico"
                    autoFocus
                  />

                  {error ? (
                    <p className="text-center text-[15px] tracking-wide text-white/[0.72]">
                      {error}
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-[18px]">
            <input
              key={`login-email-${shakeTick}`}
              type="email"
              autoComplete="email"
              value={email}
              size={authFieldSize(email, "Correo electrónico")}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Correo electrónico"
              className={`${fieldClassName}${
                shakeFields.includes("email") ? " field-shake" : ""
              }`}
              aria-label="correo electrónico"
            />

            <PasswordLoupeField
              key={`login-password-${shakeTick}`}
              value={password}
              onChange={setPassword}
              className={fieldClassName}
              autoComplete="current-password"
              required={false}
              shake={shakeFields.includes("password")}
            />

            {error ? (
              <p className="max-w-xl text-center text-[15px] tracking-wide text-white/[0.72]">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="max-w-xl text-center text-[15px] tracking-wide text-white/[0.72]">
                {message}
              </p>
            ) : null}
          </div>
        )}

        <div className="flex items-end justify-between px-[18px] pb-[max(1rem,var(--safe-bottom))] font-normal md:pb-10">
          {mode === "forgot" ? (
            <button
              type="button"
              onClick={exitForgotMode}
              disabled={loading}
              className="text-left ui-btn-text font-normal leading-snug tracking-normal text-white disabled:opacity-50"
            >
              volver
            </button>
          ) : (
            <button
              type="button"
              onClick={enterForgotMode}
              disabled={loading}
              className="text-left ui-btn-text font-normal leading-snug tracking-normal text-white disabled:opacity-50"
            >
              ¿contraseña olvidada?
            </button>
          )}

          {mode === "forgot" && forgotSent ? null : (
            <button
              type="submit"
              disabled={loading || (mode === "forgot" && !canSubmitForgot)}
              className={`ui-btn-text font-normal tracking-wide ${
                loading ? "cursor-default text-white/[0.72]" : "text-white"
              }`}
            >
              {loading ? "[...]" : "[SIGUIENTE]"}
            </button>
          )}
        </div>
      </form>
    </SiteMobileChrome>
  );
}
