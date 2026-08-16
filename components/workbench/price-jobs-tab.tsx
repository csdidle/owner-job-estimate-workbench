"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Archive,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  CircleDollarSign,
  Clock3,
  FilePenLine,
  Loader2,
  PencilLine,
  Plus,
  RefreshCw,
  ListChecks,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { archivePricing, getPricingResult, promoteSavedPricing, savePricingJob } from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  CONDITION_OPTIONS,
  FREQUENCIES,
  JOB_PRIORITIES,
  JOB_TYPES,
  SEASONS,
  TERRAIN_OPTIONS,
  type ActionResult,
  type PricingJobInput,
  type PricingLineInput,
  type PricingOutcome,
  type PricingPromotionInput,
  type PricingRecord,
  type ServiceOption,
  type WorkbenchData,
} from "@/lib/workbench-contract";
import {
  CrewPicker,
  EmptyState,
  Field,
  IconButton,
  NativeSelect,
  NumericInput,
  SectionError,
  StatusBadge,
  money,
} from "./shared";

type DraftLine = PricingLineInput & {
  clientId: string;
  cost: number;
  unit: string | null;
};

type PromotionState = {
  pricing: PricingRecord;
  outcome: Exclude<PricingOutcome, "pricing-only">;
};

type RoutingOutcome = {
  pricing: PricingRecord;
  job: { id: string; number: number | null; name: string | null; status: string | null } | null;
  estimate: {
    id: string;
    number: number | null;
    name: string | null;
    status: string | null;
    total: number;
    qboSyncStatus: string | null;
  } | null;
  relatedErrors: string[];
};

const defaultInputs = {
  crewSize: null as number | null,
  estimatedHours: null as number | null,
  laborRate: null as number | null,
  equipmentCost: null as number | null,
  fuelCost: null as number | null,
  materialsCost: null as number | null,
  disposalFees: null as number | null,
  subcontractorCost: null as number | null,
  targetMargin: 30 as number | null,
  finalPriceOverride: null as number | null,
  acreage: null as number | null,
  visitsPerSeason: null as number | null,
  frequency: "One-Time" as string | null,
  terrain: "Easy (Flat/Open)" as string | null,
  condition: "Well Maintained" as string | null,
  season: null as string | null,
};

function newLine(service: ServiceOption, index: number): DraftLine {
  return {
    clientId: `line-${Date.now()}-${index}`,
    serviceId: service.id,
    name: service.name,
    description: service.description || "",
    quantity: 1,
    unitPrice: service.unitPrice,
    lineOrder: (index + 1) * 10,
    cost: service.cost,
    unit: service.unit,
  };
}

function newCustomLine(index: number): DraftLine {
  return {
    clientId: `custom-${Date.now()}-${index}`,
    serviceId: null,
    name: "",
    description: "",
    quantity: 1,
    unitPrice: 0,
    lineOrder: (index + 1) * 10,
    cost: 0,
    unit: null,
  };
}

export function PriceJobsTab({ data, onRefresh }: { data: WorkbenchData; onRefresh: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [contactId, setContactId] = useState("");
  const [contactPickerOpen, setContactPickerOpen] = useState(false);
  const [lines, setLines] = useState<DraftLine[]>(() => data.services[0] ? [newLine(data.services[0], 0)] : []);
  const [outcome, setOutcome] = useState<PricingOutcome>("pricing-only");
  const [crewIds, setCrewIds] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState<string | null>(null);
  const [priority, setPriority] = useState<(typeof JOB_PRIORITIES)[number]>("Normal");
  const [jobType, setJobType] = useState<(typeof JOB_TYPES)[number]>("One-Time");
  const [notes, setNotes] = useState("");
  const [inputs, setInputs] = useState(defaultInputs);
  const [validation, setValidation] = useState<string[]>([]);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [routing, setRouting] = useState<RoutingOutcome | null>(null);
  const [saving, setSaving] = useState(false);
  const [polling, setPolling] = useState(false);
  const [promotion, setPromotion] = useState<PromotionState | null>(null);
  const [promotionContactId, setPromotionContactId] = useState("");
  const [promotionCrewIds, setPromotionCrewIds] = useState<string[]>([]);
  const [promotionDate, setPromotionDate] = useState<string | null>(null);
  const [promotionPriority, setPromotionPriority] = useState<(typeof JOB_PRIORITIES)[number]>("Normal");
  const [promotionJobType, setPromotionJobType] = useState<(typeof JOB_TYPES)[number]>("One-Time");
  const [promotionError, setPromotionError] = useState("");
  const [promoting, setPromoting] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const requiresJob = outcome !== "pricing-only";
  const requiresEstimate = outcome === "create-estimate";
  const serviceMap = useMemo(() => new Map(data.services.map((service) => [service.id, service])), [data.services]);
  const selectedContact = useMemo(
    () => data.contacts.find((contact) => contact.id === contactId) || null,
    [contactId, data.contacts]
  );
  const totals = useMemo(() => {
    const linePrice = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
    const bookCost = lines.reduce((sum, line) => sum + line.quantity * line.cost, 0);
    const labor = (inputs.crewSize || 0) * (inputs.estimatedHours || 0) * (inputs.laborRate || 0);
    const direct = labor + (inputs.equipmentCost || 0) + (inputs.fuelCost || 0) +
      (inputs.materialsCost || 0) + (inputs.disposalFees || 0) + (inputs.subcontractorCost || 0);
    const terrainMultiplier = inputs.terrain?.startsWith("Moderate") ? 1.25 : inputs.terrain?.startsWith("Difficult") ? 1.5 : 1;
    const conditionMultiplier = inputs.condition === "Overgrown" ? 1.35 : inputs.condition === "First-Time Cleanup" ? 1.75 : 1;
    const seasonMultiplier = inputs.season === "Spring" ? 1.1 : inputs.season === "Fall" ? 1.15 : inputs.season === "Winter" ? 1.25 : 1;
    const adjustedDirect = direct * terrainMultiplier * conditionMultiplier * seasonMultiplier;
    const totalCost = bookCost + adjustedDirect;
    const calculatedPrice = inputs.targetMargin != null && inputs.targetMargin < 100
      ? adjustedDirect / (1 - inputs.targetMargin / 100)
      : adjustedDirect;
    const totalPrice = inputs.finalPriceOverride ?? (linePrice || calculatedPrice);
    const margin = totalPrice > 0 ? ((totalPrice - totalCost) / totalPrice) * 100 : 0;
    return { linePrice, bookCost, adjustedDirect, totalCost, totalPrice, margin };
  }, [lines, inputs]);

  function updateLine(clientId: string, patch: Partial<DraftLine>) {
    setLines((current) => current.map((line) => line.clientId === clientId ? { ...line, ...patch } : line));
  }

  function selectService(clientId: string, serviceId: string) {
    if (serviceId === "__custom__") {
      updateLine(clientId, {
        serviceId: null,
        name: "",
        description: "",
        unitPrice: 0,
        cost: 0,
        unit: null,
      });
      return;
    }
    const service = serviceMap.get(serviceId);
    if (!service) return;
    updateLine(clientId, {
      serviceId: service.id,
      name: service.name,
      description: service.description || "",
      unitPrice: service.unitPrice,
      cost: service.cost,
      unit: service.unit,
    });
  }

  function moveLine(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= lines.length) return;
    setLines((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((line, lineIndex) => ({ ...line, lineOrder: (lineIndex + 1) * 10 }));
    });
  }

  function validate(): string[] {
    const issues: string[] = [];
    if (name.trim().length < 2) issues.push("Pricing name is required");
    if (requiresJob && !contactId) issues.push("Select a contact before creating a job or estimate");
    if (lines.length === 0) issues.push("Add at least one service line");
    if (lines.some((line) => !line.name.trim() || line.quantity <= 0 || line.unitPrice < 0)) issues.push("Each service needs a name, positive quantity, and valid unit price");
    if (inputs.targetMargin != null && (inputs.targetMargin < 0 || inputs.targetMargin >= 100)) issues.push("Target margin must be between 0 and 99.99%");
    return issues;
  }

  async function pollRouting(pricingId: string) {
    setPolling(true);
    for (let attempt = 0; attempt < 40; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      try {
        const response = await getPricingResult(pricingId);
        if (response.ok && "pricing" in response) {
          const outcome = response as RoutingOutcome & { ok: true };
          setRouting(outcome);
          if (["Job Active", "Waiting for Estimate", "Error"].includes(outcome.pricing.routingStatus || "")) {
            setPolling(false);
            await onRefresh();
            return;
          }
        }
      } catch (error) {
        setResult({ ok: false, kind: "error", message: error instanceof Error ? error.message : "Request status could not be refreshed" });
        setPolling(false);
        return;
      }
    }
    setPolling(false);
    setResult({ ok: false, kind: "partial", message: "The job request is still being processed. Refresh the recent requests list to check it again." });
  }

  async function submit() {
    const issues = validate();
    setValidation(issues);
    setResult(null);
    if (issues.length > 0) return;

    const payload: PricingJobInput = {
      name: name.trim(),
      contactId: contactId || null,
      lines: lines.map((line, index) => ({
        serviceId: line.serviceId,
        name: line.name,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineOrder: (index + 1) * 10,
      })),
      outcome,
      assignedCrewIds: requiresJob ? crewIds : [],
      scheduledDate: requiresJob ? scheduledDate : null,
      priority,
      jobType,
      notes,
      ...inputs,
    };

    setSaving(true);
    try {
      const response = await savePricingJob(payload);
      setResult(response);
      if (response.ok && "pricingId" in response) {
        toast.success(response.message);
        setRouting({
          pricing: {
            id: response.pricingId,
            name: payload.name,
            routingStatus: response.routingStatus,
            routingError: null,
            requiresEstimate,
            contactId: payload.contactId,
            assignedCrewIds: payload.assignedCrewIds,
            scheduledDate: requiresJob ? payload.scheduledDate : null,
            priority: requiresJob ? payload.priority : null,
            jobType: requiresJob ? payload.jobType : null,
            totalPrice: totals.totalPrice,
            jobId: null,
            estimateId: null,
            routedAt: null,
          },
          job: null,
          estimate: null,
          relatedErrors: [],
        });
        if (response.routingStatus === "Pricing Saved") await onRefresh();
        else void pollRouting(response.pricingId);
      } else if (!response.ok) {
        toast.error(response.message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Pricing save failed";
      setResult({ ok: false, kind: "error", message });
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function archiveSavedPricing(pricingId: string) {
    setArchivingId(pricingId);
    setResult(null);
    try {
      const response = await archivePricing(pricingId);
      setResult(response);
      response.ok ? toast.success(response.message) : toast.error(response.message);
      if (response.ok) await onRefresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Pricing could not be archived";
      setResult({ ok: false, kind: "error", message });
      toast.error(message);
    } finally {
      setArchivingId(null);
    }
  }

  function openPromotion(pricing: PricingRecord, nextOutcome: PromotionState["outcome"]) {
    setPromotion({ pricing, outcome: nextOutcome });
    setPromotionContactId(pricing.contactId || "");
    setPromotionCrewIds(pricing.assignedCrewIds);
    setPromotionDate(pricing.scheduledDate);
    setPromotionPriority(pricing.priority || "Normal");
    setPromotionJobType(pricing.jobType || "One-Time");
    setPromotionError("");
  }

  async function submitPromotion() {
    if (!promotion) return;
    if (!promotionContactId) {
      setPromotionError("Select a contact");
      return;
    }

    const payload: PricingPromotionInput = {
      pricingId: promotion.pricing.id,
      outcome: promotion.outcome,
      contactId: promotionContactId,
      assignedCrewIds: promotionCrewIds,
      scheduledDate: promotionDate,
      priority: promotionPriority,
      jobType: promotionJobType,
    };

    setPromoting(true);
    setPromotionError("");
    try {
      const response = await promoteSavedPricing(payload);
      if (!response.ok || !("pricingId" in response)) {
        setPromotionError(response.message);
        return;
      }

      const promotedPricing: PricingRecord = {
        ...promotion.pricing,
        routingStatus: "Ready to Route",
        routingError: null,
        requiresEstimate: promotion.outcome === "create-estimate",
        contactId: promotionContactId,
        assignedCrewIds: promotionCrewIds,
        scheduledDate: promotionDate,
        priority: promotionPriority,
        jobType: promotionJobType,
      };
      setRouting({ pricing: promotedPricing, job: null, estimate: null, relatedErrors: [] });
      setResult(response);
      setPromotion(null);
      toast.success(response.message);
      void pollRouting(response.pricingId);
    } catch (error) {
      setPromotionError(error instanceof Error ? error.message : "Saved pricing could not be promoted");
    } finally {
      setPromoting(false);
    }
  }

  return (
    <div className="space-y-5">
      {data.errors.contacts ? <SectionError title="Contacts unavailable" message={data.errors.contacts} /> : null}
      {data.errors.services ? <SectionError title="Price Book unavailable" message={data.errors.services} /> : null}
      {data.errors.employees ? <SectionError title="Employees unavailable" message={data.errors.employees} /> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-md border bg-background shadow-xs">
          <div className="border-b bg-slate-50/80 px-3 py-2.5">
            <h2 className="text-sm font-semibold">Cost and pricing details</h2>
          </div>
          <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Crew size"><NumericInput value={inputs.crewSize} step="1" onChange={(value) => setInputs({ ...inputs, crewSize: value })} /></Field>
            <Field label="Estimated hours"><NumericInput value={inputs.estimatedHours} onChange={(value) => setInputs({ ...inputs, estimatedHours: value })} /></Field>
            <Field label="Hourly labor rate per person"><NumericInput value={inputs.laborRate} onChange={(value) => setInputs({ ...inputs, laborRate: value })} /></Field>
            <Field label="Equipment cost"><NumericInput value={inputs.equipmentCost} onChange={(value) => setInputs({ ...inputs, equipmentCost: value })} /></Field>
            <Field label="Fuel / travel cost"><NumericInput value={inputs.fuelCost} onChange={(value) => setInputs({ ...inputs, fuelCost: value })} /></Field>
            <Field label="Materials cost"><NumericInput value={inputs.materialsCost} onChange={(value) => setInputs({ ...inputs, materialsCost: value })} /></Field>
            <Field label="Disposal / dump fees"><NumericInput value={inputs.disposalFees} onChange={(value) => setInputs({ ...inputs, disposalFees: value })} /></Field>
            <Field label="Subcontractor cost"><NumericInput value={inputs.subcontractorCost} onChange={(value) => setInputs({ ...inputs, subcontractorCost: value })} /></Field>
            <Field label="Target margin %"><NumericInput value={inputs.targetMargin} max={99.99} onChange={(value) => setInputs({ ...inputs, targetMargin: value })} /></Field>
            <Field label="Final price (optional)"><NumericInput value={inputs.finalPriceOverride} onChange={(value) => setInputs({ ...inputs, finalPriceOverride: value })} /></Field>
            <Field label="Acreage"><NumericInput value={inputs.acreage} onChange={(value) => setInputs({ ...inputs, acreage: value })} /></Field>
            <Field label="Visits per season"><NumericInput value={inputs.visitsPerSeason} step="1" onChange={(value) => setInputs({ ...inputs, visitsPerSeason: value })} /></Field>
            <Field label="Frequency"><NativeSelect value={inputs.frequency || ""} onChange={(event) => setInputs({ ...inputs, frequency: event.target.value || null })}><option value="">Not set</option>{FREQUENCIES.map((item) => <option key={item}>{item}</option>)}</NativeSelect></Field>
            <Field label="Terrain"><NativeSelect value={inputs.terrain || ""} onChange={(event) => setInputs({ ...inputs, terrain: event.target.value || null })}><option value="">Not set</option>{TERRAIN_OPTIONS.map((item) => <option key={item}>{item}</option>)}</NativeSelect></Field>
            <Field label="Condition"><NativeSelect value={inputs.condition || ""} onChange={(event) => setInputs({ ...inputs, condition: event.target.value || null })}><option value="">Not set</option>{CONDITION_OPTIONS.map((item) => <option key={item}>{item}</option>)}</NativeSelect></Field>
            <Field label="Season"><NativeSelect value={inputs.season || ""} onChange={(event) => setInputs({ ...inputs, season: event.target.value || null })}><option value="">Not set</option>{SEASONS.map((item) => <option key={item}>{item}</option>)}</NativeSelect></Field>
          </div>
        </section>

        <aside className="overflow-hidden rounded-md border border-emerald-200 bg-background shadow-xs">
          <div className="border-b border-emerald-100 bg-emerald-50/70 px-3 py-2.5"><h2 className="text-sm font-semibold text-emerald-950">Pricing summary</h2></div>
          <div className="space-y-2 p-3 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Service costs</span><span className="tabular-nums">{money(totals.bookCost)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Other adjusted costs</span><span className="tabular-nums">{money(totals.adjustedDirect)}</span></div>
            <div className="flex justify-between font-medium"><span>Total cost</span><span className="tabular-nums">{money(totals.totalCost)}</span></div>
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground">Service line price</span><span className="tabular-nums">{money(totals.linePrice)}</span></div>
            <div className="flex justify-between text-sm font-semibold"><span>Total price</span><span className="tabular-nums">{money(totals.totalPrice)}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Projected margin</span><Badge variant="outline" className={totals.margin >= 20 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"}>{totals.margin.toFixed(1)}%</Badge></div>
          </div>
          <div className="border-t p-3">
            <Button className="h-10 w-full bg-emerald-700 font-semibold text-white shadow-sm hover:bg-emerald-800" onClick={submit} disabled={saving || polling}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : outcome === "pricing-only" ? <CircleDollarSign className="size-4" /> : outcome === "create-job" ? <BriefcaseBusiness className="size-4" /> : <FilePenLine className="size-4" />}
              {outcome === "pricing-only" ? "Save pricing" : outcome === "create-job" ? "Save and create job" : "Save and create estimate"}
            </Button>
          </div>
        </aside>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 overflow-hidden rounded-md border border-emerald-200/70 bg-background shadow-xs">
          <div className="grid gap-3 border-b border-emerald-100 bg-emerald-50/60 p-3 md:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)]">
            <Field label="Pricing name" required>
              <Input value={name} onChange={(event) => setName(event.target.value)} className="h-9 border-emerald-200 bg-background text-xs shadow-xs focus-visible:border-emerald-500 focus-visible:ring-emerald-500/15" placeholder="Property and scope" />
            </Field>
            <Field label="Contact" required={requiresJob}>
              <Popover open={contactPickerOpen} onOpenChange={setContactPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={contactPickerOpen}
                    className="h-9 w-full justify-between border-emerald-200 bg-background px-2.5 text-xs font-normal shadow-xs hover:bg-background"
                    disabled={data.contacts.length === 0}
                  >
                    <span className="truncate">
                      {selectedContact
                        ? `${selectedContact.name}${selectedContact.company && selectedContact.company !== selectedContact.name ? ` - ${selectedContact.company}` : ""}`
                        : requiresJob ? "Select contact" : "Optional contact"}
                    </span>
                    <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Search contacts..." className="text-xs" />
                    <CommandList>
                      <CommandEmpty>No contacts found.</CommandEmpty>
                      <CommandGroup>
                        {data.contacts.map((contact) => (
                          <CommandItem
                            key={contact.id}
                            value={[contact.id, contact.name, contact.company, contact.email, contact.phone].filter(Boolean).join(" ")}
                            onSelect={() => {
                              setContactId(contact.id);
                              setContactPickerOpen(false);
                            }}
                            className="text-xs"
                          >
                            <Check className={contact.id === contactId ? "opacity-100" : "opacity-0"} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate">{contact.name}</span>
                              {contact.company && contact.company !== contact.name ? (
                                <span className="block truncate text-[10px] text-muted-foreground">{contact.company}</span>
                              ) : null}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </Field>
          </div>

          <div className="flex items-center justify-between border-b bg-slate-50/70 px-3 py-2.5">
            <div>
              <h2 className="text-sm font-semibold">Service lines</h2>
              <p className="text-[11px] text-muted-foreground">{lines.length} line{lines.length === 1 ? "" : "s"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={!data.services[0]}
                onClick={() => data.services[0] && setLines((current) => [...current, newLine(data.services[0], current.length)])}
              >
                <Plus className="size-3.5" /> Price Book
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => setLines((current) => [...current, newCustomLine(current.length)])}
              >
                <PencilLine className="size-3.5" /> Custom service
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[820px]">
              <div className="grid grid-cols-[56px_minmax(190px,1.4fr)_90px_120px_minmax(180px,1fr)_92px_40px] items-center gap-2 border-b bg-muted/20 px-3 py-1.5 text-[10px] font-medium uppercase text-muted-foreground">
                <span>Order</span><span>Service</span><span className="text-right">Qty</span><span className="text-right">Unit price</span><span>Description</span><span className="text-right">Total</span><span />
              </div>
              {lines.map((line, index) => (
                <div key={line.clientId} className="grid grid-cols-[56px_minmax(190px,1.4fr)_90px_120px_minmax(180px,1fr)_92px_40px] items-start gap-2 border-b px-3 py-2 transition-colors last:border-b-0 hover:bg-slate-50/70">
                  <div className="flex items-center gap-0.5 pt-0.5">
                    <IconButton label="Move up" disabled={index === 0} onClick={() => moveLine(index, -1)}><ArrowUp className="size-3.5" /></IconButton>
                    <IconButton label="Move down" disabled={index === lines.length - 1} onClick={() => moveLine(index, 1)}><ArrowDown className="size-3.5" /></IconButton>
                  </div>
                  <div className="grid gap-1">
                    <NativeSelect value={line.serviceId || "__custom__"} onChange={(event) => selectService(line.clientId, event.target.value)}>
                      <option value="__custom__">Custom service</option>
                      {data.services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
                    </NativeSelect>
                    {line.serviceId ? (
                      <span className="truncate text-[10px] text-muted-foreground">{serviceMap.get(line.serviceId)?.category || "Other"} / {line.unit || "Unit not set"} / cost {money(line.cost)}</span>
                    ) : (
                      <Input value={line.name} onChange={(event) => updateLine(line.clientId, { name: event.target.value })} className="h-7 text-xs" placeholder="Custom service name" />
                    )}
                  </div>
                  <NumericInput value={line.quantity} min={0.01} onChange={(value) => updateLine(line.clientId, { quantity: value || 0 })} />
                  <NumericInput value={line.unitPrice} onChange={(value) => updateLine(line.clientId, { unitPrice: value || 0 })} />
                  <Textarea value={line.description} onChange={(event) => updateLine(line.clientId, { description: event.target.value })} className="min-h-8 resize-none text-xs" rows={1} />
                  <div className="pt-2 text-right text-xs font-medium tabular-nums">{money(line.quantity * line.unitPrice)}</div>
                  <IconButton label="Remove line" className="text-muted-foreground hover:text-destructive" onClick={() => setLines((current) => current.filter((item) => item.clientId !== line.clientId))}><Trash2 className="size-3.5" /></IconButton>
                </div>
              ))}
              {lines.length === 0 ? <div className="p-8 text-center text-xs text-muted-foreground">No service lines</div> : null}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="overflow-hidden rounded-md border border-emerald-200/70 bg-background shadow-xs">
            <div className="border-b border-emerald-100 bg-emerald-50/60 px-3 py-2.5"><h2 className="text-sm font-semibold text-emerald-950">After pricing</h2></div>
            <div className="grid gap-3 p-3">
              <ToggleGroup
                type="single"
                value={outcome}
                onValueChange={(value) => value && setOutcome(value as PricingOutcome)}
                className="grid w-full gap-2"
              >
                <ToggleGroupItem value="pricing-only" aria-label="Save pricing only" className="h-auto w-full justify-start gap-2 border px-2.5 py-2 text-left data-[state=on]:border-emerald-500 data-[state=on]:bg-emerald-50">
                  <CircleDollarSign className="size-4 shrink-0" />
                  <span><span className="block text-xs font-medium">Pricing only</span><span className="block text-[10px] font-normal text-muted-foreground">Save calculation</span></span>
                </ToggleGroupItem>
                <ToggleGroupItem value="create-job" aria-label="Create job" className="h-auto w-full justify-start gap-2 border px-2.5 py-2 text-left data-[state=on]:border-emerald-500 data-[state=on]:bg-emerald-50">
                  <BriefcaseBusiness className="size-4 shrink-0" />
                  <span><span className="block text-xs font-medium">Create job</span><span className="block text-[10px] font-normal text-muted-foreground">Start active work</span></span>
                </ToggleGroupItem>
                <ToggleGroupItem value="create-estimate" aria-label="Create estimate" className="h-auto w-full justify-start gap-2 border px-2.5 py-2 text-left data-[state=on]:border-emerald-500 data-[state=on]:bg-emerald-50">
                  <FilePenLine className="size-4 shrink-0" />
                  <span><span className="block text-xs font-medium">Create estimate</span><span className="block text-[10px] font-normal text-muted-foreground">Approval before work</span></span>
                </ToggleGroupItem>
              </ToggleGroup>
              {requiresJob ? (
                <>
                  <Separator />
                  <Field label="Assigned crew"><CrewPicker employees={data.employees} value={crewIds} onChange={setCrewIds} /></Field>
                  <Field label="Scheduled date"><Input type="date" value={scheduledDate || ""} onChange={(event) => setScheduledDate(event.target.value || null)} className="h-8 text-xs" /></Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Priority"><NativeSelect value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)}>{JOB_PRIORITIES.map((item) => <option key={item}>{item}</option>)}</NativeSelect></Field>
                    <Field label="Job type"><NativeSelect value={jobType} onChange={(event) => setJobType(event.target.value as typeof jobType)}>{JOB_TYPES.map((item) => <option key={item}>{item}</option>)}</NativeSelect></Field>
                  </div>
                </>
              ) : null}
              <Field label="Notes"><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-16 resize-y text-xs" /></Field>
            </div>
          </section>
        </aside>
      </div>

      {validation.length > 0 ? (
        <Alert variant="destructive" className="rounded-md">
          <AlertTriangle className="size-4" />
          <AlertTitle>Check pricing request</AlertTitle>
          <AlertDescription>{validation.join(". ")}</AlertDescription>
        </Alert>
      ) : null}

      {result && !result.ok ? (
        <Alert variant="destructive" className="rounded-md">
          <AlertTriangle className="size-4" />
          <AlertTitle>{result.kind === "partial" ? "Some changes were saved" : result.kind === "validation" ? "Check required information" : "Could not save"}</AlertTitle>
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      ) : null}

      {routing ? (
        <section className="overflow-hidden rounded-md border border-blue-200 bg-background shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 bg-blue-50/70 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <ListChecks className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Pricing result</h2>
              <StatusBadge status={routing.pricing.routingStatus} pulse={polling} />
            </div>
            {polling ? (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" /> Creating records</span>
            ) : routing.pricing.routingStatus === "Pricing Saved" ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openPromotion(routing.pricing, "create-job")}><BriefcaseBusiness className="size-3.5" /> Create job</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openPromotion(routing.pricing, "create-estimate")}><FilePenLine className="size-3.5" /> Create estimate</Button>
              </div>
            ) : null}
          </div>
          <div className="grid gap-3 p-3 md:grid-cols-3">
            <div className="border-l-2 border-slate-300 pl-3">
              <p className="text-[10px] uppercase text-muted-foreground">Saved pricing</p>
              <p className="mt-1 text-xs font-medium">{routing.pricing.name}</p>
              <p className="mt-1 text-xs tabular-nums">{money(routing.pricing.totalPrice)}</p>
            </div>
            <div className="border-l-2 border-emerald-300 pl-3">
              <p className="text-[10px] uppercase text-muted-foreground">Job</p>
              {routing.job ? <><p className="mt-1 text-xs font-medium">Job #{routing.job.number || "-"} {routing.job.name}</p><StatusBadge status={routing.job.status} /></> : <p className="mt-1 text-xs text-muted-foreground">{routing.pricing.routingStatus === "Pricing Saved" ? "Not created" : "Creating job..."}</p>}
            </div>
            <div className="border-l-2 border-blue-300 pl-3">
              <p className="text-[10px] uppercase text-muted-foreground">Estimate</p>
              {routing.estimate ? <><p className="mt-1 text-xs font-medium">Estimate #{routing.estimate.number || "-"} {routing.estimate.name}</p><div className="mt-1 flex items-center gap-2"><StatusBadge status={routing.estimate.status} /><span className="text-xs tabular-nums">{money(routing.estimate.total)}</span></div></> : <p className="mt-1 text-xs text-muted-foreground">{routing.pricing.routingStatus === "Pricing Saved" ? "Not created" : routing.pricing.requiresEstimate ? "Creating estimate..." : "Not needed"}</p>}
            </div>
          </div>
          {routing.pricing.routingStatus === "Error" ? (
            <div className="border-t bg-red-50 px-3 py-2 text-xs text-red-800"><strong>Could not create the job:</strong> Try again, then contact support if the problem continues.</div>
          ) : null}
          {routing.relatedErrors.length > 0 ? <div className="border-t px-3 py-2 text-xs text-amber-800">Some job details may be out of date. Refresh this page to try again.</div> : null}
        </section>
      ) : null}

      <section className="overflow-hidden rounded-md border bg-background shadow-xs">
        <div className="flex items-center justify-between border-b bg-slate-50/80 px-3 py-2.5">
          <div><h2 className="text-sm font-semibold">Recent pricing</h2><p className="text-[11px] text-muted-foreground">Saved calculations and created work</p></div>
          <IconButton label="Refresh pricing" onClick={onRefresh}><RefreshCw className="size-3.5" /></IconButton>
        </div>
        {data.errors.pricing ? <div className="p-3"><SectionError title="Recent pricing unavailable" message={data.errors.pricing} /></div> : data.recentPricing.length === 0 ? (
          <EmptyState icon={<Clock3 className="size-7" />} title="No saved pricing yet" detail="Completed calculations will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-xs">
              <thead>
                <tr className="border-b bg-muted/20 text-left text-[10px] uppercase text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Pricing</th>
                  <th className="px-3 py-2 text-right font-medium">Price</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Next step</th>
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.recentPricing.map((item) => (
                  <tr key={item.id} className="border-b transition-colors last:border-0 hover:bg-slate-50/80">
                    <td className="max-w-[320px] px-3 py-2"><p className="truncate font-medium">{item.name}</p><p className="font-mono text-[10px] text-muted-foreground">{item.id}</p></td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(item.totalPrice)}</td>
                    <td className="px-3 py-2"><StatusBadge status={item.routingStatus} /></td>
                    <td className="px-3 py-2">
                      {item.routingStatus === "Pricing Saved" ? (
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openPromotion(item, "create-job")}><BriefcaseBusiness className="size-3.5" /> Job</Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openPromotion(item, "create-estimate")}><FilePenLine className="size-3.5" /> Estimate</Button>
                        </div>
                      ) : item.routingStatus === "Error" ? (
                        <span className="inline-flex items-center gap-1 text-red-700"><AlertTriangle className="size-3.5" /> Needs attention</span>
                      ) : item.jobId || item.estimateId ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="size-3.5" /> Created</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground"><Loader2 className="size-3.5 animate-spin" /> Creating</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <IconButton
                            label="Archive pricing"
                            className="text-muted-foreground hover:text-destructive"
                            disabled={archivingId === item.id || ["Ready to Route", "Routing"].includes(item.routingStatus || "")}
                          >
                            {archivingId === item.id ? <Loader2 className="size-3.5 animate-spin" /> : <Archive className="size-3.5" />}
                          </IconButton>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Archive {item.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This removes the pricing from this workbench. Any linked Job or Estimate will be kept unchanged.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction variant="destructive" onClick={() => void archiveSavedPricing(item.id)}>Archive pricing</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={Boolean(promotion)} onOpenChange={(open) => !open && !promoting && setPromotion(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{promotion?.outcome === "create-estimate" ? "Create estimate from pricing" : "Create job from pricing"}</DialogTitle>
            <DialogDescription>{promotion ? `${promotion.pricing.name} · ${money(promotion.pricing.totalPrice)}` : "Complete the job setup."}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {promotionError ? <Alert variant="destructive"><AlertTriangle className="size-4" /><AlertDescription>{promotionError}</AlertDescription></Alert> : null}
            <Field label="Contact" required>
              <NativeSelect value={promotionContactId} onChange={(event) => setPromotionContactId(event.target.value)}>
                <option value="">Select contact</option>
                {data.contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}{contact.company && contact.company !== contact.name ? ` - ${contact.company}` : ""}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Assigned crew"><CrewPicker employees={data.employees} value={promotionCrewIds} onChange={setPromotionCrewIds} /></Field>
            <Field label="Scheduled date"><Input type="date" value={promotionDate || ""} onChange={(event) => setPromotionDate(event.target.value || null)} className="h-8 text-xs" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Priority"><NativeSelect value={promotionPriority} onChange={(event) => setPromotionPriority(event.target.value as typeof promotionPriority)}>{JOB_PRIORITIES.map((item) => <option key={item}>{item}</option>)}</NativeSelect></Field>
              <Field label="Job type"><NativeSelect value={promotionJobType} onChange={(event) => setPromotionJobType(event.target.value as typeof promotionJobType)}>{JOB_TYPES.map((item) => <option key={item}>{item}</option>)}</NativeSelect></Field>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={promoting} onClick={() => setPromotion(null)}>Cancel</Button>
            <Button type="button" disabled={promoting || !promotionContactId} onClick={() => void submitPromotion()}>
              {promoting ? <Loader2 className="size-4 animate-spin" /> : promotion?.outcome === "create-estimate" ? <FilePenLine className="size-4" /> : <BriefcaseBusiness className="size-4" />}
              {promotion?.outcome === "create-estimate" ? "Create estimate" : "Create job"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
