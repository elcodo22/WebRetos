"use client";

import Link from "next/link";

const navLinkClass =
  "ui-btn-text font-normal leading-none tracking-wide text-white";

type AuthMobileTopNavProps = {
  oppositeLabel: string;
  oppositeHref?: string;
  onOppositeClick?: () => void;
};

/** Móvil auth: [HOME] arriba izquierda, enlace opuesto arriba derecha. */
export function AuthMobileTopNav({
  oppositeLabel,
  oppositeHref,
  onOppositeClick,
}: AuthMobileTopNavProps) {
  const opposite =
    onOppositeClick != null ? (
      <button
        type="button"
        onClick={onOppositeClick}
        className={navLinkClass}
      >
        {oppositeLabel}
      </button>
    ) : (
      <Link href={oppositeHref ?? "/"} className={navLinkClass}>
        {oppositeLabel}
      </Link>
    );

  return (
    <header className="flex shrink-0 items-center justify-between px-[var(--header-inset-x)] pt-[var(--header-inset-top)] pb-3 md:hidden">
      <Link href="/" className={navLinkClass}>
        [HOME]
      </Link>
      {opposite}
    </header>
  );
}
