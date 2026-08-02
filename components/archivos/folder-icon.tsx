/**
 * Icono de carpeta pixel-art (landing / archivos).
 * Pestaña arriba a la derecha, cuerpo rectangular abajo.
 */
export function FolderIcon({
  className,
  scale = 1,
}: {
  className?: string;
  /** Escala del icono (1 = tamaño landing). */
  scale?: number;
}) {
  const cols = 18;
  const rows = 12;
  const dotSize = 7 * scale;
  const cellSize = 11 * scale;
  const tabRowEnd = 1;
  const tabColStart = 11;
  const tabColEnd = 16;

  const dots: Array<[number, number]> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const inTab = r <= tabRowEnd && c >= tabColStart && c <= tabColEnd;
      const inBody = r > tabRowEnd;
      if (inTab || inBody) {
        dots.push([c, r]);
      }
    }
  }

  return (
    <svg
      className={className}
      width={cols * cellSize}
      height={rows * cellSize}
      viewBox={`0 0 ${cols * cellSize} ${rows * cellSize}`}
      style={{ shapeRendering: "crispEdges" }}
      aria-hidden
    >
      {dots.map(([c, r]) => (
        <rect
          key={`${c}-${r}`}
          x={c * cellSize}
          y={r * cellSize}
          width={dotSize}
          height={dotSize}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}
