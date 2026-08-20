/** Clases compartidas de campos auth: el ancho lo marca el texto, no un bloque largo. */
export const authFieldClassName =
  "max-w-[min(100%,36rem)] bg-transparent text-center text-[clamp(22px,4.5vw,30px)] font-normal tracking-wide text-white outline-none placeholder:text-white/[0.72] [field-sizing:content]";

/** Ancho en caracteres del input (`size`), según valor o placeholder. */
export function authFieldSize(value: string, placeholder: string) {
  return Math.max(value.length, placeholder.length, 1);
}
