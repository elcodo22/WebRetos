"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { perfilHref } from "@/lib/mocks/perfil";

function menuBackdropColor(pathname: string) {
  if (pathname.startsWith("/reto/") || pathname.startsWith("/u/")) {
    return "#000000";
  }
  return "var(--background)";
}

function pathsMatch(pathname: string, href: string) {
  const target = decodeURIComponent(href.split("?")[0] || "");
  return pathname === target || decodeURIComponent(pathname) === target;
}

export function ProfileMenu({ username }: { username: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [anchor, setAnchor] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const pathWhenOpened = useRef(pathname);

  const close = useCallback(() => {
    setBusy(false);
    setOpen(false);
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

  useLayoutEffect(() => {
    if (!open) return;
    updateAnchor();
  }, [open, updateAnchor]);

  useEffect(() => {
    if (!open) return;
    if (pathname !== pathWhenOpened.current) close();
  }, [pathname, open, close]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    function onResize() {
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
    if (pathsMatch(pathname, href)) {
      close();
      return;
    }
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

  const profileHref = username ? perfilHref(username) : "/";
  const backdrop = menuBackdropColor(pathname);

  function goToProfile() {
    if (busy) return;
    // Cierra overlays (p. ej. Guardados) y navega al perfil propio.
    window.dispatchEvent(new Event("perfil-go-home"));
    if (pathsMatch(pathname, profileHref)) {
      close();
      return;
    }
    setBusy(true);
    router.push(profileHref);
    router.refresh();
  }

  const overlay =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[9999]" role="presentation">
            <div
              role="button"
              tabIndex={0}
              aria-label="Cerrar menú de perfil"
              className="absolute inset-0 cursor-default"
              style={{ background: backdrop }}
              onClick={close}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") close();
              }}
            />

            <div
              className="absolute flex flex-col items-end gap-3 text-[25px] font-normal leading-none tracking-wide text-white"
              style={{ top: anchor.top, right: anchor.right }}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="inline-flex items-center"
                aria-label="Cerrar menú de perfil"
                aria-expanded
                aria-controls={menuId}
                onClick={close}
              >
                <ProfilePixelCircle />
              </button>

              <div
                id={menuId}
                role="menu"
                className="mt-1 flex flex-col items-end gap-3"
              >
                <button
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  className="cursor-pointer whitespace-nowrap text-white disabled:opacity-50"
                  onClick={() => goToProfile()}
                >
                  [ver perfil]
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  className="cursor-pointer whitespace-nowrap text-white disabled:opacity-50"
                  onClick={() => goTo("/ajustes")}
                >
                  [ajustes]
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  className="cursor-pointer whitespace-nowrap text-white disabled:opacity-50"
                  onClick={() => void signOut()}
                >
                  [cerrar sesión]
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`inline-flex items-center${open ? " invisible" : ""}`}
        aria-label="Menú de perfil"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => {
          pathWhenOpened.current = pathname;
          updateAnchor();
          setOpen(true);
        }}
      >
        <ProfilePixelCircle />
      </button>
      {overlay}
    </>
  );
}

function ProfilePixelCircle() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      className="h-[26px] w-[26px] md:h-[24px] md:w-[24px]"
      style={{ shapeRendering: "crispEdges" }}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M8 2h8v1H8V2zm-2 1h12v1H6V3zM5 4h14v1H5V4zM4 5h16v1H4V5zM3 6h18v2H3V6zm-1 2h20v8H2V8zm1 8h18v2H3v-2zm1 2h16v1H4v-1zm1 1h14v1H5v-1zm1 1h12v1H6v-1zm2 1h8v1H8v-1z"
      />
    </svg>
  );
}
