"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { User } from "@supabase/supabase-js";
import { ArchivosLink } from "@/components/layout/archivos-link";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { ArchivosSearch } from "@/components/archivos/archivos-search";
import { createClient } from "@/lib/supabase/client";
import { perfilHref } from "@/lib/mocks/perfil";

type SiteHeaderVariant = "default" | "login" | "registro" | "forgot";

function menuBackdropColor(pathname: string) {
  if (pathname.startsWith("/reto/") || pathname.startsWith("/u/")) {
    return "#000000";
  }
  return "var(--background)";
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
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [anchor, setAnchor] = useState({ top: 0, right: 0 });
  const menuId = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const close = useCallback(() => {
    setOpen(false);
    setBusy(false);
  }, []);

  const updateAnchor = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setAnchor({
      top: rect.top,
      right: window.innerWidth - rect.right,
    });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    close();
  }, [pathname, close]);

  useLayoutEffect(() => {
    if (!open) return;
    updateAnchor();
  }, [open, updateAnchor]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    function onResize() {
      if (window.innerWidth >= 768) {
        close();
        return;
      }
      updateAnchor();
    }

    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, [open, close, updateAnchor]);

  async function goTo(href: string) {
    if (busy) return;
    close();
    if (pathname === href) return;
    setBusy(true);
    router.push(href);
    router.refresh();
  }

  async function goToProfile() {
    if (busy || !profileUsername) return;
    const href = perfilHref(profileUsername);
    window.dispatchEvent(new Event("perfil-go-home"));
    close();
    if (pathname === href) return;
    setBusy(true);
    router.push(href);
    router.refresh();
  }

  async function signOut() {
    if (busy) return;
    setBusy(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    close();
    router.push("/");
    router.refresh();
  }

  const desktopLinks = (
    <>
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
    </>
  );

  const mobileItems: ReactNode[] = [];

  if (variant === "login") {
    mobileItems.push(
      <MobileItem key="registro" onClick={close}>
        <Link href="/registro">[Registro]</Link>
      </MobileItem>,
    );
  } else if (variant === "registro") {
    mobileItems.push(
      <MobileItem key="login" onClick={close}>
        <Link href="/login">[Login]</Link>
      </MobileItem>,
    );
  } else if (variant === "forgot") {
    mobileItems.push(
      <MobileItem key="login" onClick={close}>
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
      </MobileItem>,
      <MobileItem key="registro" onClick={close}>
        <Link href="/registro">[Registro]</Link>
      </MobileItem>,
    );
  } else {
    mobileItems.push(
      <MobileItem key="archivos" onClick={close}>
        <ArchivosLink />
      </MobileItem>,
    );
    if (user) {
      mobileItems.push(
        <MobileItem key="perfil">
          <button
            type="button"
            disabled={busy}
            className="cursor-pointer disabled:opacity-50"
            onClick={() => void goToProfile()}
          >
            [ver perfil]
          </button>
        </MobileItem>,
        <MobileItem key="ajustes">
          <button
            type="button"
            disabled={busy}
            className="cursor-pointer disabled:opacity-50"
            onClick={() => void goTo("/ajustes")}
          >
            [ajustes]
          </button>
        </MobileItem>,
        <MobileItem key="logout">
          <button
            type="button"
            disabled={busy}
            className="cursor-pointer disabled:opacity-50"
            onClick={() => void signOut()}
          >
            [cerrar sesión]
          </button>
        </MobileItem>,
      );
    } else {
      mobileItems.push(
        <MobileItem key="login" onClick={close}>
          <Link href="/login">[Login]</Link>
        </MobileItem>,
        <MobileItem key="registro" onClick={close}>
          <Link href="/registro">[Registro]</Link>
        </MobileItem>,
      );
    }
  }

  const showMobileSearch = variant === "default";
  const backdrop = menuBackdropColor(pathname);

  const overlay =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[9999] md:hidden" role="presentation">
            <button
              type="button"
              aria-label="Cerrar menú"
              className="absolute inset-0 cursor-default"
              style={{ background: backdrop }}
              onClick={close}
            />

            <div
              className="absolute flex flex-col items-end gap-4 text-[20px] font-normal leading-none tracking-wide text-white"
              style={{
                top: anchor.top,
                right: anchor.right,
              }}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="inline-flex items-center justify-center p-1"
                aria-label="Cerrar menú"
                aria-expanded
                aria-controls={menuId}
                onClick={close}
              >
                <CloseIcon />
              </button>

              <ul
                id={menuId}
                role="menu"
                className="m-0 flex list-none flex-col items-end gap-4 p-0"
              >
                {mobileItems}
              </ul>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative z-20 shrink-0">
      <nav className="hidden items-center gap-4 text-[20px] font-normal leading-none md:flex">
        {desktopLinks}
      </nav>

      <div className="flex items-center gap-3 md:hidden">
        {showMobileSearch ? <ArchivosSearch /> : null}
        <button
          ref={btnRef}
          type="button"
          className={`inline-flex items-center justify-center p-1${open ? " invisible" : ""}`}
          aria-label="Abrir menú"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => {
            updateAnchor();
            setOpen(true);
          }}
        >
          <HamburgerIcon />
        </button>
      </div>

      {overlay}
    </div>
  );
}

function MobileItem({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <li role="none" className="flex items-center justify-end" onClick={onClick}>
      {children}
    </li>
  );
}

function HamburgerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      style={{ shapeRendering: "crispEdges" }}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      style={{ shapeRendering: "crispEdges" }}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M5 5h2v2H5V5zm2 2h2v2H7V7zm2 2h2v2H9V9zm2 2h2v2h-2v-2zm2 2h2v2h-2v-2zm2 2h2v2h-2v-2zm2 2h2v2h-2v-2zM5 17h2v2H5v-2zm2-2h2v2H7v-2zm2-2h2v2H9v-2zm2-2h2v2h-2v-2zm2-2h2v2h-2V9zm2-2h2v2h-2V7zm2-2h2v2h-2V5z"
      />
    </svg>
  );
}
