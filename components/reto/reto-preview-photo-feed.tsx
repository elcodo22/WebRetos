type RetoPreviewPhotoFeedProps = {
  images: string[];
  itemId: string;
  quote?: {
    text: string;
    attribution: string;
  };
};

/**
 * Feed estilo Podium: 2 grandes + 3 pequeñas (mismo ancho),
 * cita y otra fila de 2 grandes al seguir scrolleando.
 */
export function RetoPreviewPhotoFeed({
  images,
  itemId,
  quote,
}: RetoPreviewPhotoFeedProps) {
  const largeTop = images.slice(0, 2);
  const small = images.slice(2, 5);
  const largeBottom = images.slice(5, 7);

  if (largeTop.length === 0) return null;

  return (
    <div className="reto-preview-photo-feed mt-12 w-full">
      <div className="reto-preview-photo-grid">
        {largeTop.map((src, index) => (
          <img
            key={`${itemId}-feed-lg-${index}`}
            src={src}
            alt=""
            className="reto-preview-photo reto-preview-photo--large"
            loading="lazy"
            decoding="async"
          />
        ))}
        {small.map((src, index) => (
          <img
            key={`${itemId}-feed-sm-${index}`}
            src={src}
            alt=""
            className="reto-preview-photo reto-preview-photo--small"
            loading="lazy"
            decoding="async"
          />
        ))}
      </div>

      {quote ? (
        <div className="reto-preview-photo-quote">
          <p className="reto-preview-photo-quote-text">{quote.text}</p>
          <p className="reto-preview-photo-quote-by">{quote.attribution}</p>
        </div>
      ) : null}

      {largeBottom.length > 0 ? (
        <div className="reto-preview-photo-grid reto-preview-photo-grid--bottom">
          {largeBottom.map((src, index) => (
            <img
              key={`${itemId}-feed-lg2-${index}`}
              src={src}
              alt=""
              className="reto-preview-photo reto-preview-photo--large"
              loading="lazy"
              decoding="async"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
