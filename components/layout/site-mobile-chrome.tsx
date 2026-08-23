"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { usePathname } from "next/navigation";
import { useSearchOverlay } from "@/components/archivos/search-overlay-provider";
import { useDiccionario } from "@/components/diccionario/diccionario-provider";
import {
  SiteHeader,
  type SiteHeaderVariant,
} from "@/components/layout/site-header";

export type SiteMenuTone = "blue" | "white" | "black";

/** Tono del menú según la pantalla (fondo negro → menú negro). */
export function menuToneForPath(pathname: string): SiteMenuTone {
  if (pathname.startsWith("/reto/") || pathname.startsWith("/u/")) {
    return "black";
  }
  return "blue";
}

type SiteMobileMenuProps = {
  user: User | null;
  variant?: SiteHeaderVariant;
  onLoginClick?: () => void;
  center?: ReactNode;
  menuTone?: SiteMenuTone;
  hideMenu?: boolean;
  zIndex?: number;
  menuOpen?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
};

const toneStyles: Record<
  SiteMenuTone,
  { button: string; overlay: string }
> = {
  blue: {
    button: "text-white",
    overlay: "bg-[var(--background)] text-white",
  },
  white: {
    button: "text-[var(--background)]",
    overlay: "bg-white text-[var(--background)]",
  },
  black: {
    button: "text-white",
    overlay: "bg-black text-white",
  },
};

/** Botón [MENÚ] + overlay a pantalla completa (solo móvil). */
export function SiteMobileMenu({
  user,
  variant = "default",
  onLoginClick,
  center,
  menuTone: menuToneProp,
  hideMenu = false,
  zIndex = 72,
  menuOpen: menuOpenProp,
  onMenuOpenChange,
}: SiteMobileMenuProps) {
  const pathname = usePathname();
  const menuTone = menuToneProp ?? menuToneForPath(pathname);
  const [menuOpenInternal, setMenuOpenInternal] = useState(false);
  const menuOpen = menuOpenProp ?? menuOpenInternal;
  const setMenuOpen = onMenuOpenChange ?? setMenuOpenInternal;

  const { isOpen: searchOpen } = useSearchOverlay();
  const { isOpen: diccionarioOpen } = useDiccionario();
  const styles = toneStyles[menuTone];

  useEffect(() => {
    if (searchOpen || diccionarioOpen || hideMenu) {
      setMenuOpen(false);
    }
  }, [searchOpen, diccionarioOpen, hideMenu, setMenuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, setMenuOpen]);

  const showMenuButton =
    !hideMenu && !menuOpen && !searchOpen && !diccionarioOpen;

  return (
    <>
      {showMenuButton ? (
        <button
          type="button"
          className={`fixed inset-x-0 bottom-0 flex justify-center px-[var(--grid-margin)] pb-[max(1.25rem,calc(var(--safe-bottom)+0.5rem))] text-[20px] font-normal tracking-wide md:hidden ${styles.button}`}
          style={{ zIndex }}
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menú"
        >
          [MENÚ]
        </button>
      ) : null}

      {menuOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menú"
          className={`fixed inset-0 flex flex-col items-center justify-center md:hidden ${styles.overlay}`}
          style={{ zIndex: zIndex + 3 }}
        >
          <div
            className="flex w-full flex-1 flex-col items-center justify-center px-[var(--grid-margin)]"
            onClick={(event) => {
              const link = (event.target as Element).closest("a[href]");
              if (link) setMenuOpen(false);
            }}
          >
            <SiteHeader
              user={user}
              variant={variant}
              onLoginClick={onLoginClick}
              center={center}
              navLayout="stack"
            />
          </div>
          <div className="flex w-full shrink-0 justify-center px-[var(--grid-margin)] pb-[max(1.25rem,calc(var(--safe-bottom)+0.5rem))]">
            <button
              type="button"
              className="text-[20px] font-normal tracking-wide"
              onClick={() => setMenuOpen(false)}
              aria-label="Cerrar menú"
            >
              [CERRAR]
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

type SiteMobileChromeProps = SiteMobileMenuProps & {
  showDesktopHeader?: boolean;
  /** Header desktop absoluto sobre el contenido (perfil, reto). */
  desktopOverlay?: boolean;
  children?: ReactNode;
};

/** Header desktop + menú móvil + ocultar contenido al abrir menú. */
export function SiteMobileChrome({
  user,
  variant = "default",
  onLoginClick,
  center,
  menuTone: menuToneProp,
  hideMenu = false,
  showDesktopHeader = true,
  desktopOverlay = false,
  zIndex = 72,
  menuOpen: menuOpenProp,
  onMenuOpenChange,
  children,
}: SiteMobileChromeProps) {
  const pathname = usePathname();
  const menuTone = menuToneProp ?? menuToneForPath(pathname);
  const [menuOpenInternal, setMenuOpenInternal] = useState(false);
  const menuOpen = menuOpenProp ?? menuOpenInternal;

  const desktopHeader = showDesktopHeader ? (
    <SiteHeader
      user={user}
      variant={variant}
      onLoginClick={onLoginClick}
      center={center}
    />
  ) : null;

  return (
    <>
      {desktopHeader ? (
        desktopOverlay ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-50 hidden bg-transparent md:block">
            <div className="pointer-events-auto bg-transparent [&_header]:bg-transparent">
              {desktopHeader}
            </div>
          </div>
        ) : (
          <div className="hidden shrink-0 md:block">{desktopHeader}</div>
        )
      ) : null}

      <SiteMobileMenu
        user={user}
        variant={variant}
        onLoginClick={onLoginClick}
        center={center}
        menuTone={menuTone}
        hideMenu={hideMenu}
        zIndex={zIndex}
        menuOpen={menuOpen}
        onMenuOpenChange={onMenuOpenChange ?? setMenuOpenInternal}
      />

      {children ? (
        <div
          className={`flex min-h-0 flex-1 flex-col${
            menuOpen ? " max-md:pointer-events-none max-md:invisible" : ""
          }`}
        >
          {children}
        </div>
      ) : null}
    </>
  );
}
