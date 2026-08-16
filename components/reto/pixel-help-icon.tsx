/**
 * Círculo + interrogación pixel-art finos (trazo de 1 celda).
 */
export function PixelHelpIcon({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  // 14×14 — anillo fino + ? ligero
  const pattern = [
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
    [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
    [1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1],
    [1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
    [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  ];

  const rows = pattern.length;
  const cols = pattern[0].length;
  const cell = size / cols;
  const width = cols * cell;
  const height = rows * cell;
  const dots: Array<[number, number]> = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (pattern[r][c]) dots.push([c, r]);
    }
  }

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ shapeRendering: "crispEdges" }}
      aria-hidden
    >
      {dots.map(([c, r]) => (
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
