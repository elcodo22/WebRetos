"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PasswordLoupeField } from "@/components/auth/password-loupe-field";

type Step = "email" | "code";

const OTP_LENGTH = 6;

const fieldClassName =
  "w-full max-w-xl bg-transparent text-center text-[24px] font-normal tracking-wide text-white outline-none placeholder:text-white/[0.72]";

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailOk = email.trim().length > 0 && email.includes("@");
  const passwordOk = password.trim().length > 0;
  const codeOk = code.length === OTP_LENGTH;

  const canSubmit =
    !loading && (step === "email" ? emailOk && passwordOk : emailOk && codeOk);

  async function handleSiguiente(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();

    if (step === "email") {
      const { error: sendError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });

      setLoading(false);

      if (sendError) {
        const msg = sendError.message.toLowerCase().includes("confirmation email")
          ? "No se pudo enviar el email. Revisa la configuración SMTP en Supabase."
          : sendError.message;
        setError(msg);
        return;
      }

      setStep("code");
      return;
    }

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code,
      type: "email",
    });

    setLoading(false);

    if (verifyError) {
      setError(verifyError.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleReenviar() {
    if (!emailOk) {
      setError("Introduce primero tu correo electrónico.");
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });

    setLoading(false);

    if (sendError) {
      setError(sendError.message);
      return;
    }

    setStep("code");
    setCode("");
  }

  return (
    <form
      onSubmit={handleSiguiente}
      className="relative flex h-full min-h-0 flex-1 flex-col"
    >
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

        {step === "email" ? (
          <PasswordLoupeField
            value={password}
            onChange={setPassword}
            className={fieldClassName}
          />
        ) : (
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={OTP_LENGTH}
            required
            autoComplete="one-time-code"
            value={code}
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))
            }
            placeholder="código"
            className={fieldClassName}
            aria-label="código"
            autoFocus
          />
        )}

        {error && (
          <p className="max-w-xl text-center text-[16px] tracking-wide text-white/[0.72]">
            {error}
          </p>
        )}
      </div>

      <div className="flex items-end justify-between px-[18px] pb-10 text-[20px] font-normal tracking-wide">
        <button
          type="button"
          onClick={handleReenviar}
          disabled={loading}
          className="text-left text-white disabled:opacity-50"
        >
          ¿contraseña olvidada?
        </button>

        <button
          type="submit"
          disabled={!canSubmit}
          className={
            canSubmit
              ? "text-white"
              : "cursor-default text-white/[0.72]"
          }
        >
          {loading ? "[...]" : "[Siguiente]"}
        </button>
      </div>
    </form>
  );
}
