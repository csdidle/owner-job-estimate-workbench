import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { requireWorkbenchOwner } from "@/app/actions";
import {
  getAttachmentSignature,
  notifyAttachmentUpload,
  safeParseJson,
  sqlQuery,
  updateRecord,
  type IAttachmentCellValue,
} from "@/lib/teable";

const BASE_ID = "bse7bbdbrcd6YfA8YpU";
const PRICING_TABLE_ID = "tbl2rkKy5VQucVWwANM";
const PRICING_TABLE = '"bse7bbdbrcd6YfA8YpU"."tbl2rkKy5VQucVWwANM"';
const ESTIMATE_PHOTOS_FIELD_ID = "fld1AHqEKV4wh3CD66b";
const MAX_FILE_SIZE = 250 * 1024 * 1024;

const recordIdSchema = z.string().regex(/^rec[a-zA-Z0-9]+$/);
const signSchema = z.object({
  action: z.literal("sign"),
  pricingId: recordIdSchema,
  name: z.string().trim().min(1).max(255),
  type: z.string().trim().min(1).max(200),
  size: z.number().int().positive().max(MAX_FILE_SIZE),
});
const completeSchema = z.object({
  action: z.literal("complete"),
  pricingId: recordIdSchema,
  name: z.string().trim().min(1).max(255),
  token: z.string().min(1).max(500),
});

function isSupportedMediaType(type: string): boolean {
  return type.startsWith("image/") || type.startsWith("video/");
}

function existingAttachments(value: unknown): IAttachmentCellValue[] {
  const parsed = safeParseJson(value);
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((attachment) => {
    if (!attachment || typeof attachment !== "object") return [];
    const item = attachment as Record<string, unknown>;
    if (typeof item.name !== "string" || typeof item.token !== "string") return [];
    return [{
      ...(typeof item.id === "string" ? { id: item.id } : {}),
      name: item.name,
      token: item.token,
    }];
  });
}

async function getPricingRecord(pricingId: string, includeMedia = false) {
  const { rows } = await sqlQuery(BASE_ID, `
    SELECT "__id"${includeMedia ? ', "Job_Photos"' : ""}
    FROM ${PRICING_TABLE}
    WHERE "__id" = '${pricingId}'
    LIMIT 1
  `);
  return rows[0] || null;
}

export async function POST(request: Request) {
  try {
    await requireWorkbenchOwner();
    const body = await request.json();

    if (body?.action === "sign") {
      const parsed = signSchema.safeParse(body);
      if (!parsed.success || !isSupportedMediaType(parsed.data?.type || "")) {
        return Response.json({ message: "Choose a valid photo or video" }, { status: 400 });
      }
      if (!await getPricingRecord(parsed.data.pricingId)) {
        return Response.json({ message: "Estimate pricing was not found" }, { status: 404 });
      }

      const signature = await getAttachmentSignature({
        contentType: parsed.data.type,
        contentLength: parsed.data.size,
        baseId: BASE_ID,
      });
      const requestHeaders = Object.fromEntries(
        Object.entries(signature.requestHeaders).filter(([name]) => name.toLowerCase() !== "content-length")
      );
      return Response.json({ ...signature, requestHeaders });
    }

    if (body?.action === "complete") {
      const parsed = completeSchema.safeParse(body);
      if (!parsed.success) {
        return Response.json({ message: "The uploaded media could not be saved" }, { status: 400 });
      }
      const pricing = await getPricingRecord(parsed.data.pricingId, true);
      if (!pricing) {
        return Response.json({ message: "Estimate pricing was not found" }, { status: 404 });
      }

      const uploaded = await notifyAttachmentUpload(parsed.data.token, parsed.data.name);
      if (!isSupportedMediaType(uploaded.mimetype)) {
        return Response.json({ message: "Only photos and videos can be attached" }, { status: 400 });
      }

      const attachments = existingAttachments(pricing.Job_Photos);
      if (!attachments.some((attachment) => attachment.token === uploaded.token)) {
        await updateRecord(PRICING_TABLE_ID, parsed.data.pricingId, {
          [ESTIMATE_PHOTOS_FIELD_ID]: [
            ...attachments,
            { name: parsed.data.name, token: uploaded.token },
          ],
        });
      }

      return Response.json({
        attachment: {
          id: null,
          name: parsed.data.name,
          token: uploaded.token,
          path: uploaded.path,
          mimetype: uploaded.mimetype,
          size: uploaded.size,
          presignedUrl: uploaded.presignedUrl || uploaded.url,
          width: uploaded.width ?? null,
          height: uploaded.height ?? null,
        },
      });
    }

    return Response.json({ message: "Unsupported media action" }, { status: 400 });
  } catch (error) {
    unstable_rethrow(error);
    const message = error instanceof Error ? error.message : "Estimate media could not be saved";
    return Response.json({ message }, { status: 500 });
  }
}
