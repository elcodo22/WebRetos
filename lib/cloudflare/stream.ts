const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";

type DirectUploadResponse = {
  success: boolean;
  result?: {
    uploadURL: string;
    uid: string;
  };
  errors?: Array<{ message: string }>;
};

export function getMaxVideoDurationSeconds() {
  const configured = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_MAX_DURATION_SECONDS;
  const parsed = configured ? Number.parseInt(configured, 10) : 90;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 90;
}

export async function crearUrlSubidaDirecta() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error(
      "Faltan CLOUDFLARE_ACCOUNT_ID o CLOUDFLARE_API_TOKEN en las variables de entorno."
    );
  }

  const response = await fetch(
    `${CLOUDFLARE_API_BASE}/accounts/${accountId}/stream/direct_upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        maxDurationSeconds: getMaxVideoDurationSeconds(),
        requireSignedURLs: false,
      }),
      cache: "no-store",
    }
  );

  const data = (await response.json()) as DirectUploadResponse;

  if (!response.ok || !data.success || !data.result) {
    const message =
      data.errors?.[0]?.message ?? "No se pudo crear la URL de subida en Cloudflare.";
    throw new Error(message);
  }

  return data.result;
}

export function getStreamIframeUrl(videoUid: string) {
  return `https://iframe.videodelivery.net/${videoUid}`;
}

export function getStreamThumbnailUrl(videoUid: string) {
  return `https://videodelivery.net/${videoUid}/thumbnails/thumbnail.jpg`;
}
