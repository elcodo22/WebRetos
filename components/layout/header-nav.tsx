"use client";

import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { ArchivosLink } from "@/components/layout/archivos-link";
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
    <nav className="flex items-center gap-2 whitespace-nowrap text-[clamp(12px,3.2vw,20px)] font-normal leading-none tracking-wide md:gap-4 md:text-[20px]">
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
          <ArchivosLink />
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
