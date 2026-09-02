"use client";

import { useEffect, useState } from "react";
import { getStreamThumbnailUrl } from "@/lib/cloudflare/stream";
import {
  getCachedFeedVideoFrame,
  requestFeedVideoFrame,
  subscribeFeedVideoFrame,
} from "@/lib/feed-video-frame";

function streamThumbnail(videoUid: string | null | undefined) {
  if (!videoUid || videoUid.startsWith("sim-")) return null;
  return getStreamThumbnailUrl(videoUid);
}

export function useVideoThumbnail(
  videoUrl: string | null | undefined,
  videoUid?: string | null,
): string | null {
  const [src, setSrc] = useState<string | null>(() => {
    const stream = streamThumbnail(videoUid);
    if (stream) return stream;
    if (videoUrl) return getCachedFeedVideoFrame(videoUrl);
    return null;
  });

  useEffect(() => {
    const stream = streamThumbnail(videoUid);
    if (stream) {
      setSrc(stream);
      return;
    }

    if (!videoUrl) {
      setSrc(null);
      return;
    }

    const cached = getCachedFeedVideoFrame(videoUrl);
    if (cached) {
      setSrc(cached);
      return;
    }

    let cancelled = false;
    const unsub = subscribeFeedVideoFrame(videoUrl, (frame) => {
      if (!cancelled) setSrc(frame);
    });

    requestFeedVideoFrame(videoUrl)
      .then((frame) => {
        if (!cancelled) setSrc(frame);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      unsub();
    };
  }, [videoUrl, videoUid]);

  return src;
}
