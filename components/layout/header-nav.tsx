"use client";

import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { ArchivosSearch } from "@/components/archivos/archivos-search";

type SiteHeaderVariant = "default" | "login" | "registro" | "forgot";

export function HeaderNav({
  user,
  variant,
  profileUsername,
  onLoginClick,
}: {
  user: User | null;
  variant: SiteHeaderVariant;
  profileUsername: string | null;
  onLoginClick?: () => void;
}) {
  return (
    <nav className="flex items-center gap-2 whitespace-nowrap text-[clamp(15px,3.2vw,25px)] font-normal leading-none tracking-wide md:gap-4 md:text-[25px]">
      {variant === "login" && <Link href="/registro">[Registro]</Link>}
      {variant === "registro" && <Link href="/login">[Login]</Link>}
      {variant === "forgot" && (
        <>
          {onLoginClick ? (
            <button
              type="button"
              onClick={onLoginClick}
              className="cursor-pointer"
            >
              [Login]
            </button>
          ) : (
            <Link href="/login">[Login]</Link>
          )}
          <Link href="/registro">[Registro]</Link>
        </>
      )}
      {variant === "default" && (
        <>
          {user ? (
            <>
              <ArchivosSearch />
              <ProfileMenu username={profileUsername} />
            </>
          ) : (
            <>
              <Link href="/login">[Login]</Link>
              <Link href="/registro">[Registro]</Link>
              <ArchivosSearch />
            </>
          )}
        </>
      )}
    </nav>
  );
}
