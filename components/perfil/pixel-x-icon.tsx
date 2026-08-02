/**
 * X pixel-art limpia (estilo close de iconos pixel).
 * Rejilla 12×12, trazo de 2 celdas.
 */
export function PixelXIcon({
  className,
  size = 64,
}: {
  className?: string;
  size?: number;
}) {
  const cols = 12;
  const cell = size / cols;

  // Dos diagonales con grosor 2
  const dots: Array<[number, number]> = [];
  for (let i = 1; i <= 10; i++) {
    // diagonal principal \
    dots.push([i, i]);
    dots.push([i + 1, i]);
    // diagonal secundaria /
    dots.push([11 - i, i]);
    dots.push([10 - i, i]);
  }

  // únicos
  const seen = new Set<string>();
  const unique = dots.filter(([c, r]) => {
    if (c < 0 || c >= cols || r < 0 || r >= cols) return false;
    const key = `${c},${r}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ shapeRendering: "crispEdges" }}
      aria-hidden
    >
      {unique.map(([c, r]) => (
        <rect
          key={`${c}-${r}`}
          x={c * cell}
          y={r * cell}
          width={cell}
          height={cell}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}
