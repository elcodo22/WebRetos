"use client";

import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { HeaderNav } from "@/components/layout/header-nav";
import { slugUsername } from "@/lib/mocks/perfil";

type SiteHeaderVariant = "default" | "login" | "registro" | "forgot";

export type { SiteHeaderVariant };

function usernameFromUser(user: User) {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const raw =
    (typeof meta?.nombre_usuario === "string" && meta.nombre_usuario) ||
    (typeof meta?.username === "string" && meta.username) ||
    "";
  const slug = slugUsername(raw);
  if (slug) return slug;
  if (user.email) return slugUsername(user.email.split("@")[0] ?? "");
  return null;
}

export function SiteHeader({
  user,
  variant = "default",
  center,
  onLoginClick,
  navLayout = "row",
}: {
  user: User | null;
  /** @deprecated El temporizador está en el hero del home. */
  fechaFin?: string | null;
  variant?: SiteHeaderVariant;
  /** @deprecated */
  showCountdown?: boolean;
  /** Contenido centrado opcional (p. ej. contador en la fila del nav). */
  center?: ReactNode;
  /** Si se pasa en pantallas auth, [Login] llama a esto en lugar de navegar. */
  onLoginClick?: () => void;
  /** Disposición del nav: fila (header) o columna (menú móvil). */
  navLayout?: "row" | "stack";
}) {
  const profileUsername = user ? usernameFromUser(user) : null;
  const isStack = navLayout === "stack";

  return (
    <header
      className={`relative flex w-full flex-col bg-transparent text-current [background:transparent] ${
        isStack
          ? "items-center gap-0 px-0 pb-0 pt-0"
          : "px-[var(--header-inset-x)] pb-3 pt-[var(--header-inset-top)] md:pb-4"
      }`}
    >
      {isStack && center ? (
        <div className="z-10 mb-8 flex w-full justify-center text-center [word-spacing:normal]">
          {center}
        </div>
      ) : null}
      <HeaderNav
        user={user}
        variant={variant}
        profileUsername={profileUsername}
        onLoginClick={onLoginClick}
        layout={navLayout}
        center={isStack ? undefined : center}
      />
    </header>
  );
}
