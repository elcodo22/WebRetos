"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { authCallbackUrl } from "@/lib/auth-urls";
import { PasswordLoupeField } from "@/components/auth/password-loupe-field";
import {
  authFieldClassName,
  authFieldSize,
} from "@/components/auth/auth-field";

const fieldClassName = authFieldClassName;

const OTP_LENGTH = 6;

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
  const [shakeTick, setShakeTick] = useState(0);
  const [shakeFields, setShakeFields] = useState<FieldKey[]>([]);
  const [otpDigits, setOtpDigits] = useState<string[]>(() =>
    Array.from({ length: OTP_LENGTH }, () => ""),
  );
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const lastTriedOtpRef = useRef<string | null>(null);
  const pendingProfileRef = useRef<{
    username: string;
    nombreCompleto: string;
  } | null>(null);

  const otpCode = otpDigits.join("");
  const otpComplete = otpCode.length === OTP_LENGTH && /^\d{6}$/.test(otpCode);

  function shake(fields: FieldKey[]) {
    setShakeFields([]);
    window.requestAnimationFrame(() => {
      setShakeFields(fields);
      setShakeTick((tick) => tick + 1);
    });
  }

  function clearFieldError(key: FieldKey) {
    setFormMessage(null);
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  const focusOtp = useCallback((index: number) => {
    const el = otpRefs.current[index];
    if (!el) return;
    el.focus();
    el.select();
  }, []);

  useEffect(() => {
    if (!pendingVerify) return;
    const t = window.setTimeout(() => focusOtp(0), 50);
    return () => window.clearTimeout(t);
  }, [pendingVerify, focusOtp]);

  function setOtpAt(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    lastTriedOtpRef.current = null;
    setOtpDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    setOtpError(null);
    if (digit && index < OTP_LENGTH - 1) focusOtp(index + 1);
  }

  function onOtpKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      event.preventDefault();
      setOtpAt(index - 1, "");
      focusOtp(index - 1);
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusOtp(index - 1);
    }
    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      event.preventDefault();
      focusOtp(index + 1);
    }
  }

  function onOtpPaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    if (!pasted) return;
    lastTriedOtpRef.current = null;
    const next = Array.from({ length: OTP_LENGTH }, (_, i) => pasted[i] ?? "");
    setOtpDigits(next);
    setOtpError(null);
    focusOtp(Math.min(pasted.length, OTP_LENGTH - 1));
  }

  async function finishAfterVerify(userId: string) {
    const pending = pendingProfileRef.current;
    if (!pending) {
      router.push("/");
      router.refresh();
      return;
    }

    const supabase = createClient();
    const { error: perfilError } = await supabase.from("perfiles").upsert({
      id: userId,
      nombre_usuario: pending.username,
      nombre_completo: pending.nombreCompleto,
    });

    if (perfilError && perfilError.code !== "23505") {
      setOtpError(perfilError.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleVerifyOtp(code: string) {
    if (otpLoading) return;
    if (code.length !== OTP_LENGTH || !/^\d{6}$/.test(code)) return;

    setOtpLoading(true);
    setOtpError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code,
      type: "signup",
    });

    if (error) {
      setOtpLoading(false);
      const msg = error.message.toLowerCase();
      if (msg.includes("expired") || msg.includes("otp_expired")) {
        setOtpError("El código ha caducado. Vuelve a registrarte o reenvía.");
      } else if (
        msg.includes("invalid") ||
        msg.includes("token") ||
        msg.includes("otp")
      ) {
        setOtpError("Código incorrecto. Revisa el correo e inténtalo de nuevo.");
      } else {
        setOtpError(error.message);
      }
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      setOtpLoading(false);
      setOtpError("No se pudo verificar la cuenta.");
      return;
    }

    await finishAfterVerify(userId);
    setOtpLoading(false);
  }

  useEffect(() => {
    if (!pendingVerify || !otpComplete || otpLoading) return;
    if (lastTriedOtpRef.current === otpCode) return;
    lastTriedOtpRef.current = otpCode;
    void handleVerifyOtp(otpCode);
    // Solo al completar los 6 dígitos (una vez por código)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpComplete, otpCode, pendingVerify, otpLoading]);

  async function handleResendCode() {
    if (otpLoading) return;
    setOtpLoading(true);
    setOtpError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: authCallbackUrl() },
    });

    setOtpLoading(false);
    if (error) {
      setOtpError(error.message);
      return;
    }
    lastTriedOtpRef.current = null;
    setOtpDigits(Array.from({ length: OTP_LENGTH }, () => ""));
    setOtpError(null);
    focusOtp(0);
  }

  async function handleSiguiente(event: FormEvent) {
    event.preventDefault();
    if (loading || pendingVerify) return;

    const username = normalizeUsername(nombreUsuario);
    const invalid: FieldKey[] = [];
    if (!nombre.trim()) invalid.push("nombre");
    if (!nombreUsuario.trim()) invalid.push("nombreUsuario");
    if (!email.trim()) invalid.push("email");
    if (!password) invalid.push("password");
    if (!password2) invalid.push("password2");

    if (invalid.length > 0) {
      shake(invalid);
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
      shake(Object.keys(errors) as FieldKey[]);
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
      shake(["nombreUsuario"]);
      return;
    }
    if (existing) {
      setLoading(false);
      setFieldErrors({
        nombreUsuario: "Ese nombre de usuario ya está en uso.",
      });
      shake(["nombreUsuario"]);
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
        shake(["email"]);
      } else if (msg.includes("weak_password") || msg.includes("characters")) {
        setFieldErrors({
          password:
            "La contraseña debe tener mínimo 6 caracteres, con mayúscula, minúscula y número.",
        });
        shake(["password"]);
      } else if (
        msg.includes("confirmation email") ||
        msg.includes("sending confirmation") ||
        msg.includes("smtp") ||
        msg.includes("error sending") ||
        msg.includes("error sending confirmation")
      ) {
        setFormMessage(
          "No se pudo enviar el correo de verificación (SMTP/Resend). Revisa Auth → SMTP en Supabase.",
        );
        setFieldErrors({ email: signUpError.message });
        shake(["email"]);
      } else if (
        msg.includes("database") ||
        msg.includes("trigger") ||
        msg.includes("perfil")
      ) {
        setFormMessage(
          "Error al crear el perfil en la base de datos. Revisa Logs en Supabase.",
        );
        setFieldErrors({ email: signUpError.message });
        shake(["email"]);
      } else if (msg.includes("email") && msg.includes("invalid")) {
        setFieldErrors({ email: "Introduce un correo electrónico válido." });
        shake(["email"]);
      } else {
        setFormMessage(signUpError.message);
        setFieldErrors({ email: signUpError.message });
        shake(["email"]);
      }
      return;
    }

    const identities = data.user?.identities ?? [];
    if (data.user && identities.length === 0) {
      setLoading(false);
      setFieldErrors({ email: "Ya existe una cuenta con ese correo." });
      shake(["email"]);
      return;
    }

    pendingProfileRef.current = { username, nombreCompleto };

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
          shake(["nombreUsuario"]);
        } else {
          setFieldErrors({ nombreUsuario: perfilError.message });
          shake(["nombreUsuario"]);
        }
        return;
      }

      setLoading(false);
      router.push("/");
      router.refresh();
      return;
    }

    setLoading(false);
    setOtpDigits(Array.from({ length: OTP_LENGTH }, () => ""));
    setOtpError(null);
    setPendingVerify(true);
  }

  const bottomMessage = formMessage ?? firstErrorMessage(fieldErrors);

  if (pendingVerify) {
    return (
      <div className="relative flex h-full min-h-0 flex-1 flex-col">
        {/* Header movil: [Cerrar] arriba */}
        <div className="flex shrink-0 items-center justify-start px-[var(--grid-margin)] pt-[max(0.75rem,var(--safe-top))] pb-2 text-[18px] font-normal tracking-wide md:hidden">
          <Link href="/" className="text-white">
            [Cerrar]
          </Link>
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 overflow-y-auto scrollbar-none px-[18px] py-6 text-center">
          <p className="max-w-xl text-[20px] font-normal tracking-wide text-white/[0.72]">
            Te hemos enviado un código a{" "}
            <span className="text-white">{email.trim()}</span>. Introduce los 6
            dígitos.
          </p>

          <div
            className="flex items-center justify-center gap-2 sm:gap-3"
            role="group"
            aria-label="Código de verificación de 6 dígitos"
          >
            {otpDigits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  otpRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                maxLength={1}
                value={digit}
                disabled={otpLoading}
                onChange={(event) => setOtpAt(index, event.target.value)}
                onKeyDown={(event) => onOtpKeyDown(index, event)}
                onPaste={onOtpPaste}
                onFocus={(event) => event.currentTarget.select()}
                aria-label={`Dígito ${index + 1} de ${OTP_LENGTH}`}
                className="h-12 w-10 border border-white bg-transparent text-center text-[30px] font-normal tracking-wide text-white outline-none disabled:opacity-60 sm:h-14 sm:w-12 sm:text-[35px]"
              />
            ))}
          </div>

          <p
            className="min-h-[24px] max-w-xl text-[20px] tracking-wide text-white"
            role={otpError ? "alert" : undefined}
          >
            {otpLoading && !otpError
              ? "verificando…"
              : (otpError ?? "\u00A0")}
          </p>
        </div>

        <div className="flex items-end justify-start px-[18px] pb-10 text-[25px] font-normal tracking-wide">
          <button
            type="button"
            disabled={otpLoading}
            onClick={() => void handleResendCode()}
            className={
              otpLoading ? "cursor-default text-white/[0.72]" : "text-white"
            }
          >
            reenviar código
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
      {/* Header movil: [Cerrar] arriba */}
      <div className="flex shrink-0 items-center justify-start px-[var(--grid-margin)] pt-[max(0.75rem,var(--safe-top))] pb-2 text-[18px] font-normal tracking-wide md:hidden">
        <Link href="/" className="text-white">
          [Cerrar]
        </Link>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 overflow-y-auto scrollbar-none px-[18px] py-6">
        <input
          key={`nombre-${shakeTick}`}
          type="text"
          autoComplete="name"
          value={nombre}
          size={authFieldSize(nombre, "Nombre")}
          onChange={(event) => {
            setNombre(event.target.value);
            clearFieldError("nombre");
          }}
          placeholder="Nombre"
          className={`${fieldClassName}${
            shakeFields.includes("nombre") ? " field-shake" : ""
          }`}
          aria-label="nombre"
          aria-invalid={Boolean(fieldErrors.nombre)}
        />

        <input
          key={`nombreUsuario-${shakeTick}`}
          type="text"
          autoComplete="username"
          value={nombreUsuario}
          size={authFieldSize(nombreUsuario, "Nombre de usuario")}
          onChange={(event) => {
            setNombreUsuario(event.target.value);
            clearFieldError("nombreUsuario");
          }}
          placeholder="Nombre de usuario"
          className={`${fieldClassName}${
            shakeFields.includes("nombreUsuario") ? " field-shake" : ""
          }`}
          aria-label="nombre de usuario"
          aria-invalid={Boolean(fieldErrors.nombreUsuario)}
        />

        <input
          key={`email-${shakeTick}`}
          type="email"
          autoComplete="email"
          value={email}
          size={authFieldSize(email, "Correo electrónico")}
          onChange={(event) => {
            setEmail(event.target.value);
            clearFieldError("email");
          }}
          placeholder="Correo electrónico"
          className={`${fieldClassName}${
            shakeFields.includes("email") ? " field-shake" : ""
          }`}
          aria-label="correo electrónico"
          aria-invalid={Boolean(fieldErrors.email)}
        />

        <PasswordLoupeField
          key={`password-${shakeTick}`}
          value={password}
          onChange={(value) => {
            setPassword(value);
            clearFieldError("password");
          }}
          className={fieldClassName}
          placeholder="Contraseña"
          autoComplete="new-password"
          aria-label="contraseña"
          required={false}
          shake={shakeFields.includes("password")}
        />

        <PasswordLoupeField
          key={`password2-${shakeTick}`}
          value={password2}
          onChange={(value) => {
            setPassword2(value);
            clearFieldError("password2");
          }}
          className={fieldClassName}
          placeholder="Repetir contraseña"
          autoComplete="new-password"
          aria-label="repetir contraseña"
          required={false}
          shake={shakeFields.includes("password2")}
        />
      </div>

      <div className="flex flex-col gap-4 px-[18px] pb-4 md:pb-10">
        <p
          className="min-h-[24px] text-center text-[16px] tracking-wide text-white md:text-[20px]"
          role={bottomMessage ? "alert" : undefined}
        >
          {bottomMessage ?? "\u00A0"}
        </p>
        <div className="flex items-end justify-end text-[16px] font-normal tracking-wide md:text-[25px]">
          <button
            type="submit"
            disabled={loading}
            className={
              loading ? "cursor-default text-white/[0.72]" : "text-white"
            }
          >
            {loading ? "[...]" : "[SIGUIENTE]"}
          </button>
        </div>
      </div>

      {/* Footer movil */}
      <div className="flex flex-col items-center gap-1 pb-[max(1.5rem,var(--safe-bottom))] text-center text-white md:hidden">
        <p className="text-[16px] font-normal tracking-wide">
          ¿ya tienes cuenta?
        </p>
        <Link
          href="/login"
          className="text-[20px] font-normal tracking-wide"
        >
          [Login]
        </Link>
      </div>
    </form>
  );
}
