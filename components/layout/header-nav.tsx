"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { ArchivosSearch } from "@/components/archivos/archivos-search";

type SiteHeaderVariant = "default" | "login" | "registro" | "forgot";

const navLinkClass =
  "whitespace-nowrap text-[clamp(18px,4.5vw,25px)] font-normal leading-none tracking-wide md:text-[25px]";

const navGroupClass =
  "flex flex-wrap items-center gap-6 md:gap-8";

function NavLinks({
  variant,
  user,
  profileUsername,
  onLoginClick,
}: {
  variant: SiteHeaderVariant;
  user: User | null;
  profileUsername: string | null;
  onLoginClick?: () => void;
}) {
  if (variant === "login") {
    return <Link href="/registro" className={navLinkClass}>[REGISTRO]</Link>;
  }

  if (variant === "registro") {
    return <Link href="/login" className={navLinkClass}>[LOGIN]</Link>;
  }

  if (variant === "forgot") {
    return (
      <>
        {onLoginClick ? (
          <button
            type="button"
            onClick={onLoginClick}
            className={`cursor-pointer ${navLinkClass}`}
          >
            [LOGIN]
          </button>
        ) : (
          <Link href="/login" className={navLinkClass}>
            [LOGIN]
          </Link>
        )}
        <Link href="/registro" className={navLinkClass}>
          [REGISTRO]
        </Link>
      </>
    );
  }

  if (user) {
    return (
      <>
        <ArchivosSearch className={navLinkClass} />
        <ProfileMenu username={profileUsername} />
      </>
    );
  }

  return (
    <>
      <ArchivosSearch className={navLinkClass} />
      <Link href="/login" className={navLinkClass}>
        [LOGIN]
      </Link>
      <Link href="/registro" className={navLinkClass}>
        [REGISTRO]
      </Link>
    </>
  );
}

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
  const pathname = usePathname();
  const showHome = pathname !== "/";

  const navLinks = (
    <NavLinks
      variant={variant}
      user={user}
      profileUsername={profileUsername}
      onLoginClick={onLoginClick}
    />
  );

  if (showHome) {
    return (
      <nav
        className={`${navGroupClass} w-full justify-between`}
        aria-label="Navegación principal"
      >
        <div className="shrink-0">
          <Link href="/" className={navLinkClass}>
            [HOME]
          </Link>
        </div>
        <div className={`${navGroupClass} justify-end`}>{navLinks}</div>
      </nav>
    );
  }

  return (
    <nav
      className={`${navGroupClass} justify-center`}
      aria-label="Navegación principal"
    >
      {navLinks}
    </nav>
  );
}
