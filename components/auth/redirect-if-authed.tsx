"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Si ya hay sesión, vuelve a home sin bloquear el primer paint. */
export function RedirectIfAuthed() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!cancelled && user) {
        router.replace("/");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
