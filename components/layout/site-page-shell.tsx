"use client";

import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import {
  SiteMobileChrome,
  type SiteMenuTone,
} from "@/components/layout/site-mobile-chrome";
import type { SiteHeaderVariant } from "@/components/layout/site-header";

type SitePageShellProps = {
  user: User | null;
  children: ReactNode;
  menuTone?: SiteMenuTone;
  variant?: SiteHeaderVariant;
  onLoginClick?: () => void;
  className?: string;
  desktopOverlay?: boolean;
  hideMenu?: boolean;
  showDesktopHeader?: boolean;
};

/** Layout estándar: header solo en desktop + [MENÚ] en móvil. */
export function SitePageShell({
  user,
  children,
  menuTone,
  variant = "default",
  onLoginClick,
  className,
  desktopOverlay = false,
  hideMenu = false,
  showDesktopHeader = true,
}: SitePageShellProps) {
  return (
    <div
      className={`relative flex h-full min-h-0 flex-col ${className ?? ""}`}
    >
      <SiteMobileChrome
        user={user}
        variant={variant}
        onLoginClick={onLoginClick}
        menuTone={menuTone}
        hideMenu={hideMenu}
        showDesktopHeader={showDesktopHeader}
        desktopOverlay={desktopOverlay}
      >
        {children}
      </SiteMobileChrome>
    </div>
  );
}
