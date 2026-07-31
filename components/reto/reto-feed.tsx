"use client";

import { useState } from "react";
import Link from "next/link";
import type { RetoFeedItem } from "@/lib/mocks/reto-feed";
import { perfilHref } from "@/lib/mocks/perfil";
import { RetoVideoPlayer } from "@/components/reto/reto-video-player";

type RetoFeedProps = {
  items: RetoFeedItem[];
  retoNumero: string;
  retoTitulo: string;
};

/**
 * Grid de pósters verticales (cine); al pulsar abre el reproductor.
 * El username lleva al perfil.
 */
export function RetoFeed({ items, retoNumero, retoTitulo }: RetoFeedProps) {
  const [active, setActive] = useState<RetoFeedItem | null>(null);

  return (
    <>
      <ul className="grid w-full grid-cols-5 gap-x-8 gap-y-14 px-6">
        {items.map((item) => (
          <li key={item.id} className="group relative min-w-0">
            <button
              type="button"
              onClick={() => setActive(item)}
              className="relative z-0 block w-full cursor-pointer overflow-visible text-left group-hover:z-10"
              aria-label={`Ver ${item.titulo} de ${item.username}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt=""
                className="aspect-[2/3] w-full origin-bottom rounded-none object-cover transition-transform duration-200 ease-out group-hover:scale-[1.07]"
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            </button>
            <Link
              href={perfilHref(item.username)}
              className="relative z-20 mt-2 block truncate text-[14px] font-normal leading-none tracking-wide text-white hover:underline"
            >
              {item.username}
            </Link>
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
