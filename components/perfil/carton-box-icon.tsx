/**
 * Caja de cartón abierta (pixel blanco), asset del usuario.
 */
export function CartonBoxIcon({
  className,
  scale = 1,
}: {
  className?: string;
  scale?: number;
}) {
  const width = Math.round(120 * scale);
  const height = Math.round(95 * scale);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/carton-box.png"
      alt=""
      width={width}
      height={height}
      className={className}
      style={{ imageRendering: "pixelated", width, height }}
      draggable={false}
      aria-hidden
    />
  );
}
