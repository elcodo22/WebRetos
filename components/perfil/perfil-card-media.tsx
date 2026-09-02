"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { VideoThumbnail } from "@/components/video/video-thumbnail";
import {
  attachPreviewLoopHandlers,
  startPreviewPlayback,
} from "@/lib/video-preview";

type PerfilCardMediaProps = {
  videoUrl: string;
  videoUid?: string | null;
  playing: boolean;
  hidden?: boolean;
};

export const PerfilCardMedia = forwardRef<HTMLVideoElement | null, PerfilCardMediaProps>(
  function PerfilCardMedia(
    { videoUrl, videoUid = null, playing, hidden = false },
    ref,
  ) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useImperativeHandle(ref, () => videoRef.current);

    useEffect(() => {
      if (!playing) {
        videoRef.current?.pause();
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      startPreviewPlayback(video);
      const detach = attachPreviewLoopHandlers(video);

      return () => {
        detach();
        video.pause();
      };
    }, [playing, videoUrl]);

    if (playing) {
      return (
        <video
          ref={videoRef}
          src={videoUrl}
          playsInline
          preload="auto"
          muted
          loop
          autoPlay
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
            hidden ? "opacity-0" : "opacity-100"
          }`}
        />
      );
    }

    return (
      <VideoThumbnail
        videoUrl={videoUrl}
        videoUid={videoUid}
        loading="lazy"
        className={hidden ? "opacity-0" : ""}
      />
    );
  },
);
