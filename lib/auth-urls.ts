/**
 * Origen canónico de la app para enlaces de Auth (confirmación, recovery).
 * Prioriza NEXT_PUBLIC_SITE_URL (Vercel/local) para que el correo no caiga en localhost
 * por defecto de Supabase cuando el redirect no está en la allowlist.
 */
export function getAuthSiteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "http://localhost:3000";
}

/** URL absoluta del callback de Auth. */
export function authCallbackUrl(next?: string): string {
  const base = `${getAuthSiteOrigin()}/auth/callback`;
  if (!next) return base;
  const path = next.startsWith("/") ? next : `/${next}`;
  return `${base}?next=${encodeURIComponent(path)}`;
}
