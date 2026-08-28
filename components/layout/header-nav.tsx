"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { ArchivosSearch } from "@/components/archivos/archivos-search";
import { HOME_RESET_EVENT } from "@/components/layout/home-events";
import { perfilHref } from "@/lib/mocks/perfil";
import type { MouseEvent } from "react";

type SiteHeaderVariant = "default" | "login" | "registro" | "forgot";

const navLinkClass =
  "ui-btn-text whitespace-nowrap font-normal leading-none tracking-wide";

const navGroupClass =
  "flex flex-wrap items-center gap-6 md:gap-8";

function goHome(event: MouseEvent<HTMLAnchorElement>, pathname: string) {
  if (pathname !== "/") return;
  event.preventDefault();
  window.dispatchEvent(new Event(HOME_RESET_EVENT));
}

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
  const pathname = usePathname();
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
    const ownProfileHref = profileUsername
      ? perfilHref(profileUsername)
      : null;
    const pathSlug = pathname.startsWith("/u/")
      ? decodeURIComponent(pathname.slice(3)).toLowerCase()
      : "";
    const onOwnProfile =
      Boolean(profileUsername) &&
      pathSlug === profileUsername!.toLowerCase();

    return (
      <>
        {searchNode(layout === "stack" ? navLinkClass : itemClass)}
        {onOwnProfile ? (
          <Link href="/ajustes" className={itemClass}>
            [AJUSTES]
          </Link>
        ) : (
          <Link href={ownProfileHref ?? "/"} className={itemClass}>
            [PERFIL]
          </Link>
        )}
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
  center,
}: {
  user: User | null;
  variant: SiteHeaderVariant;
  profileUsername: string | null;
  onLoginClick?: () => void;
  layout?: "row" | "stack";
  center?: ReactNode;
}) {
  const pathname = usePathname();

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
        <Link
          href="/"
          className={`${navLinkClass} block w-full text-center`}
          onClick={(event) => goHome(event, pathname)}
        >
          [UNJAM]
        </Link>
        {navLinks}
      </nav>
    );
  }

  /* UNJAM · tiempo · links en la misma fila, alineados al centro vertical. */
  return (
    <nav
      className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-x-4 gap-y-2"
      aria-label="Navegación principal"
    >
      <div className="justify-self-start">
        <Link
          href="/"
          className={navLinkClass}
          onClick={(event) => goHome(event, pathname)}
        >
          [UNJAM]
        </Link>
      </div>
      {center ? (
        <div className="justify-self-center text-center [word-spacing:normal]">
          {center}
        </div>
      ) : (
        <div aria-hidden className="justify-self-center" />
      )}
      <div className={`${navGroupClass} justify-self-end justify-end`}>
        {navLinks}
      </div>
    </nav>
  );
}
