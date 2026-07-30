"use client";

import { useState } from "react";
import type { RetoFeedItem } from "@/lib/mocks/reto-feed";
import { RetoVideoPlayer } from "@/components/reto/reto-video-player";

type RetoFeedProps = {
  items: RetoFeedItem[];
  retoNumero: string;
  retoTitulo: string;
};

/**
 * 5 miniaturas por fila; al pulsar abre el reproductor a pantalla completa.
 */
export function RetoFeed({ items, retoNumero, retoTitulo }: RetoFeedProps) {
  const [active, setActive] = useState<RetoFeedItem | null>(null);

  return (
    <>
      <ul className="grid w-full grid-cols-5 gap-x-5 gap-y-8">
        {items.map((item) => (
          <li key={item.id} className="min-w-0">
            <button
              type="button"
              onClick={() => setActive(item)}
              className="block w-full cursor-pointer text-left"
              aria-label={`Ver ${item.titulo} de ${item.username}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt=""
                className="aspect-[338/224] w-full rounded-none object-cover"
                loading="lazy"
                decoding="async"
                draggable={false}
              />
              <p className="mt-2 truncate text-[14px] font-normal leading-none tracking-wide text-white">
                {item.username}
              </p>
            </button>
          </li>
        ))}
      </ul>

      {active ? (
        <RetoVideoPlayer
          item={active}
          retoNumero={retoNumero}
          retoTitulo={retoTitulo}
          onClose={() => setActive(null)}
        />
      ) : null}
    </>
  );
}
