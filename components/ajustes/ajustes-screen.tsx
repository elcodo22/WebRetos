"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const linkClass =
  "ui-btn-text cursor-pointer whitespace-nowrap font-normal leading-none tracking-wide text-white transition-opacity hover:opacity-80 disabled:opacity-50";

const closeClass =
  "ui-btn-text font-normal leading-none tracking-wide text-white transition-opacity hover:opacity-80";

export function AjustesScreen({
  isAdmin,
  closeHref,
}: {
  isAdmin: boolean;
  closeHref: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    if (busy) return;
    setBusy(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-black text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-end px-[var(--header-inset-x)] pt-[var(--header-inset-top)]">
        <Link href={closeHref} className={`pointer-events-auto ${closeClass}`}>
          [CERRAR]
        </Link>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-[var(--grid-margin)]">
        <Link href="/ajustes/editar" className={linkClass}>
          [EDITAR PERFIL]
        </Link>
        <button
          type="button"
          disabled={busy}
          className={linkClass}
          onClick={() => void signOut()}
        >
          [CERRAR SESIÓN]
        </button>
        {isAdmin ? (
          <Link href="/admin" className={linkClass}>
            [ADMIN]
          </Link>
        ) : null}
      </div>
    </div>
  );
}
