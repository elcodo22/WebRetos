"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { ArchivosSearch } from "@/components/archivos/archivos-search";
import { perfilHref } from "@/lib/mocks/perfil";

type SiteHeaderVariant = "default" | "login" | "registro" | "forgot";

const navLinkClass =
  "ui-btn-text whitespace-nowrap font-normal leading-none tracking-wide";

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

  /* Home y resto: [HOME] izq · resto dcha (sin solaparse con el marco). */
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
