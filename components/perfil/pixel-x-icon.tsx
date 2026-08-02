/**
 * X pixel-art simétrica y fina (patrón 9×9, trazo de 1 celda).
 */
export function PixelXIcon({
  className,
  size = 64,
}: {
  className?: string;
  size?: number;
}) {
  const pattern = [
    [1, 0, 0, 0, 0, 0, 0, 0, 1],
    [0, 1, 0, 0, 0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0, 0, 1, 0, 0],
    [0, 0, 0, 1, 0, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 1, 0, 0, 0],
    [0, 0, 1, 0, 0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 1, 0],
    [1, 0, 0, 0, 0, 0, 0, 0, 1],
  ];

  const cols = pattern.length;
  const cell = size / cols;
  const dots: Array<[number, number]> = [];
  for (let r = 0; r < cols; r++) {
    for (let c = 0; c < cols; c++) {
      if (pattern[r][c]) dots.push([c, r]);
    }
  }

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
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
