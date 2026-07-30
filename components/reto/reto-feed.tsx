import type { RetoFeedItem } from "@/lib/mocks/reto-feed";

/**
 * 5 miniaturas por fila; bajo cada una, @username. Sin texto de título.
 */
export function RetoFeed({ items }: { items: RetoFeedItem[] }) {
  return (
    <ul className="grid w-full grid-cols-5 gap-x-5 gap-y-8">
      {items.map((item) => (
        <li key={item.id} className="min-w-0">
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
        </li>
      ))}
    </ul>
  );
}
