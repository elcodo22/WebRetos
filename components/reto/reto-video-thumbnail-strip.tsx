"use client";

import { useEffect, useMemo, useRef } from "react";
import { VideoThumbnail } from "@/components/video/video-thumbnail";

export type MediaSelection = "video" | string;

type PhotoRow =
  | { type: "full"; url: string }
  | { type: "pair"; urls: [string, string] };

function buildPhotoRows(images: string[]): PhotoRow[] {
  const rows: PhotoRow[] = [];
  let index = 0;
  let rowIndex = 0;

  while (index < images.length) {
    const remaining = images.length - index;
    const useFullRow = rowIndex % 2 === 0;

    if (useFullRow || remaining === 1) {
      rows.push({ type: "full", url: images[index]! });
      index += 1;
    } else {
      rows.push({
        type: "pair",
        urls: [images[index]!, images[index + 1]!],
      });
      index += 2;
    }

    rowIndex += 1;
  }

  return rows;
}

type RetoVideoThumbnailStripProps = {
  videoUrl: string;
  videoUid?: string | null;
  imagenes?: string[];
  videoTitle: string;
  selected: MediaSelection;
  onSelect: (id: MediaSelection) => void;
  className?: string;
};

export function RetoVideoThumbnailStrip({
  videoUrl,
  videoUid = null,
  imagenes = [],
  videoTitle,
  selected,
  onSelect,
  className = "",
}: RetoVideoThumbnailStripProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const activeThumbRef = useRef<HTMLButtonElement>(null);

  const photos = useMemo(
    () => imagenes.map((url) => url.trim()).filter(Boolean),
    [imagenes],
  );
  const photoRows = useMemo(() => buildPhotoRows(photos), [photos]);

  useEffect(() => {
    activeThumbRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [selected]);

  const thumbClass = (id: MediaSelection) =>
    `relative w-full shrink-0 overflow-hidden transition-opacity duration-200 ${
      selected === id ? "opacity-100" : "opacity-40"
    }`;

  const bindActiveRef = (id: MediaSelection) =>
    selected === id ? activeThumbRef : undefined;

  return (
    <div
      ref={stripRef}
      className={`flex max-h-[min(72dvh,28rem)] w-[clamp(3.1rem,6.5vw,3.75rem)] flex-col overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${className}`.trim()}
      data-thumbnail-strip-scroll=""
    >
      <button
        ref={bindActiveRef("video")}
        type="button"
        onClick={() => onSelect("video")}
        className={`${thumbClass("video")} aspect-[5/3] ${
          selected === "video"
            ? "border border-white/35"
            : "border border-transparent"
        }`}
        aria-label={`Miniatura de ${videoTitle}`}
        aria-pressed={selected === "video"}
      >
        <VideoThumbnail
          videoUrl={videoUrl}
          videoUid={videoUid}
          alt=""
          loading="eager"
        />
      </button>

      {photoRows.length > 0 ? (
        <div className="flex w-full flex-col">
          {photoRows.map((row, rowIndex) => {
            if (row.type === "full") {
              return (
                <button
                  key={`${row.url}-${rowIndex}`}
                  ref={bindActiveRef(row.url)}
                  type="button"
                  onClick={() => onSelect(row.url)}
                  className={`${thumbClass(row.url)} aspect-[5/4]`}
                  aria-label="Ver imagen"
                  aria-pressed={selected === row.url}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={row.url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </button>
              );
            }

            return (
              <div key={`pair-${rowIndex}`} className="flex w-full">
                {row.urls.map((url, cellIndex) => (
                  <button
                    key={`${url}-${cellIndex}`}
                    ref={bindActiveRef(url)}
                    type="button"
                    onClick={() => onSelect(url)}
                    className={`${thumbClass(url)} aspect-square w-1/2`}
                    aria-label="Ver imagen"
                    aria-pressed={selected === url}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
