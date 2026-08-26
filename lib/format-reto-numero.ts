/** Número de reto para UI: un 0 delante solo si es de un dígito (5 → 05). */
export function formatRetoNumero(numero: string | number): string {
  const n = Number.parseInt(String(numero).trim(), 10);
  if (!Number.isFinite(n) || n < 0) {
    const digits = String(numero).replace(/\D/g, "") || "0";
    return digits.length === 1 ? digits.padStart(2, "0") : digits;
  }
  const s = String(n);
  return s.length === 1 ? s.padStart(2, "0") : s;
}
