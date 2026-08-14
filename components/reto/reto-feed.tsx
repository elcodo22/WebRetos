"use client";

import { useCallback, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { PerfilObra } from "@/lib/mocks/perfil";
import {
  isOwnUsername,
  viewerUsernameFromUser,
} from "@/lib/mocks/perfil";
import type { RetoFeedItem } from "@/lib/mocks/reto-feed";
import {
  PerfilLiftOverlay,
  type LiftState,
} from "@/components/perfil/perfil-lift-overlay";
import { RetoInfiniteFeed } from "@/components/reto/reto-infinite-feed";
import { RetoVideoPlayer } from "@/components/reto/reto-video-player";
import { AuthRequiredPopup } from "@/components/auth/auth-required-popup";
import {
  isObraSaved,
  removeObraFromCaja,
  saveObraToCaja,
} from "@/lib/perfil-caja";

type RetoFeedProps = {
  items: RetoFeedItem[];
  retoNumero: string;
  retoTitulo: string;
  retoId: string;
  user?: User | null;
};

function toPerfilObra(
  item: RetoFeedItem,
  retoNumero: string,
  retoTitulo: string,
  retoId: string,
): PerfilObra {
  return {
    ...item,
    retoNumero,
    retoTitulo,
    retoId,
  };
}

/**
 * Feed del reto: lienzo infinito panneable + reproductor + guardar/eliminar por arrastre.
 */
export function RetoFeed({
  items,
  retoNumero,
  retoTitulo,
  retoId,
  user = null,
}: RetoFeedProps) {
  const [active, setActive] = useState<RetoFeedItem | null>(null);
  const [lift, setLift] = useState<LiftState | null>(null);
  const [liftMode, setLiftMode] = useState<"save" | "remove">("save");
  const [authPopup, setAuthPopup] = useState(false);
  const viewerUsername = useMemo(
    () => viewerUsernameFromUser(user),
    [user],
  );

  const onLiftStart = useCallback(
    (item: RetoFeedItem, el: HTMLElement, clientX: number, clientY: number) => {
      if (isOwnUsername(item.username, viewerUsername)) return;
      const rect = el.getBoundingClientRect();
      setActive(null);
      setLiftMode(user && isObraSaved(item.id) ? "remove" : "save");
      setLift({
        obra: toPerfilObra(item, retoNumero, retoTitulo, retoId),
        x: rect.left,
        y: rect.top,
        w: rect.width,
        h: rect.height,
        grabX: clientX - rect.left,
        grabY: clientY - rect.top,
      });
    },
    [retoId, retoNumero, retoTitulo, user, viewerUsername],
  );

  const onLiftCancel = useCallback(() => setLift(null), []);

  const onDropInFolder = useCallback(() => {
    const obra = lift?.obra;
    setLift(null);
    if (!obra || !user || isOwnUsername(obra.username, viewerUsername)) return;
    saveObraToCaja(obra);
  }, [lift, user, viewerUsername]);

  const onAuthRequired = useCallback(() => {
    setLift(null);
    setAuthPopup(true);
  }, []);

  const onRemove = useCallback(() => {
    const id = lift?.obra.id;
    setLift(null);
    if (id) removeObraFromCaja(id);
  }, [lift]);

  return (
    <>
      <div className={lift ? "invisible h-full" : "h-full"}>
        <RetoInfiniteFeed
          items={items}
          onOpen={setActive}
          onLiftStart={onLiftStart}
          lifting={lift != null}
          ownUsername={viewerUsername}
        />
      </div>

      {lift ? (
        <PerfilLiftOverlay
          lift={lift}
          mode={liftMode}
          onCancel={onLiftCancel}
          requireAuth={!user}
          onAuthRequired={!user ? onAuthRequired : undefined}
          onDropInFolder={liftMode === "save" && user ? onDropInFolder : undefined}
          onRemove={liftMode === "remove" ? onRemove : undefined}
        />
      ) : null}

      {active && !lift ? (
        <RetoVideoPlayer
          item={active}
          retoNumero={retoNumero}
          retoTitulo={retoTitulo}
          onClose={() => setActive(null)}
        />
      ) : null}

      <AuthRequiredPopup
        open={authPopup}
        onClose={() => setAuthPopup(false)}
      />
    </>
  );
}
