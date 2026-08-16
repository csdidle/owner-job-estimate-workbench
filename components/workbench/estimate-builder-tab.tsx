"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  FileText,
  Loader2,
  PencilLine,
  Plus,
  ReceiptText,
  Save,
  SendToBack,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { changeDraftEstimateStatus, deleteDraftEstimate, saveEstimate } from "@/app/actions";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  ESTIMATE_QUEUE_STATUSES,
  type ActionResult,
  type EstimateLine,
  type EstimateQueueStatus,
  type EstimateRecord,
  type ServiceOption,
  type WorkbenchData,
} from "@/lib/workbench-contract";
import {
  EmptyState,
  Field,
  IconButton,
  NativeSelect,
  NumericInput,
  SectionError,
  StatusBadge,
  dateLabel,
  money,
} from "./shared";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusDays(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function cloneEstimate(estimate: EstimateRecord): EstimateRecord {
  return { ...estimate, lines: estimate.lines.map((line, index) => ({ ...line, lineOrder: line.lineOrder || (index + 1) * 10 })) };
}

function serviceLine(service: ServiceOption, index: number): EstimateLine {
  return {
    id: `new-${Date.now()}-${index}`,
    serviceId: service.id,
    name: service.name,
    description: service.description || "",
    quantity: 1,
    unitPrice: service.unitPrice,
    total: service.unitPrice,
    lineOrder: (index + 1) * 10,
  };
}

function customLine(index: number): EstimateLine {
  return {
    id: `custom-${Date.now()}-${index}`,
    serviceId: null,
    name: "",
    description: "",
    quantity: 1,
    unitPrice: 0,
    total: 0,
    lineOrder: (index + 1) * 10,
  };
}

export function EstimateBuilderTab({ data, onRefresh }: { data: WorkbenchData; onRefresh: () => Promise<void> }) {
  const waitingEstimateIds = useMemo(
    () => new Set(data.jobs.filter((job) => job.status === "Waiting for Estimate" && job.estimateId).map((job) => job.estimateId as string)),
    [data.jobs]
  );
  const eligible = useMemo(
    () => data.estimates.filter((estimate) => estimate.status === "Draft" && waitingEstimateIds.has(estimate.id)),
    [data.estimates, waitingEstimateIds]
  );
  const [selectedId, setSelectedId] = useState<string>(eligible[0]?.id || "");
  const [draft, setDraft] = useState<EstimateRecord | null>(() => eligible[0] ? cloneEstimate(eligible[0]) : null);
  const [saving, setSaving] = useState(false);
  const [actionPending, setActionPending] = useState<"status" | "delete" | null>(null);
  const [pendingStatus, setPendingStatus] = useState<EstimateQueueStatus | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [validation, setValidation] = useState<string[]>([]);

  useEffect(() => {
    const current = eligible.find((estimate) => estimate.id === selectedId) || eligible[0] || null;
    if (current && current.id !== selectedId) setSelectedId(current.id);
    setDraft(current ? cloneEstimate(current) : null);
    setResult(null);
    setValidation([]);
  }, [selectedId, data.loadedAt, eligible]);

  const contact = draft ? data.contacts.find((item) => item.id === draft.contactId) || null : null;
  const linkedJob = draft ? data.jobs.find((job) => job.estimateId === draft.id && job.status === "Waiting for Estimate") || null : null;
  const totals = useMemo(() => {
    const subtotal = draft?.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0) || 0;
    const discount = draft?.discount || 0;
    const taxable = Math.max(0, subtotal - discount);
    const taxAmount = taxable * ((draft?.taxPercent || 0) / 100);
    return { subtotal, discount, taxAmount, total: taxable + taxAmount };
  }, [draft]);

  function patchDraft(patch: Partial<EstimateRecord>) {
    setDraft((current) => current ? { ...current, ...patch } : current);
  }

  function updateLine(id: string, patch: Partial<EstimateLine>) {
    setDraft((current) => current ? {
      ...current,
      lines: current.lines.map((line) => line.id === id
        ? { ...line, ...patch, total: (patch.quantity ?? line.quantity) * (patch.unitPrice ?? line.unitPrice) }
        : line),
    } : current);
  }

  function selectService(id: string, serviceId: string) {
    if (!serviceId) {
      updateLine(id, {
        serviceId: null,
        name: "",
        description: "",
        unitPrice: 0,
      });
      return;
    }
    const service = data.services.find((item) => item.id === serviceId);
    if (!service) return;
    updateLine(id, {
      serviceId: service.id,
      name: service.name,
      description: service.description || "",
      unitPrice: service.unitPrice,
    });
  }

  function moveLine(index: number, delta: number) {
    if (!draft) return;
    const target = index + delta;
    if (target < 0 || target >= draft.lines.length) return;
    const lines = [...draft.lines];
    [lines[index], lines[target]] = [lines[target], lines[index]];
    patchDraft({ lines: lines.map((line, lineIndex) => ({ ...line, lineOrder: (lineIndex + 1) * 10 })) });
  }

  function validate(): string[] {
    if (!draft) return ["Select an estimate"];
    const issues: string[] = [];
    if (draft.name.trim().length < 2) issues.push("Estimate name is required");
    if (draft.lines.length === 0) issues.push("Add at least one estimate line");
    if (draft.lines.some((line) => !line.name.trim() || line.quantity <= 0 || line.unitPrice < 0)) issues.push("Each line needs a name, positive quantity, and valid unit price");
    if (!draft.estimateDate || !draft.expirationDate) issues.push("Estimate and expiration dates are required");
    if (draft.estimateDate && draft.expirationDate && draft.expirationDate < draft.estimateDate) issues.push("Expiration date must be on or after the estimate date");
    if (draft.discount < 0 || draft.discount > totals.subtotal) issues.push("Discount cannot exceed the subtotal");
    if (draft.taxPercent < 0 || draft.taxPercent > 100) issues.push("Tax must be between 0 and 100%");
    return issues;
  }

  async function changeStatus(status: EstimateQueueStatus) {
    if (!draft) return;
    setActionPending("status");
    setResult(null);
    try {
      const response = await changeDraftEstimateStatus({ estimateId: draft.id, status });
      setResult(response);
      response.ok ? toast.success(response.message) : toast.error(response.message);
      if (response.ok || response.kind === "partial") await onRefresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Estimate status change failed";
      setResult({ ok: false, kind: "error", message });
      toast.error(message);
    } finally {
      setActionPending(null);
      setPendingStatus(null);
    }
  }

  async function removeEstimate() {
    if (!draft) return;
    setActionPending("delete");
    setResult(null);
    try {
      const response = await deleteDraftEstimate(draft.id);
      setResult(response);
      response.ok ? toast.success(response.message) : toast.error(response.message);
      if (response.ok || response.kind === "partial") await onRefresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Estimate deletion failed";
      setResult({ ok: false, kind: "error", message });
      toast.error(message);
    } finally {
      setActionPending(null);
    }
  }

  async function save(queueQboDraft: boolean) {
    if (!draft) return;
    const issues = validate();
    setValidation(issues);
    setResult(null);
    if (issues.length > 0) return;
    setSaving(true);
    try {
      const response = await saveEstimate({
        estimateId: draft.id,
        name: draft.name,
        notes: draft.notes,
        internalNotes: draft.internalNotes,
        estimateDate: draft.estimateDate || today(),
        expirationDate: draft.expirationDate || plusDays(today(), 30),
        discount: draft.discount,
        taxPercent: draft.taxPercent,
        queueQboDraft,
        lines: draft.lines.map((line, index) => ({ ...line, lineOrder: (index + 1) * 10 })),
      });
      setResult(response);
      if (response.ok) {
        toast.success(response.message);
        await onRefresh();
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Estimate save failed";
      setResult({ ok: false, kind: "error", message });
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  if (data.errors.estimates || data.errors.jobs || data.errors.estimateLines) {
    return (
      <div className="space-y-3">
        {data.errors.jobs ? <SectionError title="Waiting jobs unavailable" message={data.errors.jobs} /> : null}
        {data.errors.estimates ? <SectionError title="Estimates unavailable" message={data.errors.estimates} /> : null}
        {data.errors.estimateLines ? <SectionError title="Estimate lines unavailable" message={data.errors.estimateLines} /> : null}
      </div>
    );
  }

  if (eligible.length === 0) {
    return <EmptyState icon={<FileText className="size-8" />} title="No estimates ready to edit" detail="Jobs that need an estimate will appear here automatically." />;
  }

  if (!draft) return null;

  return (
    <div className="grid min-h-[680px] gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="border-y bg-background">
        <div className="border-b bg-muted/30 px-3 py-2">
          <h2 className="text-sm font-semibold">Estimates to finish</h2>
          <p className="text-[11px] text-muted-foreground">{eligible.length} estimate{eligible.length === 1 ? "" : "s"}</p>
        </div>
        <div className="divide-y">
          {eligible.map((estimate) => {
            const job = data.jobs.find((item) => item.estimateId === estimate.id);
            const active = estimate.id === selectedId;
            return (
              <button
                type="button"
                key={estimate.id}
                onClick={() => setSelectedId(estimate.id)}
                className={`w-full px-3 py-2.5 text-left hover:bg-accent ${active ? "border-l-2 border-foreground bg-muted/50 pl-2.5" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-xs font-medium">{estimate.name}</p>
                  <StatusBadge status={estimate.status} />
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">Job #{job?.number || "-"} / Estimate #{estimate.number || "-"}</p>
                <p className="mt-1 text-xs font-medium tabular-nums">{money(estimate.total || estimate.subtotal)}</p>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="min-w-0 space-y-4">
        <section className="border-y bg-background">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
            <div className="flex items-center gap-2">
              <ReceiptText className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Estimate #{draft.number || "-"}</h2>
              <StatusBadge status={draft.status} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">Job #{linkedJob?.number || "-"}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs" disabled={actionPending !== null}>
                    Change status <ChevronDown className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="text-xs">Change estimate to</DropdownMenuLabel>
                  {ESTIMATE_QUEUE_STATUSES.map((status) => (
                    <DropdownMenuItem key={status} className="text-xs" onSelect={() => setPendingStatus(status)}>
                      {status}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7 text-destructive hover:text-destructive"
                    aria-label="Delete estimate"
                    title="Delete estimate"
                    disabled={actionPending !== null}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete estimate #{draft.number || "-"}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently deletes the estimate and its {draft.lines.length} service{draft.lines.length === 1 ? "" : "s"}. Job #{linkedJob?.number || "-"} will be put on hold and disconnected from this estimate. This does not delete an estimate from QuickBooks.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={() => void removeEstimate()}>
                      Delete estimate
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <AlertDialog open={pendingStatus !== null} onOpenChange={(open) => !open && setPendingStatus(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Mark estimate #{draft.number || "-"} {pendingStatus}?</AlertDialogTitle>
                <AlertDialogDescription>
                  {pendingStatus === "Declined" || pendingStatus === "Expired"
                    ? `The estimate will leave Estimates to finish, and Job #${linkedJob?.number || "-"} will be put on hold.`
                    : "The estimate will leave Estimates to finish. The job will continue waiting for approval."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => pendingStatus && void changeStatus(pendingStatus)}
                  disabled={actionPending !== null}
                >
                  Confirm status
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <div className="grid gap-3 p-3 md:grid-cols-[minmax(240px,1fr)_160px_160px]">
            <Field label="Estimate name" required><Input value={draft.name} onChange={(event) => patchDraft({ name: event.target.value })} className="h-8 text-xs" /></Field>
            <Field label="Estimate date" required><Input type="date" value={draft.estimateDate || today()} onChange={(event) => patchDraft({ estimateDate: event.target.value })} className="h-8 text-xs" /></Field>
            <Field label="Expiration date" required><Input type="date" value={draft.expirationDate || plusDays(draft.estimateDate || today(), 30)} onChange={(event) => patchDraft({ expirationDate: event.target.value })} className="h-8 text-xs" /></Field>
          </div>
        </section>

        <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_330px]">
          <section className="min-w-0 border-y bg-background">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
              <div><h2 className="text-sm font-semibold">Services and pricing</h2><p className="text-[11px] text-muted-foreground">{draft.lines.length} service{draft.lines.length === 1 ? "" : "s"}</p></div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs" disabled={!data.services[0]} onClick={() => data.services[0] && patchDraft({ lines: [...draft.lines, serviceLine(data.services[0], draft.lines.length)] })}><Plus className="size-3.5" /> Price Book</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => patchDraft({ lines: [...draft.lines, customLine(draft.lines.length)] })}><PencilLine className="size-3.5" /> Custom service</Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                <div className="grid grid-cols-[60px_minmax(180px,1.2fr)_80px_110px_minmax(170px,1fr)_90px_36px] gap-2 border-b bg-muted/20 px-3 py-1.5 text-[10px] font-medium uppercase text-muted-foreground"><span>Order</span><span>Service / line</span><span className="text-right">Qty</span><span className="text-right">Unit price</span><span>Description</span><span className="text-right">Total</span><span /></div>
                {draft.lines.map((line, index) => (
                  <div key={line.id} className="grid grid-cols-[60px_minmax(180px,1.2fr)_80px_110px_minmax(170px,1fr)_90px_36px] items-start gap-2 border-b px-3 py-2 last:border-0">
                    <div className="flex items-center"><IconButton label="Move up" disabled={index === 0} onClick={() => moveLine(index, -1)}><ArrowUp className="size-3.5" /></IconButton><IconButton label="Move down" disabled={index === draft.lines.length - 1} onClick={() => moveLine(index, 1)}><ArrowDown className="size-3.5" /></IconButton></div>
                    <div className="grid gap-1">
                      <NativeSelect value={line.serviceId || ""} onChange={(event) => selectService(line.id, event.target.value)}><option value="">Custom line</option>{data.services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</NativeSelect>
                      <Input value={line.name} onChange={(event) => updateLine(line.id, { name: event.target.value })} className="h-7 text-xs" />
                    </div>
                    <NumericInput value={line.quantity} min={0.01} onChange={(value) => updateLine(line.id, { quantity: value || 0 })} />
                    <NumericInput value={line.unitPrice} onChange={(value) => updateLine(line.id, { unitPrice: value || 0 })} />
                    <Textarea value={line.description} onChange={(event) => updateLine(line.id, { description: event.target.value })} className="min-h-8 resize-none text-xs" rows={1} />
                    <p className="pt-2 text-right text-xs font-medium tabular-nums">{money(line.quantity * line.unitPrice)}</p>
                    <IconButton label="Remove line" className="text-muted-foreground hover:text-destructive" onClick={() => patchDraft({ lines: draft.lines.filter((item) => item.id !== line.id) })}><Trash2 className="size-3.5" /></IconButton>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-3 border-t bg-muted/10 p-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Subtotal"><div className="flex h-8 items-center justify-end rounded-md border bg-muted/30 px-2 text-xs font-medium tabular-nums">{money(totals.subtotal)}</div></Field>
              <Field label="Discount"><NumericInput value={draft.discount} onChange={(value) => patchDraft({ discount: value || 0 })} /></Field>
              <Field label="Tax %"><NumericInput value={draft.taxPercent} max={100} onChange={(value) => patchDraft({ taxPercent: value || 0 })} /></Field>
              <Field label="Total"><div className="flex h-8 items-center justify-end rounded-md border bg-foreground px-2 text-xs font-semibold tabular-nums text-background">{money(totals.total)}</div></Field>
            </div>
          </section>

          <aside className="border-y bg-background">
            <div className="border-b bg-muted/30 px-3 py-2"><h2 className="text-sm font-semibold">Customer preview</h2></div>
            <div className="space-y-4 p-4 text-xs">
              <div><p className="text-[10px] uppercase text-muted-foreground">Prepared for</p><p className="mt-1 font-semibold">{contact?.name || "Contact unavailable"}</p>{contact?.company && contact.company !== contact.name ? <p>{contact.company}</p> : null}<p className="text-muted-foreground">{[contact?.address, contact?.city, contact?.state, contact?.zip].filter(Boolean).join(", ")}</p><p className="text-muted-foreground">{contact?.email}</p></div>
              <div className="flex justify-between gap-4"><div><p className="text-[10px] uppercase text-muted-foreground">Estimate date</p><p>{dateLabel(draft.estimateDate)}</p></div><div className="text-right"><p className="text-[10px] uppercase text-muted-foreground">Expires</p><p>{dateLabel(draft.expirationDate)}</p></div></div>
              <Separator />
              <div className="space-y-2">{draft.lines.map((line) => <div key={line.id} className="flex justify-between gap-3"><div className="min-w-0"><p className="font-medium">{line.name || "Untitled line"}</p><p className="line-clamp-2 text-[10px] text-muted-foreground">{line.description}</p><p className="text-[10px] text-muted-foreground">{line.quantity} x {money(line.unitPrice)}</p></div><p className="shrink-0 font-medium tabular-nums">{money(line.quantity * line.unitPrice)}</p></div>)}</div>
              <Separator />
              <div className="space-y-1"><div className="flex justify-between"><span>Subtotal</span><span>{money(totals.subtotal)}</span></div><div className="flex justify-between text-muted-foreground"><span>Discount</span><span>-{money(totals.discount)}</span></div><div className="flex justify-between text-muted-foreground"><span>Tax</span><span>{money(totals.taxAmount)}</span></div><div className="flex justify-between pt-1 text-sm font-semibold"><span>Total</span><span>{money(totals.total)}</span></div></div>
              {draft.notes ? <div className="border-t pt-3"><p className="text-[10px] uppercase text-muted-foreground">Notes</p><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{draft.notes}</p></div> : null}
            </div>
          </aside>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
          <section className="border-y bg-background">
            <div className="border-b bg-muted/30 px-3 py-2"><h2 className="text-sm font-semibold">Estimate notes</h2></div>
            <div className="grid gap-3 p-3 md:grid-cols-2">
              <Field label="Customer notes"><Textarea value={draft.notes} onChange={(event) => patchDraft({ notes: event.target.value })} className="min-h-24 text-xs" /></Field>
              <Field label="Internal notes"><Textarea value={draft.internalNotes} onChange={(event) => patchDraft({ internalNotes: event.target.value })} className="min-h-24 text-xs" /></Field>
            </div>
          </section>

          <section className="border-y bg-background">
            <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2"><h2 className="text-sm font-semibold">QuickBooks</h2><StatusBadge status={draft.qboSyncStatus || "Not Synced"} /></div>
            <div className="space-y-2 p-3 text-xs">
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Send to QuickBooks</span><span>{draft.createQboDraft ? "Requested" : "Not requested"}</span></div>
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">QuickBooks estimate</span><span>{draft.qboDocNumber || "Not created"}</span></div>
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Last updated</span><span>{draft.qboLastSynced ? new Date(draft.qboLastSynced).toLocaleString() : "Never"}</span></div>
              {draft.qboSyncError ? <div className="rounded border border-red-200 bg-red-50 p-2 text-red-800">QuickBooks needs attention. Try again or contact support.</div> : null}
              <p className="border-t pt-2 text-[10px] text-muted-foreground">This request will wait until the QuickBooks connection is turned on.</p>
            </div>
          </section>
        </div>

        {validation.length > 0 ? <Alert variant="destructive"><AlertTriangle className="size-4" /><AlertTitle>Check estimate</AlertTitle><AlertDescription>{validation.join(". ")}</AlertDescription></Alert> : null}
        {result && !result.ok ? <Alert variant="destructive"><AlertTriangle className="size-4" /><AlertTitle>{result.kind === "partial" ? "Some changes were saved" : result.kind === "validation" ? "Check required information" : "Could not save"}</AlertTitle><AlertDescription>{result.message}</AlertDescription></Alert> : null}

        <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-y bg-background/95 px-3 py-2 backdrop-blur">
          <span className="mr-auto text-xs text-muted-foreground">Draft only / {draft.lines.length} lines / {money(totals.total)}</span>
          <Button variant="outline" className="h-8" disabled={saving || actionPending !== null} onClick={() => void save(false)}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save draft</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button className="h-8" disabled={saving || actionPending !== null || draft.qboSyncStatus === "Queued for Draft"}><SendToBack className="size-4" /> Save for QuickBooks</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Save this estimate for QuickBooks?</AlertDialogTitle><AlertDialogDescription>This saves the estimate and marks it to be created in QuickBooks when the connection is available. Nothing is sent now.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => void save(true)}>Save for QuickBooks</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
