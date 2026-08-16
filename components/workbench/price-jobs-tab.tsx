"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  CircleDollarSign,
  Clock3,
  Loader2,
  PencilLine,
  Plus,
  RefreshCw,
  Route,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { getPricingResult, savePricingJob } from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
  const [requiresEstimate, setRequiresEstimate] = useState(false);
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
    if (name.trim().length < 2) issues.push("Job / estimate name is required");
    if (!contactId) issues.push("Select a contact");
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
        setResult({ ok: false, kind: "error", message: error instanceof Error ? error.message : "Routing refresh failed" });
        setPolling(false);
        return;
      }
    }
    setPolling(false);
    setResult({ ok: false, kind: "partial", message: "Routing is still processing. Refresh recent requests to check the shared automation outcome." });
  }

  async function submit() {
    const issues = validate();
    setValidation(issues);
    setResult(null);
    if (issues.length > 0) return;

    const payload: PricingJobInput = {
      name: name.trim(),
      contactId,
      lines: lines.map((line, index) => ({
        serviceId: line.serviceId,
        name: line.name,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineOrder: (index + 1) * 10,
      })),
      requiresEstimate,
      assignedCrewIds: crewIds,
      scheduledDate,
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
            routingStatus: "Ready to Route",
            routingError: null,
            requiresEstimate,
            jobId: null,
            estimateId: null,
            routedAt: null,
          },
          job: null,
          estimate: null,
          relatedErrors: [],
        });
        void pollRouting(response.pricingId);
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

  return (
    <div className="space-y-4">
      {data.errors.contacts ? <SectionError title="Contacts unavailable" message={data.errors.contacts} /> : null}
      {data.errors.services ? <SectionError title="Price Book unavailable" message={data.errors.services} /> : null}
      {data.errors.employees ? <SectionError title="Employees unavailable" message={data.errors.employees} /> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 border-y bg-background">
          <div className="grid gap-3 border-b bg-muted/30 p-3 md:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)]">
            <Field label="Job / estimate name" required>
              <Input value={name} onChange={(event) => setName(event.target.value)} className="h-8 text-xs" placeholder="Property and scope" />
            </Field>
            <Field label="Contact" required>
              <Popover open={contactPickerOpen} onOpenChange={setContactPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={contactPickerOpen}
                    className="h-8 w-full justify-between px-2 text-xs font-normal"
                    disabled={data.contacts.length === 0}
                  >
                    <span className="truncate">
                      {selectedContact
                        ? `${selectedContact.name}${selectedContact.company && selectedContact.company !== selectedContact.name ? ` - ${selectedContact.company}` : ""}`
                        : "Select contact"}
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

          <div className="flex items-center justify-between border-b px-3 py-2">
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
                <div key={line.clientId} className="grid grid-cols-[56px_minmax(190px,1.4fr)_90px_120px_minmax(180px,1fr)_92px_40px] items-start gap-2 border-b px-3 py-2 last:border-b-0">
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
          <section className="border-y bg-background">
            <div className="border-b bg-muted/30 px-3 py-2"><h2 className="text-sm font-semibold">Routing details</h2></div>
            <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="flex items-center justify-between rounded-md border px-2.5 py-2">
                <div>
                  <p className="text-xs font-medium">Estimate required</p>
                  <p className="text-[10px] text-muted-foreground">{requiresEstimate ? "Approval gate" : "Direct activation"}</p>
                </div>
                <Switch checked={requiresEstimate} onCheckedChange={setRequiresEstimate} />
              </div>
              <Field label="Assigned crew"><CrewPicker employees={data.employees} value={crewIds} onChange={setCrewIds} /></Field>
              <Field label="Scheduled date"><Input type="date" value={scheduledDate || ""} onChange={(event) => setScheduledDate(event.target.value || null)} className="h-8 text-xs" /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Priority"><NativeSelect value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)}>{JOB_PRIORITIES.map((item) => <option key={item}>{item}</option>)}</NativeSelect></Field>
                <Field label="Job type"><NativeSelect value={jobType} onChange={(event) => setJobType(event.target.value as typeof jobType)}>{JOB_TYPES.map((item) => <option key={item}>{item}</option>)}</NativeSelect></Field>
              </div>
              <Field label="Notes"><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-16 resize-y text-xs" /></Field>
            </div>
          </section>
        </aside>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="border-y bg-background">
          <div className="border-b bg-muted/30 px-3 py-2">
            <h2 className="text-sm font-semibold">Pricing Calculator inputs</h2>
          </div>
          <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Crew size"><NumericInput value={inputs.crewSize} step="1" onChange={(value) => setInputs({ ...inputs, crewSize: value })} /></Field>
            <Field label="Estimated hours"><NumericInput value={inputs.estimatedHours} onChange={(value) => setInputs({ ...inputs, estimatedHours: value })} /></Field>
            <Field label="Labor rate / person hr"><NumericInput value={inputs.laborRate} onChange={(value) => setInputs({ ...inputs, laborRate: value })} /></Field>
            <Field label="Equipment cost"><NumericInput value={inputs.equipmentCost} onChange={(value) => setInputs({ ...inputs, equipmentCost: value })} /></Field>
            <Field label="Fuel / travel cost"><NumericInput value={inputs.fuelCost} onChange={(value) => setInputs({ ...inputs, fuelCost: value })} /></Field>
            <Field label="Materials cost"><NumericInput value={inputs.materialsCost} onChange={(value) => setInputs({ ...inputs, materialsCost: value })} /></Field>
            <Field label="Disposal / dump fees"><NumericInput value={inputs.disposalFees} onChange={(value) => setInputs({ ...inputs, disposalFees: value })} /></Field>
            <Field label="Subcontractor cost"><NumericInput value={inputs.subcontractorCost} onChange={(value) => setInputs({ ...inputs, subcontractorCost: value })} /></Field>
            <Field label="Target margin %"><NumericInput value={inputs.targetMargin} max={99.99} onChange={(value) => setInputs({ ...inputs, targetMargin: value })} /></Field>
            <Field label="Final price override"><NumericInput value={inputs.finalPriceOverride} onChange={(value) => setInputs({ ...inputs, finalPriceOverride: value })} /></Field>
            <Field label="Acreage"><NumericInput value={inputs.acreage} onChange={(value) => setInputs({ ...inputs, acreage: value })} /></Field>
            <Field label="Visits / season"><NumericInput value={inputs.visitsPerSeason} step="1" onChange={(value) => setInputs({ ...inputs, visitsPerSeason: value })} /></Field>
            <Field label="Frequency"><NativeSelect value={inputs.frequency || ""} onChange={(event) => setInputs({ ...inputs, frequency: event.target.value || null })}><option value="">Not set</option>{FREQUENCIES.map((item) => <option key={item}>{item}</option>)}</NativeSelect></Field>
            <Field label="Terrain"><NativeSelect value={inputs.terrain || ""} onChange={(event) => setInputs({ ...inputs, terrain: event.target.value || null })}><option value="">Not set</option>{TERRAIN_OPTIONS.map((item) => <option key={item}>{item}</option>)}</NativeSelect></Field>
            <Field label="Condition"><NativeSelect value={inputs.condition || ""} onChange={(event) => setInputs({ ...inputs, condition: event.target.value || null })}><option value="">Not set</option>{CONDITION_OPTIONS.map((item) => <option key={item}>{item}</option>)}</NativeSelect></Field>
            <Field label="Season"><NativeSelect value={inputs.season || ""} onChange={(event) => setInputs({ ...inputs, season: event.target.value || null })}><option value="">Not set</option>{SEASONS.map((item) => <option key={item}>{item}</option>)}</NativeSelect></Field>
          </div>
        </section>

        <aside className="border-y bg-background">
          <div className="border-b bg-muted/30 px-3 py-2"><h2 className="text-sm font-semibold">Pricing summary</h2></div>
          <div className="space-y-2 p-3 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Service book cost</span><span className="tabular-nums">{money(totals.bookCost)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Adjusted input cost</span><span className="tabular-nums">{money(totals.adjustedDirect)}</span></div>
            <div className="flex justify-between font-medium"><span>Total cost</span><span className="tabular-nums">{money(totals.totalCost)}</span></div>
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground">Service line price</span><span className="tabular-nums">{money(totals.linePrice)}</span></div>
            <div className="flex justify-between text-sm font-semibold"><span>Total price</span><span className="tabular-nums">{money(totals.totalPrice)}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Projected margin</span><Badge variant="outline" className={totals.margin >= 20 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"}>{totals.margin.toFixed(1)}%</Badge></div>
          </div>
          <div className="border-t p-3">
            <Button className="h-9 w-full" onClick={submit} disabled={saving || polling}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Save and route
            </Button>
          </div>
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
          <AlertTitle>{result.kind === "partial" ? "Partial save" : result.kind === "validation" ? "Validation" : "Save failed"}</AlertTitle>
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      ) : null}

      {routing ? (
        <section className="border-y bg-background">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
            <div className="flex items-center gap-2">
              <Route className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Routing outcome</h2>
              <StatusBadge status={routing.pricing.routingStatus} pulse={polling} />
            </div>
            {polling ? <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" /> Shared automation running</span> : null}
          </div>
          <div className="grid gap-3 p-3 md:grid-cols-3">
            <div className="border-l-2 border-slate-300 pl-3">
              <p className="text-[10px] uppercase text-muted-foreground">Pricing Calculator</p>
              <p className="mt-1 text-xs font-medium">{routing.pricing.name}</p>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">{routing.pricing.id}</p>
            </div>
            <div className="border-l-2 border-emerald-300 pl-3">
              <p className="text-[10px] uppercase text-muted-foreground">Linked job</p>
              {routing.job ? <><p className="mt-1 text-xs font-medium">Job #{routing.job.number || "-"} {routing.job.name}</p><StatusBadge status={routing.job.status} /></> : <p className="mt-1 text-xs text-muted-foreground">Awaiting route</p>}
            </div>
            <div className="border-l-2 border-blue-300 pl-3">
              <p className="text-[10px] uppercase text-muted-foreground">Linked estimate</p>
              {routing.estimate ? <><p className="mt-1 text-xs font-medium">Estimate #{routing.estimate.number || "-"} {routing.estimate.name}</p><div className="mt-1 flex items-center gap-2"><StatusBadge status={routing.estimate.status} /><span className="text-xs tabular-nums">{money(routing.estimate.total)}</span></div></> : <p className="mt-1 text-xs text-muted-foreground">{routing.pricing.requiresEstimate ? "Awaiting estimate route" : "Not required"}</p>}
            </div>
          </div>
          {routing.pricing.routingStatus === "Error" ? (
            <div className="border-t bg-red-50 px-3 py-2 text-xs text-red-800"><strong>Routing error:</strong> {routing.pricing.routingError || "The shared automation returned an unspecified error."}</div>
          ) : null}
          {routing.relatedErrors.length > 0 ? <div className="border-t px-3 py-2 text-xs text-amber-800">Related record refresh failed: {routing.relatedErrors.join("; ")}</div> : null}
        </section>
      ) : null}

      <section className="border-y bg-background">
        <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
          <div><h2 className="text-sm font-semibold">Recent routing requests</h2><p className="text-[11px] text-muted-foreground">Latest app-produced workflow states</p></div>
          <IconButton label="Refresh requests" onClick={onRefresh}><RefreshCw className="size-3.5" /></IconButton>
        </div>
        {data.errors.pricing ? <div className="p-3"><SectionError title="Routing history unavailable" message={data.errors.pricing} /></div> : data.recentPricing.length === 0 ? (
          <EmptyState icon={<Clock3 className="size-7" />} title="No routed pricing requests" detail="Saved requests will appear after Routing Status is set." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-xs">
              <thead><tr className="border-b bg-muted/20 text-left text-[10px] uppercase text-muted-foreground"><th className="px-3 py-2 font-medium">Request</th><th className="px-3 py-2 font-medium">Route</th><th className="px-3 py-2 font-medium">Estimate gate</th><th className="px-3 py-2 font-medium">Outcome</th></tr></thead>
              <tbody>{data.recentPricing.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="max-w-[360px] px-3 py-2"><p className="truncate font-medium">{item.name}</p><p className="font-mono text-[10px] text-muted-foreground">{item.id}</p></td><td className="px-3 py-2"><StatusBadge status={item.routingStatus} /></td><td className="px-3 py-2">{item.requiresEstimate ? "Required" : "Direct"}</td><td className="px-3 py-2">{item.routingStatus === "Error" ? <span className="inline-flex items-center gap-1 text-red-700"><AlertTriangle className="size-3.5" /> {item.routingError || "Routing error"}</span> : item.jobId || item.estimateId ? <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="size-3.5" /> Linked outcome</span> : <span className="inline-flex items-center gap-1 text-muted-foreground"><CircleDollarSign className="size-3.5" /> Pending link</span>}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
