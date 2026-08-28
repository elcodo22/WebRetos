"use client";

import type { ComponentProps } from "react";
import { useHeaderCenter } from "@/components/layout/header-time";
import { SiteHeader } from "@/components/layout/site-header";

type SiteHeaderWithTimeProps = Omit<ComponentProps<typeof SiteHeader>, "center"> & {
  center?: ComponentProps<typeof SiteHeader>["center"];
};

/** Header del sitio con el contador centrado si hay reto activo. */
export function SiteHeaderWithTime({
  center,
  ...props
}: SiteHeaderWithTimeProps) {
  const resolvedCenter = useHeaderCenter(center);
  return <SiteHeader {...props} center={resolvedCenter} />;
}
