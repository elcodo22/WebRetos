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
  layout = "row",
}: {
  variant: SiteHeaderVariant;
  user: User | null;
  profileUsername: string | null;
  onLoginClick?: () => void;
  layout?: "row" | "stack";
}) {
  const itemClass =
    layout === "stack"
      ? `${navLinkClass} block w-full text-center`
      : navLinkClass;

  const searchNode = (className: string) => (
    <div
      className={layout === "stack" ? "flex w-full justify-center" : undefined}
    >
      <ArchivosSearch className={className} />
    </div>
  );

  if (variant === "login") {
    return <Link href="/registro" className={itemClass}>[REGISTRO]</Link>;
  }

  if (variant === "registro") {
    return <Link href="/login" className={itemClass}>[LOGIN]</Link>;
  }

  if (variant === "forgot") {
    return (
      <>
        {onLoginClick ? (
          <button
            type="button"
            onClick={onLoginClick}
            className={`cursor-pointer ${itemClass}`}
          >
            [LOGIN]
          </button>
        ) : (
          <Link href="/login" className={itemClass}>
            [LOGIN]
          </Link>
        )}
        <Link href="/registro" className={itemClass}>
          [REGISTRO]
        </Link>
      </>
    );
  }

  if (user) {
    return (
      <>
        {searchNode(layout === "stack" ? navLinkClass : itemClass)}
        <div className={layout === "stack" ? "flex w-full justify-center" : undefined}>
          <ProfileMenu username={profileUsername} />
        </div>
      </>
    );
  }

  return (
    <>
      {searchNode(layout === "stack" ? navLinkClass : itemClass)}
      <Link href="/login" className={itemClass}>
        [LOGIN]
      </Link>
      <Link href="/registro" className={itemClass}>
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
  layout = "row",
}: {
  user: User | null;
  variant: SiteHeaderVariant;
  profileUsername: string | null;
  onLoginClick?: () => void;
  layout?: "row" | "stack";
}) {
  const pathname = usePathname();
  const showHome = pathname !== "/";

  const navLinks = (
    <NavLinks
      variant={variant}
      user={user}
      profileUsername={profileUsername}
      onLoginClick={onLoginClick}
      layout={layout}
    />
  );

  if (layout === "stack") {
    return (
      <nav
        className="flex w-full max-w-xs flex-col items-center gap-8 text-center"
        aria-label="Navegación principal"
      >
        {showHome ? (
          <Link href="/" className={`${navLinkClass} block w-full text-center`}>
            [HOME]
          </Link>
        ) : null}
        {navLinks}
      </nav>
    );
  }

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
