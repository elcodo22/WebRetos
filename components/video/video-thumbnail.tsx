"use client";

import { useVideoThumbnail } from "@/hooks/use-video-thumbnail";

type VideoThumbnailProps = {
  videoUrl: string;
  videoUid?: string | null;
  alt?: string;
  className?: string;
  loading?: "eager" | "lazy";
};

/**
 * Miniatura que rellena el rectángulo padre sin bandas negras (bg-cover).
 */
export function VideoThumbnail({
  videoUrl,
  videoUid = null,
  alt = "",
  className = "",
  loading = "lazy",
}: VideoThumbnailProps) {
  const src = useVideoThumbnail(videoUrl, videoUid);

  return (
    <div
      className={`absolute inset-0 overflow-hidden ${className}`.trim()}
      aria-hidden={!alt}
    >
      {src ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            loading={loading}
            decoding="async"
            draggable={false}
            className="sr-only"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={src ? { backgroundImage: `url(${JSON.stringify(src)})` } : undefined}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/70" aria-hidden />
      )}
    </div>
  );
}
