export const ROUTING_TERMINAL_STATUSES = [
  "Job Active",
  "Waiting for Estimate",
  "Pricing Saved",
  "Error",
] as const;

export const ROUTING_STATUSES = [
  "Draft",
  "Ready to Route",
  "Routing",
  ...ROUTING_TERMINAL_STATUSES,
] as const;

export const PRICING_OUTCOMES = ["pricing-only", "create-job", "create-estimate"] as const;
export const JOB_PRIORITIES = ["Low", "Normal", "High", "Urgent"] as const;
export const JOB_TYPES = ["One-Time", "Recurring", "Maintenance", "Emergency"] as const;
export const ESTIMATE_QUEUE_STATUSES = ["Sent", "Viewed", "Declined", "Expired"] as const;
export const FREQUENCIES = [
  "One-Time",
  "Weekly",
  "Bi-Weekly",
  "Monthly",
  "Quarterly",
  "Seasonal",
] as const;
export const TERRAIN_OPTIONS = [
  "Easy (Flat/Open)",
  "Moderate (Some Slopes/Obstacles)",
  "Difficult (Steep/Heavy Obstacles)",
] as const;
export const CONDITION_OPTIONS = [
  "Well Maintained",
  "Overgrown",
  "First-Time Cleanup",
  "One-Time",
] as const;
export const SEASONS = ["Spring", "Summer", "Fall", "Winter"] as const;

export type RoutingStatus = (typeof ROUTING_STATUSES)[number];
export type PricingOutcome = (typeof PRICING_OUTCOMES)[number];
export type JobPriority = (typeof JOB_PRIORITIES)[number];
export type JobType = (typeof JOB_TYPES)[number];
export type EstimateQueueStatus = (typeof ESTIMATE_QUEUE_STATUSES)[number];

export type ContactOption = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

export type ServiceOption = {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
  cost: number;
  unitPrice: number;
  description: string | null;
  qboItemId: string | null;
};

export type EmployeeOption = {
  id: string;
  name: string;
  role: string | null;
};

export type EstimateLine = {
  id: string;
  serviceId: string | null;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  lineOrder: number;
};

export type EstimateRecord = {
  id: string;
  number: number | null;
  name: string;
  status: string | null;
  contactId: string | null;
  assignedToId: string | null;
  subtotal: number;
  discount: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  notes: string;
  internalNotes: string;
  estimateDate: string | null;
  expirationDate: string | null;
  createQboDraft: boolean;
  qboSyncStatus: string | null;
  qboSyncError: string | null;
  qboEstimateId: string | null;
  qboDocNumber: string | null;
  qboSyncToken: string | null;
  qboLastSynced: string | null;
  lines: EstimateLine[];
};

export type JobRecord = {
  id: string;
  number: number | null;
  name: string;
  status: string | null;
  contactId: string | null;
  estimateId: string | null;
  assignedCrewIds: string[];
  scheduledDate: string | null;
  priority: JobPriority | null;
  jobType: JobType | null;
  releaseToPipeline: boolean;
};

export type PricingRecord = {
  id: string;
  name: string;
  routingStatus: RoutingStatus | null;
  routingError: string | null;
  requiresEstimate: boolean;
  contactId: string | null;
  assignedCrewIds: string[];
  scheduledDate: string | null;
  priority: JobPriority | null;
  jobType: JobType | null;
  totalPrice: number;
  jobId: string | null;
  estimateId: string | null;
  routedAt: string | null;
};

export type SectionErrors = Partial<
  Record<"contacts" | "services" | "employees" | "pricing" | "jobs" | "estimates" | "estimateLines", string>
>;

export type WorkbenchData = {
  contacts: ContactOption[];
  services: ServiceOption[];
  employees: EmployeeOption[];
  recentPricing: PricingRecord[];
  jobs: JobRecord[];
  estimates: EstimateRecord[];
  errors: SectionErrors;
  loadedAt: string;
};

export type PricingLineInput = {
  serviceId: string | null;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineOrder: number;
};

export type PricingJobInput = {
  name: string;
  contactId: string | null;
  lines: PricingLineInput[];
  outcome: PricingOutcome;
  assignedCrewIds: string[];
  scheduledDate: string | null;
  priority: JobPriority;
  jobType: JobType;
  notes: string;
  crewSize: number | null;
  estimatedHours: number | null;
  laborRate: number | null;
  equipmentCost: number | null;
  fuelCost: number | null;
  materialsCost: number | null;
  disposalFees: number | null;
  subcontractorCost: number | null;
  targetMargin: number | null;
  finalPriceOverride: number | null;
  acreage: number | null;
  visitsPerSeason: number | null;
  frequency: string | null;
  terrain: string | null;
  condition: string | null;
  season: string | null;
};

export type PricingPromotionInput = {
  pricingId: string;
  outcome: Exclude<PricingOutcome, "pricing-only">;
  contactId: string;
  assignedCrewIds: string[];
  scheduledDate: string | null;
  priority: JobPriority;
  jobType: JobType;
};

export type EstimateSaveInput = {
  estimateId: string;
  name: string;
  notes: string;
  internalNotes: string;
  estimateDate: string;
  expirationDate: string;
  discount: number;
  taxPercent: number;
  queueQboDraft: boolean;
  lines: EstimateLine[];
};

export type ActionResult = {
  ok: boolean;
  kind?: "validation" | "partial" | "error";
  message: string;
};
