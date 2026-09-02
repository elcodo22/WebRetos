import {
  FEED_THUMB_FRAME_SECONDS,
} from "@/lib/feed-video-constants";
import type { RetoFeedItem } from "@/lib/mocks/reto-feed";

export type FeedPreviewRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type FeedPreviewOpen = {
  item: RetoFeedItem;
  rect: FeedPreviewRect;
  startTime: number;
};

export function snapshotPreviewRect(element: HTMLElement): FeedPreviewRect {
  const rect = element.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

export function prepareFeedPreviewOpen(
  element: HTMLElement,
  item: RetoFeedItem,
): FeedPreviewOpen {
  return {
    item,
    rect: snapshotPreviewRect(element),
    startTime: FEED_THUMB_FRAME_SECONDS,
  };
}