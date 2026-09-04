"use server";

import { unstable_cache, updateTag } from "next/cache";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import {
  createRecord,
  createRecords,
  deleteRecords,
  safeParseJson,
  signAttachments,
  sqlQuery,
  updateRecord,
  updateRecords,
  type RecordFields,
} from "@/lib/teable";
import {
  BILLING_DISPOSITIONS,
  CONDITION_OPTIONS,
  ESTIMATE_QUEUE_STATUSES,
  FREQUENCIES,
  JOB_PRIORITIES,
  JOB_TYPES,
  OPERATIONAL_JOB_STATUSES,
  PRICING_OUTCOMES,
  ROUTING_STATUSES,
  SEASONS,
  TERRAIN_OPTIONS,
  type ActionResult,
  type ContactOption,
  type EmployeeOption,
  type EstimateLine,
  type EstimateMedia,
  type EstimateRecord,
  type JobRecord,
  type PricingJobInput,
  type PricingPromotionInput,
  type PricingRecord,
  type ServiceOption,
  type WorkbenchData,
} from "@/lib/workbench-contract";

const BASE_ID = "bse7bbdbrcd6YfA8YpU";
const WORKBENCH_DATA_TAG = "owner-workbench-data";

const TABLES = {
  contacts: '"bse7bbdbrcd6YfA8YpU"."tbldDs2u3Nj0KR8mZ0c"',
  services: '"bse7bbdbrcd6YfA8YpU"."tbl9zU4PkhGggW7Dc9R"',
  employees: '"bse7bbdbrcd6YfA8YpU"."tbl1gyEIJuVKcV6pKR1"',
  pricing: '"bse7bbdbrcd6YfA8YpU"."tbl2rkKy5VQucVWwANM"',
  pricingLines: '"bse7bbdbrcd6YfA8YpU"."tblzbMYZf6lqd3CpkxR"',
  jobs: '"bse7bbdbrcd6YfA8YpU"."tblYoERyR6AmuNXt9fK"',
  estimates: '"bse7bbdbrcd6YfA8YpU"."tblLu0d0Hn2YawgvFOI"',
  estimateLines: '"bse7bbdbrcd6YfA8YpU"."tblg2El8ltcSA18Avwk"',
  owners: '"bse7bbdbrcd6YfA8YpU"."tbl04vMl52pc7cErYz6"',
} as const;

const TABLE_IDS = {
  pricing: "tbl2rkKy5VQucVWwANM",
  pricingLines: "tblzbMYZf6lqd3CpkxR",
  jobs: "tblYoERyR6AmuNXt9fK",
  estimates: "tblLu0d0Hn2YawgvFOI",
  estimateLines: "tblg2El8ltcSA18Avwk",
} as const;

const FIELDS = {
  pricing: {
    name: "fldZiK5j84hal67rBbJ",
    status: "fldknJgGFbLScTQauTJ",
    contact: "fld7cKgjWVP8ODABgkS",
    service: "fldmt57556dMKqtCezc",
    requiresEstimate: "fldDRT1dCOUwLXtliWB",
    crew: "fldFIDzSohqhjXg8wuv",
    scheduledDate: "fldpbIaqJEYue6vurAH",
    priority: "fldIpFWEz5idEoof0LC",
    jobType: "fld0F0ErwJNkErIHsAM",
    notes: "fld7ykoS08KqHjGsoW7",
    crewSize: "fldoDMdtWr3U8h6btj3",
    hours: "fldIfaE81b6AQvV5KbF",
    laborRate: "fldSsXkiif0J1JhkTbx",
    equipment: "fldjwKkNIBAJCDLSWOm",
    fuel: "fldkQ0Zz9BpmE3yYtnW",
    materials: "fldhy1eSz9I2JcWRuLu",
    disposal: "fldmQmofbeW5muPsVXa",
    subcontractor: "fldvwIv5abW0YUpXVwR",
    targetMargin: "fldHEz4AVaJ76nEeYTx",
    finalOverride: "fldxoD9TSRD0qyC03m0",
    acreage: "fld5MWqKmXPGQujotm3",
    visits: "fldWiGzKj2uCpnwy2gS",
    frequency: "fldWyPva0BGUgfIX2SL",
    terrain: "fldl6oKYNbblDnvnPdw",
    condition: "fld2rnEWSVRvmwWuGbf",
    season: "fld2EDcwlG33ManHWjH",
    category: "fldmol54RwBstoAZdPJ",
    archive: "fldlYp01gCLvLnz0m4l",
    routingStatus: "fldTxirEHdWspVXx1vJ",
    routingError: "fldugMFE3Ti6kFpLpfV",
    routedAt: "fldrxL9msiBbG3guRod",
    estimate: "fldEZjt8n8wfwgZ44dp",
  },
  pricingLine: {
    name: "fldvGfwizqG2xV6HDbz",
    pricing: "fldFT3ZrdF2nXVIOvrD",
    service: "fld9xgdrWv5bzEKfUPJ",
    quantity: "fldHiruBQezbC2IIkyE",
    unitPrice: "fldFjaAMYZSABoJU1zC",
    description: "fld5YhTV4yUr9iIcRFy",
    order: "fldCzFThzQmQOgTLFt8",
  },
  estimate: {
    name: "fld7yS1h1gM6PK5UK8e",
    status: "fldrsrFhScdIOBZ8lCG",
    subtotal: "fldWNkEzYleX9U8S4rx",
    discount: "fldsosZJFjNsIzDx5tl",
    taxPercent: "fld0yR6850QegP1gC5A",
    taxAmount: "fldW5AqOGvK5WorxBow",
    total: "fldWkSDl5Qo0hnJhZQ8",
    notes: "fldlOzysvXfq4YegSXx",
    internalNotes: "fldH66x6wTsy89lZqWy",
    estimateDate: "flddhn3V2LkfVRWMXJB",
    expirationDate: "fldTH12qlne85JqkiFU",
    createQboDraft: "fld7PWGNHhJRdLbThRi",
    qboSyncStatus: "fldJPu823Kxo1pMcSbR",
    photosToSend: "fldpygGut7ugki2OFqB",
  },
  estimateLine: {
    name: "fldeCOcL8tAttZ52PZv",
    estimate: "fldVUkcNMUDRAoc1KB1",
    service: "fld9OvFBlZiIBYldoTP",
    description: "fldQDRClbCKit57CL9v",
    quantity: "fldX2JUOslgXPaSzkEs",
    unitPrice: "fldosdWIdTpDqLywNAd",
    total: "fldwpZLGnlVCISY27VW",
    order: "fldpzAgrpE45naeunvG",
  },
  job: {
    release: "fld0zjPt44GhGTkpqYP",
    status: "fldQ6ZWSYprYZkDQtIO",
    estimate: "fldZvoJFTUWqDWH3pzM",
    crew: "fldCFM0k913xpJZPCyl",
    scheduledDate: "fldZk6IuygPaD05sNVd",
    priority: "flddIJ21uKWGZkNSHCh",
    jobType: "fld1ujMxByfaN5LZcAK",
    completedDate: "fldTRE91nXokn2dZWDk",
    completionNotes: "fld0xgjzdSUcmi5FDKZ",
    proposedInvoiceAmount: "fldoFSkpih4AqRtn3MH",
    readyToInvoice: "fldG9K8m1ZKiPdFUn33",
    billingStatus: "fldi8mOyAL6vk70TwJP",
    billingHoldReason: "fldBxV81hzt3Ov65LrI",
  },
} as const;

const recordIdSchema = z.string().regex(/^rec[a-zA-Z0-9]+$/);
const nullableNonNegative = z.number().finite().nonnegative().nullable();
const nullableSelect = (values: readonly [string, ...string[]]) => z.enum(values).nullable();

function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const completionInputSchema = z.object({
  jobId: recordIdSchema,
  completedDate: z.string().refine(isValidDateOnly, "Completed Date must be a valid date"),
  completionNotes: z.string().max(10000, "Completion Notes must be 10,000 characters or fewer"),
  proposedInvoiceAmount: nullableNonNegative,
  billingDisposition: z.enum(BILLING_DISPOSITIONS),
  billingHoldReason: z.string().max(10000, "Billing Hold Reason must be 10,000 characters or fewer"),
}).superRefine((input, context) => {
  if (input.billingDisposition === "Billing Hold" && input.billingHoldReason.trim().length === 0) {
    context.addIssue({
      code: "custom",
      path: ["billingHoldReason"],
      message: "Billing Hold Reason is required when Billing Hold is selected",
    });
  }
});

const pricingInputSchema = z.object({
  name: z.string().trim().min(2).max(200),
  contactId: recordIdSchema.nullable(),
  lines: z.array(z.object({
    serviceId: recordIdSchema.nullable(),
    name: z.string().trim().min(1).max(200),
    description: z.string().max(4000),
    quantity: z.number().int().positive(),
    unitPrice: z.number().finite().nonnegative(),
    lineOrder: z.number().int().positive(),
  })).min(1).max(50),
  outcome: z.enum(PRICING_OUTCOMES),
  assignedCrewIds: z.array(recordIdSchema).max(25),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  priority: z.enum(JOB_PRIORITIES),
  jobType: z.enum(JOB_TYPES),
  notes: z.string().max(10000),
  crewSize: nullableNonNegative,
  estimatedHours: nullableNonNegative,
  laborRate: nullableNonNegative,
  equipmentCost: nullableNonNegative,
  fuelCost: nullableNonNegative,
  materialsCost: nullableNonNegative,
  disposalFees: nullableNonNegative,
  subcontractorCost: nullableNonNegative,
  targetMargin: z.number().finite().min(0).max(99.99).nullable(),
  finalPriceOverride: nullableNonNegative,
  acreage: nullableNonNegative,
  visitsPerSeason: nullableNonNegative,
  frequency: nullableSelect(FREQUENCIES),
  terrain: nullableSelect(TERRAIN_OPTIONS),
  condition: nullableSelect(CONDITION_OPTIONS),
  season: nullableSelect(SEASONS),
});

const pricingPromotionSchema = z.object({
  pricingId: recordIdSchema,
  outcome: z.enum(["create-job", "create-estimate"]),
  contactId: recordIdSchema,
  assignedCrewIds: z.array(recordIdSchema).max(25),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  priority: z.enum(JOB_PRIORITIES),
  jobType: z.enum(JOB_TYPES),
});

const estimateStatusSchema = z.object({
  estimateId: recordIdSchema,
  status: z.enum(ESTIMATE_QUEUE_STATUSES),
});

const estimateInputSchema = z.object({
  estimateId: recordIdSchema,
  name: z.string().trim().min(2).max(200),
  notes: z.string().max(10000),
  internalNotes: z.string().max(10000),
  estimateDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expirationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  discount: z.number().finite().nonnegative(),
  taxPercent: z.number().finite().min(0).max(100),
  queueQboDraft: z.boolean(),
  photoTokensToSend: z.array(z.string().min(1).max(500)).max(50),
  lines: z.array(z.object({
    id: z.string().min(1),
    serviceId: recordIdSchema.nullable(),
    name: z.string().trim().min(1).max(200),
    description: z.string().max(4000),
    quantity: z.number().int().positive(),
    unitPrice: z.number().finite().nonnegative(),
    total: z.number().finite().nonnegative(),
    lineOrder: z.number().int().positive(),
  })).min(1).max(100),
});

function sqlString(value: string): string {
  return value.replaceAll("'", "''");
}

function sqlIdList(ids: string[]): string {
  return ids.map((id) => `'${sqlString(id)}'`).join(", ");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown Teable error";
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function booleanValue(value: unknown): boolean {
  return value === true || value === "true";
}

function dateValue(value: unknown): string | null {
  const date = stringValue(value);
  return date ? date.slice(0, 10) : null;
}

function linkedIds(value: unknown): string[] {
  const parsed = safeParseJson(value);
  const links = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
  return links.flatMap((link) => {
    if (typeof link === "object" && link && typeof link.id === "string") return [link.id];
    return [];
  });
}

function attachmentValues(value: unknown): EstimateMedia[] {
  const parsed = safeParseJson(value);
  const attachments = Array.isArray(parsed) ? parsed : [];
  return attachments.flatMap((attachment) => {
    if (!attachment || typeof attachment !== "object") return [];
    const item = attachment as Record<string, unknown>;
    const token = stringValue(item.token);
    const name = stringValue(item.name);
    if (!token || !name) return [];
    return [{
      id: stringValue(item.id),
      name,
      token,
      path: stringValue(item.path) || "",
      mimetype: stringValue(item.mimetype) || "application/octet-stream",
      size: numberValue(item.size),
      presignedUrl: stringValue(item.presignedUrl),
      width: item.width == null ? null : numberValue(item.width),
      height: item.height == null ? null : numberValue(item.height),
    }];
  });
}

function nullableDate(date: string | null): string | null {
  return date ? `${date}T00:00:00.000Z` : null;
}

function mapContact(row: Record<string, unknown>): ContactOption {
  const first = stringValue(row.First_Name1773607325102);
  const last = stringValue(row.Last_Name);
  const personalName = [first, last].filter(Boolean).join(" ");
  const company = stringValue(row.Company);
  const apartment = stringValue(row.First_Name);
  return {
    id: String(row.__id),
    name: personalName || company || apartment || stringValue(row.Email) || "Unnamed contact",
    company,
    email: stringValue(row.Email),
    phone: stringValue(row.Phone),
    address: stringValue(row.Address),
    city: stringValue(row.City),
    state: stringValue(row.State),
    zip: stringValue(row.Zip),
  };
}

function mapService(row: Record<string, unknown>): ServiceOption {
  return {
    id: String(row.__id),
    name: stringValue(row.Service_Name) || "Unnamed service",
    category: stringValue(row.Category),
    unit: stringValue(row.Unit),
    cost: numberValue(row.Cost),
    unitPrice: numberValue(row.Unit_Price),
    description: stringValue(row.Description),
    qboItemId: stringValue(row.QBO_Item_ID),
  };
}

function mapEmployee(row: Record<string, unknown>): EmployeeOption {
  return {
    id: String(row.__id),
    name: stringValue(row.Full_Name) || "Unnamed employee",
    role: stringValue(row.Role),
  };
}

function mapPricing(row: Record<string, unknown>, media = attachmentValues(row.Job_Photos)): PricingRecord {
  const status = stringValue(row.Routing_Status);
  const priority = stringValue(row.Priority);
  const jobType = stringValue(row.Job_Type);
  return {
    id: String(row.__id),
    name: stringValue(row.Estimate_Name) || "Untitled pricing request",
    routingStatus: ROUTING_STATUSES.includes(status as (typeof ROUTING_STATUSES)[number])
      ? status as PricingRecord["routingStatus"]
      : null,
    routingError: stringValue(row.Routing_Error),
    requiresEstimate: booleanValue(row.Requires_Estimate),
    contactId: stringValue(row.__fk_fld7cKgjWVP8ODABgkS),
    assignedCrewIds: linkedIds(row.Assigned_Crew),
    scheduledDate: dateValue(row.Scheduled_Date),
    priority: JOB_PRIORITIES.includes(priority as (typeof JOB_PRIORITIES)[number])
      ? priority as PricingRecord["priority"]
      : null,
    jobType: JOB_TYPES.includes(jobType as (typeof JOB_TYPES)[number])
      ? jobType as PricingRecord["jobType"]
      : null,
    totalPrice: numberValue(row.Line_Items_Total) || numberValue(row.Price_to_Quote),
    jobId: stringValue(row.__fk_fldAVF8a8mk3RDa2FS1),
    estimateId: stringValue(row.__fk_fldEZjt8n8wfwgZ44dp),
    routedAt: stringValue(row.Routed_At),
    media,
  };
}

function mapJob(row: Record<string, unknown>): JobRecord {
  const priority = stringValue(row.Priority);
  const jobType = stringValue(row.Job_Type);
  return {
    id: String(row.__id),
    number: row.Job == null ? null : numberValue(row.Job),
    name: stringValue(row.Job_Name) || `Job ${numberValue(row.Job) || ""}`.trim(),
    status: stringValue(row.Status),
    contactId: stringValue(row.__fk_fldUwIRjAWUMGs78YSp),
    estimateId: stringValue(row.__fk_fldZvoJFTUWqDWH3pzM),
    assignedCrewIds: linkedIds(row.Assigned_Crew),
    scheduledDate: dateValue(row.Scheduled_Date),
    priority: JOB_PRIORITIES.includes(priority as (typeof JOB_PRIORITIES)[number])
      ? priority as JobRecord["priority"]
      : null,
    jobType: JOB_TYPES.includes(jobType as (typeof JOB_TYPES)[number])
      ? jobType as JobRecord["jobType"]
      : null,
    releaseToPipeline: booleanValue(row.Release_to_Pipeline),
  };
}

function mapEstimateLine(row: Record<string, unknown>): EstimateLine {
  return {
    id: String(row.__id),
    serviceId: stringValue(row.__fk_fld9OvFBlZiIBYldoTP),
    name: stringValue(row.Line_Item) || "Untitled line",
    description: stringValue(row.Description) || "",
    quantity: numberValue(row.Quantity),
    unitPrice: numberValue(row.Unit_Price),
    total: numberValue(row.Total),
    lineOrder: numberValue(row.Line_Order),
  };
}

function mapEstimate(row: Record<string, unknown>, lines: EstimateLine[] = []): EstimateRecord {
  return {
    id: String(row.__id),
    number: row.Estimate == null ? null : numberValue(row.Estimate),
    name: stringValue(row.Estimate_Name) || `Estimate ${numberValue(row.Estimate) || ""}`.trim(),
    status: stringValue(row.Status),
    contactId: stringValue(row.__fk_fldS7ZFfBWqnQGrOoB6),
    assignedToId: stringValue(row.__fk_fldOZubmmeu0J38nmpg),
    subtotal: numberValue(row.Subtotal),
    discount: numberValue(row.Discount),
    taxPercent: numberValue(row.Tax),
    taxAmount: numberValue(row.Tax_Amount),
    total: numberValue(row.Total),
    notes: stringValue(row.Notes) || "",
    internalNotes: stringValue(row.Internal_Notes) || "",
    estimateDate: dateValue(row.Estimate_Date),
    expirationDate: dateValue(row.Expiration_Date),
    createQboDraft: booleanValue(row.Create_QBO_Draft),
    qboSyncStatus: stringValue(row.QBO_Sync_Status),
    qboSyncError: stringValue(row.QBO_Sync_Error),
    qboEstimateId: stringValue(row.QBO_Estimate_ID),
    qboDocNumber: stringValue(row.QBO_Doc_Number),
    qboSyncToken: stringValue(row.QBO_Sync_Token),
    qboLastSynced: stringValue(row.QBO_Last_Synced),
    photoTokensToSend: attachmentValues(row.Photos_to_Send).map((photo) => photo.token),
    lines,
  };
}

const getCachedOwnerRecord = unstable_cache(
  async (userId: string) => sqlQuery(BASE_ID, `
    SELECT "__id", "Name", "Email", "Role", "Status"
    FROM ${TABLES.owners}
    WHERE "__id" = '${sqlString(userId)}'
      AND "Status" = 'Active'
      AND "Role" = 'Admin'
    LIMIT 1
  `),
  ["owner-workbench-access", BASE_ID],
  { revalidate: 30 }
);

async function requireOwner() {
  const user = await requireAuth();
  if (!recordIdSchema.safeParse(user.id).success) throw new Error("Owner authentication is required");
  const { rows } = await getCachedOwnerRecord(user.id);
  if (!rows[0]) throw new Error("This workbench is restricted to active owners");
  return {
    id: user.id,
    email: user.email,
    name: stringValue(rows[0].Name) || user.profile?.name || user.email,
  };
}

export async function requireWorkbenchOwner() {
  return requireOwner();
}

async function loadWorkbenchData(): Promise<WorkbenchData> {
  const settled = await Promise.allSettled([
    sqlQuery(BASE_ID, `
      SELECT "__id", "First_Name", "First_Name1773607325102", "Last_Name", "Company",
        "Email", "Phone", "Address", "City", "State", "Zip"
      FROM ${TABLES.contacts}
      WHERE "Status" = 'Active'
      ORDER BY "Company" NULLS LAST, "Last_Name" NULLS LAST
      LIMIT 100
    `),
    sqlQuery(BASE_ID, `
      SELECT "__id", "Service_Name", "Category", "Unit", "Cost", "Unit_Price",
        "Description", "QBO_Item_ID"
      FROM ${TABLES.services}
      WHERE "Active" = true
      ORDER BY "Category" NULLS LAST, "Service_Name"
      LIMIT 100
    `),
    sqlQuery(BASE_ID, `
      SELECT "__id", "Full_Name", "Role"
      FROM ${TABLES.employees}
      WHERE "Status" = 'Active'
      ORDER BY "Full_Name"
      LIMIT 100
    `),
    sqlQuery(BASE_ID, `
      SELECT "__id", "Estimate_Name", "Routing_Status", "Routing_Error", "Requires_Estimate",
        "Routed_At", "Assigned_Crew", "Scheduled_Date", "Priority", "Job_Type",
        "Line_Items_Total", "Price_to_Quote", "Job_Photos", "__fk_fld7cKgjWVP8ODABgkS", "__fk_fldAVF8a8mk3RDa2FS1", "__fk_fldEZjt8n8wfwgZ44dp"
      FROM ${TABLES.pricing}
      WHERE "Routing_Status" IS NOT NULL
        AND COALESCE("Archive", false) = false
      ORDER BY "__created_time" DESC
      LIMIT 100
    `),
    sqlQuery(BASE_ID, `
      SELECT "__id", "Job", "Job_Name", "Status", "__fk_fldUwIRjAWUMGs78YSp",
        "__fk_fldZvoJFTUWqDWH3pzM", "Assigned_Crew", "Scheduled_Date", "Priority",
        "Job_Type", "Release_to_Pipeline"
      FROM ${TABLES.jobs}
      WHERE "Status" IN ('Waiting for Estimate', 'Active', 'Scheduled', 'In Progress')
      ORDER BY "Scheduled_Date" NULLS LAST, "__created_time" DESC
      LIMIT 100
    `),
    sqlQuery(BASE_ID, `
      SELECT "__id", "Estimate", "Estimate_Name", "Status", "__fk_fldS7ZFfBWqnQGrOoB6",
        "__fk_fldOZubmmeu0J38nmpg", "Subtotal", "Discount", "Tax", "Tax_Amount", "Total",
        "Notes", "Internal_Notes", "Estimate_Date", "Expiration_Date", "Create_QBO_Draft",
        "QBO_Sync_Status", "QBO_Sync_Error", "QBO_Estimate_ID", "QBO_Doc_Number",
        "QBO_Sync_Token", "QBO_Last_Synced", "Photos_to_Send"
      FROM ${TABLES.estimates}
      ORDER BY "__created_time" DESC
      LIMIT 100
    `),
  ]);

  const errors: WorkbenchData["errors"] = {};
  const resultRows = <T extends keyof WorkbenchData["errors"]>(index: number, key: T) => {
    const result = settled[index];
    if (result.status === "fulfilled") return result.value.rows;
    errors[key] = errorMessage(result.reason);
    return [];
  };

  const contacts = resultRows(0, "contacts").map(mapContact);
  const services = resultRows(1, "services").map(mapService);
  const employees = resultRows(2, "employees").map(mapEmployee);
  const pricingRows = resultRows(3, "pricing");
  const jobs = resultRows(4, "jobs").map(mapJob);
  const estimateRows = resultRows(5, "estimates");
  let lineRows: Record<string, unknown>[] = [];

  const draftEstimateIds = estimateRows
    .filter((row) => row.Status === "Draft")
    .map((row) => String(row.__id))
    .filter((id) => recordIdSchema.safeParse(id).success);

  if (draftEstimateIds.length > 0) {
    try {
      const response = await sqlQuery(BASE_ID, `
        SELECT "__id", "Line_Item", "__fk_fldVUkcNMUDRAoc1KB1", "__fk_fld9OvFBlZiIBYldoTP",
          "Description", "Quantity", "Unit_Price", "Total", "Line_Order"
        FROM ${TABLES.estimateLines}
        WHERE "__fk_fldVUkcNMUDRAoc1KB1" IN (${sqlIdList(draftEstimateIds)})
        ORDER BY "__fk_fldVUkcNMUDRAoc1KB1", "Line_Order" NULLS LAST, "__created_time"
        LIMIT 100
      `);
      lineRows = response.rows;
    } catch (error) {
      errors.estimateLines = errorMessage(error);
    }
  }

  const linesByEstimate = new Map<string, EstimateLine[]>();
  for (const row of lineRows) {
    const estimateId = stringValue(row.__fk_fldVUkcNMUDRAoc1KB1);
    if (!estimateId) continue;
    const lines = linesByEstimate.get(estimateId) || [];
    lines.push(mapEstimateLine(row));
    linesByEstimate.set(estimateId, lines);
  }

  const estimates = estimateRows.map((row) => {
    const id = String(row.__id);
    const lines = (linesByEstimate.get(id) || []).sort((a, b) => a.lineOrder - b.lineOrder);
    return mapEstimate(row, lines);
  });

  const mediaWithPricingId = pricingRows.flatMap((row) =>
    attachmentValues(row.Job_Photos).map((media) => ({ ...media, pricingId: String(row.__id) }))
  );
  let signedMedia = mediaWithPricingId;
  if (mediaWithPricingId.length > 0) {
    try {
      signedMedia = await signAttachments(BASE_ID, mediaWithPricingId);
    } catch (error) {
      errors.media = `Estimate media could not be loaded: ${errorMessage(error)}`;
    }
  }
  const mediaByPricing = new Map<string, EstimateMedia[]>();
  for (const media of signedMedia) {
    const entries = mediaByPricing.get(media.pricingId) || [];
    entries.push(media);
    mediaByPricing.set(media.pricingId, entries);
  }
  const recentPricing = pricingRows.map((row) => mapPricing(row, mediaByPricing.get(String(row.__id)) || []));

  return {
    contacts,
    services,
    employees,
    recentPricing,
    jobs,
    estimates,
    errors,
    loadedAt: new Date().toISOString(),
  };
}

const getCachedWorkbenchData = unstable_cache(
  loadWorkbenchData,
  [WORKBENCH_DATA_TAG, BASE_ID],
  { revalidate: 10, tags: [WORKBENCH_DATA_TAG] }
);

export async function getWorkbenchData(): Promise<WorkbenchData> {
  await requireOwner();
  return getCachedWorkbenchData();
}

export async function refreshWorkbenchData(): Promise<WorkbenchData> {
  await requireOwner();
  updateTag(WORKBENCH_DATA_TAG);
  return getCachedWorkbenchData();
}

async function validatePricingReferences(input: PricingJobInput) {
  if (input.outcome !== "pricing-only" && !input.contactId) {
    throw new Error("Select an active contact before creating a job or estimate");
  }

  const serviceIds = [...new Set(input.lines.flatMap((line) => line.serviceId ? [line.serviceId] : []))];
  const checks = await Promise.all([
    input.contactId
      ? sqlQuery(BASE_ID, `
          SELECT "__id"
          FROM ${TABLES.contacts}
          WHERE "__id" = '${sqlString(input.contactId)}' AND "Status" = 'Active'
          LIMIT 1
        `)
      : Promise.resolve({ rows: [] as Record<string, unknown>[] }),
    serviceIds.length > 0
      ? sqlQuery(BASE_ID, `
          SELECT "__id", "Category"
          FROM ${TABLES.services}
          WHERE "__id" IN (${sqlIdList(serviceIds)}) AND "Active" = true
          LIMIT 100
        `)
      : Promise.resolve({ rows: [] as Record<string, unknown>[] }),
    input.assignedCrewIds.length > 0
      ? sqlQuery(BASE_ID, `
          SELECT "__id"
          FROM ${TABLES.employees}
          WHERE "__id" IN (${sqlIdList(input.assignedCrewIds)}) AND "Status" = 'Active'
          LIMIT 100
        `)
      : Promise.resolve({ rows: [] as Record<string, unknown>[] }),
  ]);

  if (input.contactId && checks[0].rows.length !== 1) throw new Error("Select an active contact");
  if (checks[1].rows.length !== serviceIds.length) throw new Error("One or more services are no longer active");
  if (checks[2].rows.length !== input.assignedCrewIds.length) throw new Error("One or more crew members are no longer active");
  return stringValue(checks[1].rows[0]?.Category) || "Other";
}

export async function savePricingJob(rawInput: PricingJobInput) {
  await requireOwner();
  const parsed = pricingInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, kind: "validation" as const, message: parsed.error.issues[0]?.message || "Check required pricing fields" };
  }
  const input = parsed.data as PricingJobInput;

  let category: string | null;
  try {
    category = await validatePricingReferences(input);
  } catch (error) {
    return { ok: false, kind: "validation" as const, message: errorMessage(error) };
  }

  const firstServiceId = input.lines.find((line) => line.serviceId)?.serviceId || null;
  const requiresEstimate = input.outcome === "create-estimate";
  const headerFields: RecordFields = {
    [FIELDS.pricing.name]: input.name,
    [FIELDS.pricing.status]: "In Progress",
    [FIELDS.pricing.contact]: input.contactId ? [input.contactId] : null,
    [FIELDS.pricing.service]: firstServiceId ? [firstServiceId] : null,
    [FIELDS.pricing.requiresEstimate]: requiresEstimate,
    [FIELDS.pricing.crew]: input.outcome === "pricing-only" ? [] : input.assignedCrewIds,
    [FIELDS.pricing.scheduledDate]: input.outcome === "pricing-only" ? null : nullableDate(input.scheduledDate),
    [FIELDS.pricing.priority]: input.outcome === "pricing-only" ? null : input.priority,
    [FIELDS.pricing.jobType]: input.outcome === "pricing-only" ? null : input.jobType,
    [FIELDS.pricing.notes]: input.notes || null,
    [FIELDS.pricing.crewSize]: input.crewSize,
    [FIELDS.pricing.hours]: input.estimatedHours,
    [FIELDS.pricing.laborRate]: input.laborRate,
    [FIELDS.pricing.equipment]: input.equipmentCost,
    [FIELDS.pricing.fuel]: input.fuelCost,
    [FIELDS.pricing.materials]: input.materialsCost,
    [FIELDS.pricing.disposal]: input.disposalFees,
    [FIELDS.pricing.subcontractor]: input.subcontractorCost,
    [FIELDS.pricing.targetMargin]: input.targetMargin,
    [FIELDS.pricing.finalOverride]: input.finalPriceOverride,
    [FIELDS.pricing.acreage]: input.acreage,
    [FIELDS.pricing.visits]: input.visitsPerSeason,
    [FIELDS.pricing.frequency]: input.frequency,
    [FIELDS.pricing.terrain]: input.terrain,
    [FIELDS.pricing.condition]: input.condition,
    [FIELDS.pricing.season]: input.season,
    [FIELDS.pricing.category]: category,
    [FIELDS.pricing.routingStatus]: "Draft",
  };

  let pricingId: string;
  try {
    const header = await createRecord(TABLE_IDS.pricing, headerFields);
    pricingId = header.id;
  } catch (error) {
    return { ok: false, kind: "error" as const, message: `The pricing request could not be saved: ${errorMessage(error)}` };
  }

  try {
    await createRecords(TABLE_IDS.pricingLines, input.lines.map((line, index) => ({
      fields: {
        [FIELDS.pricingLine.name]: line.name,
        [FIELDS.pricingLine.pricing]: [pricingId],
        [FIELDS.pricingLine.service]: line.serviceId ? [line.serviceId] : null,
        [FIELDS.pricingLine.quantity]: line.quantity,
        [FIELDS.pricingLine.unitPrice]: line.unitPrice,
        [FIELDS.pricingLine.description]: line.description || null,
        [FIELDS.pricingLine.order]: (index + 1) * 10,
      },
    })));
  } catch (error) {
    return {
      ok: false,
      kind: "partial" as const,
      pricingId,
      message: `The pricing request was saved, but its services could not be saved: ${errorMessage(error)}`,
    };
  }

  const routingStatus: "Pricing Saved" | "Ready to Route" = input.outcome === "pricing-only" ? "Pricing Saved" : "Ready to Route";
  try {
    await updateRecord(TABLE_IDS.pricing, pricingId, {
      [FIELDS.pricing.routingStatus]: routingStatus,
    });
  } catch (error) {
    return {
      ok: false,
      kind: "partial" as const,
      pricingId,
      message: `Pricing and services were saved, but the selected next step could not be started: ${errorMessage(error)}`,
    };
  }

  return {
    ok: true,
    pricingId,
    routingStatus,
    message: input.outcome === "pricing-only"
      ? "Pricing saved without creating a job or estimate."
      : requiresEstimate
        ? "Pricing saved. Creating the estimate and job."
        : "Pricing saved. Creating the job.",
  };
}

export async function promoteSavedPricing(rawInput: PricingPromotionInput) {
  await requireOwner();
  const parsed = pricingPromotionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, kind: "validation" as const, message: parsed.error.issues[0]?.message || "Check the job setup" };
  }
  const input = parsed.data;

  const [pricingResult, contactResult, crewResult] = await Promise.all([
    sqlQuery(BASE_ID, `
      SELECT "__id", "Routing_Status", "__fk_fldAVF8a8mk3RDa2FS1", "__fk_fldEZjt8n8wfwgZ44dp"
      FROM ${TABLES.pricing}
      WHERE "__id" = '${sqlString(input.pricingId)}'
      LIMIT 1
    `),
    sqlQuery(BASE_ID, `
      SELECT "__id"
      FROM ${TABLES.contacts}
      WHERE "__id" = '${sqlString(input.contactId)}' AND "Status" = 'Active'
      LIMIT 1
    `),
    input.assignedCrewIds.length > 0
      ? sqlQuery(BASE_ID, `
          SELECT "__id"
          FROM ${TABLES.employees}
          WHERE "__id" IN (${sqlIdList(input.assignedCrewIds)}) AND "Status" = 'Active'
          LIMIT 100
        `)
      : Promise.resolve({ rows: [] as Record<string, unknown>[] }),
  ]);

  const current = pricingResult.rows[0];
  if (!current) return { ok: false, kind: "validation" as const, message: "Saved pricing was not found" };
  if (current.Routing_Status !== "Pricing Saved") {
    return { ok: false, kind: "validation" as const, message: "Only standalone saved pricing can be promoted" };
  }
  if (current.__fk_fldAVF8a8mk3RDa2FS1 || current.__fk_fldEZjt8n8wfwgZ44dp) {
    return { ok: false, kind: "validation" as const, message: "This pricing is already connected to a job or estimate" };
  }
  if (contactResult.rows.length !== 1) {
    return { ok: false, kind: "validation" as const, message: "Select an active contact" };
  }
  if (crewResult.rows.length !== input.assignedCrewIds.length) {
    return { ok: false, kind: "validation" as const, message: "One or more crew members are no longer active" };
  }

  try {
    await updateRecord(TABLE_IDS.pricing, input.pricingId, {
      [FIELDS.pricing.contact]: [input.contactId],
      [FIELDS.pricing.requiresEstimate]: input.outcome === "create-estimate",
      [FIELDS.pricing.crew]: input.assignedCrewIds,
      [FIELDS.pricing.scheduledDate]: nullableDate(input.scheduledDate),
      [FIELDS.pricing.priority]: input.priority,
      [FIELDS.pricing.jobType]: input.jobType,
      [FIELDS.pricing.routingError]: null,
      [FIELDS.pricing.routedAt]: null,
      [FIELDS.pricing.routingStatus]: "Ready to Route",
    });
  } catch (error) {
    return { ok: false, kind: "error" as const, message: `The saved pricing could not be promoted: ${errorMessage(error)}` };
  }

  return {
    ok: true,
    pricingId: input.pricingId,
    routingStatus: "Ready to Route" as const,
    message: input.outcome === "create-estimate"
      ? "Creating the estimate and job from saved pricing."
      : "Creating the job from saved pricing.",
  };
}

export async function archivePricing(pricingId: string): Promise<ActionResult> {
  await requireOwner();
  if (!recordIdSchema.safeParse(pricingId).success) {
    return { ok: false, kind: "validation", message: "Invalid pricing record" };
  }

  const { rows } = await sqlQuery(BASE_ID, `
    SELECT "__id", "Archive", "Routing_Status"
    FROM ${TABLES.pricing}
    WHERE "__id" = '${sqlString(pricingId)}'
    LIMIT 1
  `);
  const pricing = rows[0];
  if (!pricing) return { ok: false, kind: "validation", message: "Pricing record not found" };
  if (booleanValue(pricing.Archive)) {
    return { ok: false, kind: "validation", message: "Pricing is already archived" };
  }
  if (["Ready to Route", "Routing"].includes(stringValue(pricing.Routing_Status))) {
    return { ok: false, kind: "validation", message: "Pricing cannot be archived while records are being created" };
  }

  try {
    await updateRecord(TABLE_IDS.pricing, pricingId, {
      [FIELDS.pricing.archive]: true,
      [FIELDS.pricing.status]: "Closed",
    });
    return { ok: true, message: "Pricing archived. Linked work was kept." };
  } catch (error) {
    return { ok: false, kind: "error", message: `Pricing could not be archived: ${errorMessage(error)}` };
  }
}

export async function getPricingResult(pricingId: string) {
  await requireOwner();
  if (!recordIdSchema.safeParse(pricingId).success) {
    return { ok: false, message: "Invalid pricing request" };
  }

  const { rows } = await sqlQuery(BASE_ID, `
    SELECT "__id", "Estimate_Name", "Routing_Status", "Routing_Error", "Requires_Estimate",
      "Routed_At", "Assigned_Crew", "Scheduled_Date", "Priority", "Job_Type",
      "Line_Items_Total", "Price_to_Quote", "__fk_fld7cKgjWVP8ODABgkS", "__fk_fldAVF8a8mk3RDa2FS1", "__fk_fldEZjt8n8wfwgZ44dp"
    FROM ${TABLES.pricing}
    WHERE "__id" = '${sqlString(pricingId)}'
    LIMIT 1
  `);
  if (!rows[0]) return { ok: false, message: "Pricing request not found" };

  const pricing = mapPricing(rows[0]);
  const related = await Promise.allSettled([
    pricing.jobId
      ? sqlQuery(BASE_ID, `
          SELECT "__id", "Job", "Job_Name", "Status"
          FROM ${TABLES.jobs}
          WHERE "__id" = '${sqlString(pricing.jobId)}'
          LIMIT 1
        `)
      : Promise.resolve({ rows: [] as Record<string, unknown>[] }),
    pricing.estimateId
      ? sqlQuery(BASE_ID, `
          SELECT "__id", "Estimate", "Estimate_Name", "Status", "Total", "QBO_Sync_Status"
          FROM ${TABLES.estimates}
          WHERE "__id" = '${sqlString(pricing.estimateId)}'
          LIMIT 1
        `)
      : Promise.resolve({ rows: [] as Record<string, unknown>[] }),
  ]);

  const jobRow = related[0].status === "fulfilled" ? related[0].value.rows[0] : null;
  const estimateRow = related[1].status === "fulfilled" ? related[1].value.rows[0] : null;
  return {
    ok: true,
    pricing,
    job: jobRow ? {
      id: String(jobRow.__id),
      number: jobRow.Job == null ? null : numberValue(jobRow.Job),
      name: stringValue(jobRow.Job_Name),
      status: stringValue(jobRow.Status),
    } : null,
    estimate: estimateRow ? {
      id: String(estimateRow.__id),
      number: estimateRow.Estimate == null ? null : numberValue(estimateRow.Estimate),
      name: stringValue(estimateRow.Estimate_Name),
      status: stringValue(estimateRow.Status),
      total: numberValue(estimateRow.Total),
      qboSyncStatus: stringValue(estimateRow.QBO_Sync_Status),
    } : null,
    relatedErrors: related.flatMap((item) => item.status === "rejected" ? [errorMessage(item.reason)] : []),
  };
}

function estimateLineFields(line: EstimateLine, estimateId: string, order: number): RecordFields {
  return {
    [FIELDS.estimateLine.name]: line.name,
    [FIELDS.estimateLine.estimate]: [estimateId],
    [FIELDS.estimateLine.service]: line.serviceId ? [line.serviceId] : null,
    [FIELDS.estimateLine.description]: line.description || null,
    [FIELDS.estimateLine.quantity]: line.quantity,
    [FIELDS.estimateLine.unitPrice]: line.unitPrice,
    [FIELDS.estimateLine.total]: Math.round(line.quantity * line.unitPrice * 100) / 100,
    [FIELDS.estimateLine.order]: order,
  };
}

export async function saveEstimate(rawInput: unknown): Promise<ActionResult> {
  await requireOwner();
  const parsed = estimateInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, kind: "validation", message: parsed.error.issues[0]?.message || "Check estimate fields" };
  }
  const input = parsed.data;
  if (input.expirationDate < input.estimateDate) {
    return { ok: false, kind: "validation", message: "Expiration date must be on or after the estimate date" };
  }

  const current = await Promise.all([
    sqlQuery(BASE_ID, `
      SELECT "__id", "Status"
      FROM ${TABLES.estimates}
      WHERE "__id" = '${sqlString(input.estimateId)}'
      LIMIT 1
    `),
    sqlQuery(BASE_ID, `
      SELECT "__id", "Status", "__fk_fldZvoJFTUWqDWH3pzM"
      FROM ${TABLES.jobs}
      WHERE "Status" = 'Waiting for Estimate'
        AND "__fk_fldZvoJFTUWqDWH3pzM" = '${sqlString(input.estimateId)}'
      LIMIT 1
    `),
    sqlQuery(BASE_ID, `
      SELECT "__id"
      FROM ${TABLES.estimateLines}
      WHERE "__fk_fldVUkcNMUDRAoc1KB1" = '${sqlString(input.estimateId)}'
      LIMIT 100
    `),
    sqlQuery(BASE_ID, `
      SELECT "__id", "Job_Photos"
      FROM ${TABLES.pricing}
      WHERE "__fk_fldEZjt8n8wfwgZ44dp" = '${sqlString(input.estimateId)}'
      ORDER BY "__created_time" DESC
      LIMIT 1
    `),
  ]);

  if (!current[0].rows[0] || current[0].rows[0].Status !== "Draft") {
    return { ok: false, kind: "validation", message: "Only draft estimates can be edited or marked for QuickBooks" };
  }
  if (!current[1].rows[0]) {
    return { ok: false, kind: "validation", message: "This draft estimate is no longer connected to a job awaiting approval" };
  }

  const availablePhotos = attachmentValues(current[3].rows[0]?.Job_Photos)
    .filter((media) => media.mimetype.startsWith("image/"));
  const photosByToken = new Map(availablePhotos.map((photo) => [photo.token, photo]));
  const requestedPhotoTokens = [...new Set(input.photoTokensToSend)];
  if (requestedPhotoTokens.some((token) => !photosByToken.has(token))) {
    return { ok: false, kind: "validation", message: "One or more selected pictures are no longer attached to this estimate" };
  }

  const existingIds = new Set(current[2].rows.map((row) => String(row.__id)));
  const submittedExistingIds = new Set(
    input.lines.filter((line) => recordIdSchema.safeParse(line.id).success).map((line) => line.id)
  );
  if ([...submittedExistingIds].some((id) => !existingIds.has(id))) {
    return { ok: false, kind: "validation", message: "An estimate line no longer belongs to this estimate" };
  }

  const normalizedLines: EstimateLine[] = input.lines.map((line, index) => ({
    id: line.id,
    serviceId: line.serviceId,
    name: line.name,
    description: line.description,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    lineOrder: (index + 1) * 10,
    total: Math.round(line.quantity * line.unitPrice * 100) / 100,
  }));
  const subtotal = Math.round(normalizedLines.reduce((sum, line) => sum + line.total, 0) * 100) / 100;
  if (input.discount > subtotal) {
    return { ok: false, kind: "validation", message: "Discount cannot exceed the subtotal" };
  }
  const taxable = Math.max(0, subtotal - input.discount);
  const taxAmount = Math.round(taxable * (input.taxPercent / 100) * 100) / 100;
  const total = Math.round((taxable + taxAmount) * 100) / 100;

  const updates = normalizedLines.filter((line) => recordIdSchema.safeParse(line.id).success);
  const creates = normalizedLines.filter((line) => !recordIdSchema.safeParse(line.id).success);
  const upserts = await Promise.allSettled([
    updates.length > 0
      ? updateRecords(TABLE_IDS.estimateLines, updates.map((line) => ({
          id: line.id,
          fields: estimateLineFields(line, input.estimateId, line.lineOrder),
        })))
      : Promise.resolve([]),
    creates.length > 0
      ? createRecords(TABLE_IDS.estimateLines, creates.map((line) => ({
          fields: estimateLineFields(line, input.estimateId, line.lineOrder),
        })))
      : Promise.resolve({ records: [] }),
  ]);

  const upsertErrors = upserts.flatMap((result) => result.status === "rejected" ? [errorMessage(result.reason)] : []);
  if (upsertErrors.length > 0) {
    return {
      ok: false,
      kind: "partial",
      message: `Some service changes may have saved, but the estimate total was not updated: ${upsertErrors.join("; ")}`,
    };
  }

  const removedIds = [...existingIds].filter((id) => !submittedExistingIds.has(id));
  if (removedIds.length > 0) {
    try {
      await deleteRecords(TABLE_IDS.estimateLines, removedIds);
    } catch (error) {
      return {
        ok: false,
        kind: "partial",
        message: `Service changes were saved, but removed services could not be deleted and the estimate total was not updated: ${errorMessage(error)}`,
      };
    }
  }

  const headerFields: RecordFields = {
    [FIELDS.estimate.name]: input.name,
    [FIELDS.estimate.subtotal]: subtotal,
    [FIELDS.estimate.discount]: input.discount,
    [FIELDS.estimate.taxPercent]: input.taxPercent,
    [FIELDS.estimate.taxAmount]: taxAmount,
    [FIELDS.estimate.total]: total,
    [FIELDS.estimate.notes]: input.notes || null,
    [FIELDS.estimate.internalNotes]: input.internalNotes || null,
    [FIELDS.estimate.estimateDate]: nullableDate(input.estimateDate),
    [FIELDS.estimate.expirationDate]: nullableDate(input.expirationDate),
    [FIELDS.estimate.photosToSend]: requestedPhotoTokens.map((token) => {
      const photo = photosByToken.get(token)!;
      return { ...(photo.id ? { id: photo.id } : {}), name: photo.name, token: photo.token };
    }),
  };
  if (input.queueQboDraft) {
    headerFields[FIELDS.estimate.createQboDraft] = true;
    headerFields[FIELDS.estimate.qboSyncStatus] = "Queued for Draft";
  }

  try {
    await updateRecord(TABLE_IDS.estimates, input.estimateId, headerFields);
  } catch (error) {
    return {
      ok: false,
      kind: "partial",
      message: `Services were saved, but the estimate totals${input.queueQboDraft ? " and QuickBooks request" : ""} could not be saved: ${errorMessage(error)}`,
    };
  }

  return {
    ok: true,
    message: input.queueQboDraft
      ? "Estimate saved and marked for QuickBooks"
      : "Draft estimate saved",
  };
}

export async function changeDraftEstimateStatus(rawInput: unknown): Promise<ActionResult> {
  await requireOwner();
  const parsed = estimateStatusSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, kind: "validation", message: "Choose a valid estimate status" };
  }
  const { estimateId, status } = parsed.data;
  const [estimateResult, jobsResult] = await Promise.all([
    sqlQuery(BASE_ID, `
      SELECT "__id", "Estimate", "Status"
      FROM ${TABLES.estimates}
      WHERE "__id" = '${sqlString(estimateId)}'
      LIMIT 1
    `),
    sqlQuery(BASE_ID, `
      SELECT "__id", "Status"
      FROM ${TABLES.jobs}
      WHERE "__fk_fldZvoJFTUWqDWH3pzM" = '${sqlString(estimateId)}'
      LIMIT 100
    `),
  ]);
  const estimate = estimateResult.rows[0];
  if (!estimate || estimate.Status !== "Draft") {
    return { ok: false, kind: "validation", message: "Only draft estimates in Estimates to finish can be changed here" };
  }

  try {
    await updateRecord(TABLE_IDS.estimates, estimateId, { [FIELDS.estimate.status]: status });
  } catch (error) {
    return { ok: false, kind: "error", message: `Estimate status was not changed: ${errorMessage(error)}` };
  }

  if (["Declined", "Expired"].includes(status) && jobsResult.rows.length > 0) {
    try {
      await updateRecords(TABLE_IDS.jobs, jobsResult.rows.map((job) => ({
        id: String(job.__id),
        fields: { [FIELDS.job.status]: "On Hold" },
      })));
    } catch (error) {
      return {
        ok: false,
        kind: "partial",
        message: `Estimate marked ${status}, but the job could not be put on hold: ${errorMessage(error)}`,
      };
    }
  }

  return { ok: true, message: `Estimate marked ${status}` };
}

export async function deleteDraftEstimate(estimateId: string): Promise<ActionResult> {
  await requireOwner();
  if (!recordIdSchema.safeParse(estimateId).success) {
    return { ok: false, kind: "validation", message: "Invalid estimate" };
  }
  const [estimateResult, linesResult, jobsResult, pricingResult] = await Promise.all([
    sqlQuery(BASE_ID, `
      SELECT "__id", "Estimate", "Status"
      FROM ${TABLES.estimates}
      WHERE "__id" = '${sqlString(estimateId)}'
      LIMIT 1
    `),
    sqlQuery(BASE_ID, `
      SELECT "__id"
      FROM ${TABLES.estimateLines}
      WHERE "__fk_fldVUkcNMUDRAoc1KB1" = '${sqlString(estimateId)}'
      LIMIT 100
    `),
    sqlQuery(BASE_ID, `
      SELECT "__id"
      FROM ${TABLES.jobs}
      WHERE "__fk_fldZvoJFTUWqDWH3pzM" = '${sqlString(estimateId)}'
      LIMIT 100
    `),
    sqlQuery(BASE_ID, `
      SELECT "__id"
      FROM ${TABLES.pricing}
      WHERE "__fk_fldEZjt8n8wfwgZ44dp" = '${sqlString(estimateId)}'
      LIMIT 100
    `),
  ]);
  const estimate = estimateResult.rows[0];
  if (!estimate || estimate.Status !== "Draft") {
    return { ok: false, kind: "validation", message: "Only draft estimates in Estimates to finish can be deleted here" };
  }

  const lineIds = linesResult.rows.map((line) => String(line.__id));
  if (lineIds.length > 0) {
    try {
      await deleteRecords(TABLE_IDS.estimateLines, lineIds);
    } catch (error) {
      return { ok: false, kind: "error", message: `Estimate lines could not be deleted: ${errorMessage(error)}` };
    }
  }

  try {
    await deleteRecords(TABLE_IDS.estimates, [estimateId]);
  } catch (error) {
    return {
      ok: false,
      kind: "partial",
      message: `Estimate lines were deleted, but the estimate could not be deleted. It remains available to retry: ${errorMessage(error)}`,
    };
  }

  const cleanupResults = await Promise.allSettled([
    jobsResult.rows.length > 0
      ? updateRecords(TABLE_IDS.jobs, jobsResult.rows.map((job) => ({
          id: String(job.__id),
          fields: {
            [FIELDS.job.status]: "On Hold",
            [FIELDS.job.estimate]: null,
          },
        })))
      : Promise.resolve([]),
    pricingResult.rows.length > 0
      ? updateRecords(TABLE_IDS.pricing, pricingResult.rows.map((pricing) => ({
          id: String(pricing.__id),
          fields: { [FIELDS.pricing.estimate]: null },
        })))
      : Promise.resolve([]),
  ]);
  const cleanupErrors = cleanupResults.flatMap((result) => result.status === "rejected" ? [errorMessage(result.reason)] : []);
  if (cleanupErrors.length > 0) {
    return {
      ok: false,
      kind: "partial",
      message: `Estimate #${numberValue(estimate.Estimate)} was deleted, but its related job information could not be fully updated: ${cleanupErrors.join("; ")}`,
    };
  }

  return { ok: true, message: `Estimate #${numberValue(estimate.Estimate)} deleted` };
}

export async function releaseJob(jobId: string): Promise<ActionResult> {
  await requireOwner();
  if (!recordIdSchema.safeParse(jobId).success) {
    return { ok: false, kind: "validation", message: "Invalid job" };
  }
  const { rows } = await sqlQuery(BASE_ID, `
    SELECT "__id", "Status", "__fk_fldZvoJFTUWqDWH3pzM"
    FROM ${TABLES.jobs}
    WHERE "__id" = '${sqlString(jobId)}'
    LIMIT 1
  `);
  const job = rows[0];
  if (!job || job.Status !== "Waiting for Estimate" || !job.__fk_fldZvoJFTUWqDWH3pzM) {
    return { ok: false, kind: "validation", message: "This job is no longer waiting for estimate approval" };
  }

  try {
    await updateRecord(TABLE_IDS.jobs, jobId, { [FIELDS.job.release]: true });
    return { ok: true, message: "Approval submitted. The job is being prepared." };
  } catch (error) {
    return { ok: false, kind: "error", message: `Approval could not be submitted: ${errorMessage(error)}` };
  }
}

export async function cancelJob(jobId: string): Promise<ActionResult> {
  await requireOwner();
  if (!recordIdSchema.safeParse(jobId).success) {
    return { ok: false, kind: "validation", message: "Invalid job" };
  }

  const { rows } = await sqlQuery(BASE_ID, `
    SELECT "__id", "Job", "Status", "__fk_fldZvoJFTUWqDWH3pzM"
    FROM ${TABLES.jobs}
    WHERE "__id" = '${sqlString(jobId)}'
    LIMIT 1
  `);
  const job = rows[0];
  if (!job) return { ok: false, kind: "validation", message: "Job not found" };
  const previousStatus = stringValue(job.Status);
  if (!["Active", "Waiting for Estimate"].includes(previousStatus)) {
    return { ok: false, kind: "validation", message: "Only active or estimate-waiting jobs can be cancelled here" };
  }

  try {
    await updateRecord(TABLE_IDS.jobs, jobId, {
      [FIELDS.job.status]: "Cancelled",
      [FIELDS.job.release]: false,
    });
  } catch (error) {
    return { ok: false, kind: "error", message: `Job could not be cancelled: ${errorMessage(error)}` };
  }

  const estimateId = stringValue(job.__fk_fldZvoJFTUWqDWH3pzM);
  if (previousStatus === "Waiting for Estimate" && estimateId) {
    try {
      const estimateResult = await sqlQuery(BASE_ID, `
        SELECT "__id", "Status"
        FROM ${TABLES.estimates}
        WHERE "__id" = '${sqlString(estimateId)}'
        LIMIT 1
      `);
      const estimate = estimateResult.rows[0];
      if (estimate && ["Draft", "Sent", "Viewed"].includes(stringValue(estimate.Status))) {
        await updateRecord(TABLE_IDS.estimates, estimateId, { [FIELDS.estimate.status]: "Declined" });
      }
    } catch (error) {
      return {
        ok: false,
        kind: "partial",
        message: `Job #${numberValue(job.Job)} was cancelled, but its estimate could not be marked declined: ${errorMessage(error)}`,
      };
    }
  }

  return { ok: true, message: `Job #${numberValue(job.Job)} cancelled` };
}

export async function getReleaseResult(jobId: string) {
  await requireOwner();
  if (!recordIdSchema.safeParse(jobId).success) return { ok: false, message: "Invalid job" };
  const { rows } = await sqlQuery(BASE_ID, `
    SELECT "__id", "Job", "Job_Name", "Status", "Release_to_Pipeline", "__fk_fldZvoJFTUWqDWH3pzM"
    FROM ${TABLES.jobs}
    WHERE "__id" = '${sqlString(jobId)}'
    LIMIT 1
  `);
  if (!rows[0]) return { ok: false, message: "Job not found" };
  const estimateId = stringValue(rows[0].__fk_fldZvoJFTUWqDWH3pzM);
  const estimateResult = estimateId
    ? await sqlQuery(BASE_ID, `
        SELECT "__id", "Estimate", "Estimate_Name", "Status"
        FROM ${TABLES.estimates}
        WHERE "__id" = '${sqlString(estimateId)}'
        LIMIT 1
      `)
    : { rows: [] as Record<string, unknown>[] };
  const estimate = estimateResult.rows[0];
  return {
    ok: true,
    job: {
      id: String(rows[0].__id),
      number: rows[0].Job == null ? null : numberValue(rows[0].Job),
      name: stringValue(rows[0].Job_Name),
      status: stringValue(rows[0].Status),
      releaseToPipeline: booleanValue(rows[0].Release_to_Pipeline),
    },
    estimate: estimate ? {
      id: String(estimate.__id),
      number: estimate.Estimate == null ? null : numberValue(estimate.Estimate),
      name: stringValue(estimate.Estimate_Name),
      status: stringValue(estimate.Status),
    } : null,
  };
}

export async function completeJobAndSendToBilling(rawInput: unknown): Promise<ActionResult> {
  await requireOwner();
  const parsed = completionInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, kind: "validation", message: parsed.error.issues[0]?.message || "Check completion fields" };
  }
  const input = parsed.data;

  const { rows } = await sqlQuery(BASE_ID, `
    SELECT "__id", "Job", "Status", "Ready_to_Invoice", "Billing_Status",
      "Billing_Hold_Reason", "__fk_fldBcL6fyGKeea8dspO"
    FROM ${TABLES.jobs}
    WHERE "__id" = '${sqlString(input.jobId)}'
    LIMIT 1
  `);
  const job = rows[0];
  if (!job) return { ok: false, kind: "validation", message: "Job not found" };
  if (stringValue(job.__fk_fldBcL6fyGKeea8dspO)) {
    return { ok: false, kind: "validation", message: "This job is already linked to an invoice and cannot be released again" };
  }

  const status = stringValue(job.Status);
  const billingStatus = stringValue(job.Billing_Status);
  const isConsistentlyReleased = status === "Completed"
    && booleanValue(job.Ready_to_Invoice)
    && BILLING_DISPOSITIONS.includes(billingStatus as (typeof BILLING_DISPOSITIONS)[number])
    && (billingStatus !== "Billing Hold" || Boolean(stringValue(job.Billing_Hold_Reason)?.trim()));
  if (isConsistentlyReleased) {
    return { ok: true, message: `Job #${numberValue(job.Job)} is already completed and released to billing` };
  }
  if (!OPERATIONAL_JOB_STATUSES.includes(status as (typeof OPERATIONAL_JOB_STATUSES)[number])) {
    return {
      ok: false,
      kind: "validation",
      message: status === "Completed"
        ? "This completed job is not consistently released to billing. Review the Job List record before retrying."
        : "Only Active, Scheduled, or In Progress jobs can be completed here",
    };
  }

  const fields: RecordFields = {
    [FIELDS.job.status]: "Completed",
    [FIELDS.job.completedDate]: nullableDate(input.completedDate),
    [FIELDS.job.completionNotes]: input.completionNotes.trim() || null,
    [FIELDS.job.readyToInvoice]: true,
    [FIELDS.job.billingStatus]: input.billingDisposition,
    [FIELDS.job.billingHoldReason]: input.billingDisposition === "Billing Hold"
      ? input.billingHoldReason.trim()
      : null,
  };
  if (input.proposedInvoiceAmount !== null) {
    fields[FIELDS.job.proposedInvoiceAmount] = input.proposedInvoiceAmount;
  }

  try {
    await updateRecord(TABLE_IDS.jobs, input.jobId, fields);
    updateTag(WORKBENCH_DATA_TAG);
    return { ok: true, message: `Job #${numberValue(job.Job)} completed and sent to billing` };
  } catch (error) {
    return { ok: false, kind: "error", message: `Job could not be sent to billing: ${errorMessage(error)}` };
  }
}

export async function updateActiveJob(rawInput: unknown): Promise<ActionResult> {
  await requireOwner();
  const schema = z.object({
    jobId: recordIdSchema,
    assignedCrewIds: z.array(recordIdSchema).max(25),
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    priority: z.enum(JOB_PRIORITIES),
    jobType: z.enum(JOB_TYPES),
  });
  const parsed = schema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, kind: "validation", message: "Check assignment fields" };
  const input = parsed.data;

  const checks = await Promise.all([
    sqlQuery(BASE_ID, `
      SELECT "__id", "Status"
      FROM ${TABLES.jobs}
      WHERE "__id" = '${sqlString(input.jobId)}'
      LIMIT 1
    `),
    input.assignedCrewIds.length > 0
      ? sqlQuery(BASE_ID, `
          SELECT "__id"
          FROM ${TABLES.employees}
          WHERE "__id" IN (${sqlIdList(input.assignedCrewIds)}) AND "Status" = 'Active'
          LIMIT 100
        `)
      : Promise.resolve({ rows: [] as Record<string, unknown>[] }),
  ]);
  const currentStatus = stringValue(checks[0].rows[0]?.Status);
  if (!OPERATIONAL_JOB_STATUSES.includes(currentStatus as (typeof OPERATIONAL_JOB_STATUSES)[number])) {
    return { ok: false, kind: "validation", message: "Job is no longer Active, Scheduled, or In Progress" };
  }
  if (checks[1].rows.length !== input.assignedCrewIds.length) {
    return { ok: false, kind: "validation", message: "One or more crew members are no longer active" };
  }

  try {
    await updateRecord(TABLE_IDS.jobs, input.jobId, {
      [FIELDS.job.crew]: input.assignedCrewIds,
      [FIELDS.job.scheduledDate]: nullableDate(input.scheduledDate),
      [FIELDS.job.priority]: input.priority,
      [FIELDS.job.jobType]: input.jobType,
    });
    return { ok: true, message: "Job assignment updated" };
  } catch (error) {
    return { ok: false, kind: "error", message: `Assignment update failed: ${errorMessage(error)}` };
  }
}
