import type { EstimateMedia } from "@/lib/workbench-contract";

export const MAX_ESTIMATE_MEDIA_SIZE = 250 * 1024 * 1024;

export function isEstimateMediaFile(file: File): boolean {
  return (file.type.startsWith("image/") || file.type.startsWith("video/")) &&
    file.size > 0 && file.size <= MAX_ESTIMATE_MEDIA_SIZE;
}

type MediaApiPayload = {
  message?: string;
  url?: string;
  uploadMethod?: string;
  requestHeaders?: HeadersInit;
  token?: string;
  attachment?: EstimateMedia;
};

async function responsePayload(response: Response): Promise<MediaApiPayload> {
  return response.json().catch(() => ({})) as Promise<MediaApiPayload>;
}

export async function uploadEstimateMedia(pricingId: string, file: File): Promise<EstimateMedia> {
  const signResponse = await fetch("/api/estimate-media", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "sign",
      pricingId,
      name: file.name,
      type: file.type,
      size: file.size,
    }),
  });
  const signature = await responsePayload(signResponse);
  if (!signResponse.ok || !signature.url || !signature.uploadMethod || !signature.token) {
    throw new Error(signature.message || `${file.name} could not be prepared`);
  }

  const uploadResponse = await fetch(signature.url, {
    method: signature.uploadMethod,
    headers: signature.requestHeaders,
    body: file,
  });
  if (!uploadResponse.ok) throw new Error(`${file.name} could not be uploaded`);

  const completeResponse = await fetch("/api/estimate-media", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "complete",
      pricingId,
      name: file.name,
      token: signature.token,
    }),
  });
  const completed = await responsePayload(completeResponse);
  if (!completeResponse.ok || !completed.attachment) {
    throw new Error(completed.message || `${file.name} could not be attached`);
  }
  return completed.attachment;
}
