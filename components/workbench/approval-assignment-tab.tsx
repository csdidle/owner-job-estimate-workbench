"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  RefreshCw,
  Save,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { cancelJob, getReleaseResult, releaseJob, updateActiveJob } from "@/app/actions";
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
import { Input } from "@/components/ui/input";
import {
  JOB_PRIORITIES,
  JOB_TYPES,
  type ActionResult,
  type JobPriority,
  type JobRecord,
  type JobType,
  type WorkbenchData,
} from "@/lib/workbench-contract";
import {
  CrewPicker,
  EmptyState,
  IconButton,
  NativeSelect,
  SectionError,
  StatusBadge,
  dateLabel,
  money,
} from "./shared";

type AssignmentDraft = {
  assignedCrewIds: string[];
  scheduledDate: string | null;
  priority: JobPriority;
  jobType: JobType;
};

type ReleaseOutcome = {
  jobId: string;
  jobStatus: string | null;
  estimateStatus: string | null;
};

export function ApprovalAssignmentTab({ data, onRefresh }: { data: WorkbenchData; onRefresh: () => Promise<void> }) {
  const waitingJobs = useMemo(() => data.jobs.filter((job) => job.status === "Waiting for Estimate"), [data.jobs]);
  const activeJobs = useMemo(() => data.jobs.filter((job) => job.status === "Active"), [data.jobs]);
  const [assignments, setAssignments] = useState<Record<string, AssignmentDraft>>({});
  const [savingJobId, setSavingJobId] = useState<string | null>(null);
  const [releasingJobId, setReleasingJobId] = useState<string | null>(null);
  const [cancellingJobId, setCancellingJobId] = useState<string | null>(null);
  const [releaseOutcome, setReleaseOutcome] = useState<ReleaseOutcome | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);

  useEffect(() => {
    setAssignments(Object.fromEntries(activeJobs.map((job) => [job.id, {
      assignedCrewIds: job.assignedCrewIds,
      scheduledDate: job.scheduledDate,
      priority: job.priority || "Normal",
      jobType: job.jobType || "One-Time",
    }])));
  }, [activeJobs, data.loadedAt]);

  function patchAssignment(jobId: string, patch: Partial<AssignmentDraft>) {
    setAssignments((current) => ({ ...current, [jobId]: { ...current[jobId], ...patch } }));
  }

  async function saveAssignment(jobId: string) {
    const draft = assignments[jobId];
    if (!draft) return;
    setSavingJobId(jobId);
    setResult(null);
    try {
      const response = await updateActiveJob({ jobId, ...draft });
      setResult(response);
      response.ok ? toast.success(response.message) : toast.error(response.message);
      if (response.ok) await onRefresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Assignment update failed";
      setResult({ ok: false, kind: "error", message });
      toast.error(message);
    } finally {
      setSavingJobId(null);
    }
  }

  async function pollRelease(jobId: string) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      try {
        const response = await getReleaseResult(jobId);
        if (response.ok && "job" in response) {
          setReleaseOutcome({
            jobId,
            jobStatus: response.job.status,
            estimateStatus: response.estimate?.status || null,
          });
          if (response.job.status === "Active" && response.estimate?.status === "Accepted") {
            setReleasingJobId(null);
            toast.success("The estimate is approved and the job is ready");
            await onRefresh();
            return;
          }
        }
      } catch (error) {
        setResult({ ok: false, kind: "error", message: error instanceof Error ? error.message : "Approval status could not be refreshed" });
        setReleasingJobId(null);
        return;
      }
    }
    setReleasingJobId(null);
    setResult({ ok: false, kind: "partial", message: "The approval is still being processed. Refresh to check the job and estimate again." });
  }

  async function confirmRelease(jobId: string) {
    setReleasingJobId(jobId);
    setReleaseOutcome(null);
    setResult(null);
    try {
      const response = await releaseJob(jobId);
      setResult(response);
      if (response.ok) {
        toast.success(response.message);
        void pollRelease(jobId);
      } else {
        toast.error(response.message);
        setReleasingJobId(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Approval could not be submitted";
      setResult({ ok: false, kind: "error", message });
      setReleasingJobId(null);
      toast.error(message);
    }
  }

  async function cancelSelectedJob(jobId: string) {
    setCancellingJobId(jobId);
    setResult(null);
    try {
      const response = await cancelJob(jobId);
      setResult(response);
      response.ok ? toast.success(response.message) : toast.error(response.message);
      if (response.ok || response.kind === "partial") await onRefresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Job could not be cancelled";
      setResult({ ok: false, kind: "error", message });
      toast.error(message);
    } finally {
      setCancellingJobId(null);
    }
  }

  function cancelControl(job: JobRecord) {
    const isCancelling = cancellingJobId === job.id;
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <IconButton label="Cancel job" className="text-muted-foreground hover:text-destructive" disabled={isCancelling || releasingJobId === job.id || savingJobId === job.id}>
            {isCancelling ? <Loader2 className="size-3.5 animate-spin" /> : <Ban className="size-3.5" />}
          </IconButton>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Job #{job.number || "-"}?</AlertDialogTitle>
            <AlertDialogDescription>
              {job.status === "Waiting for Estimate"
                ? "The Job will be marked Cancelled and its linked Estimate will be marked Declined. All records will be retained."
                : "The Job will be marked Cancelled and retained for history. Linked Pricing and Estimates will not be changed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep job</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void cancelSelectedJob(job.id)}>Cancel job</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  const fatalErrors = [data.errors.jobs, data.errors.estimates, data.errors.contacts, data.errors.employees].filter(Boolean);
  if (fatalErrors.length > 0) {
    return (
      <div className="space-y-3">
        {data.errors.jobs ? <SectionError title="Jobs unavailable" message={data.errors.jobs} /> : null}
        {data.errors.estimates ? <SectionError title="Estimates unavailable" message={data.errors.estimates} /> : null}
        {data.errors.contacts ? <SectionError title="Contacts unavailable" message={data.errors.contacts} /> : null}
        {data.errors.employees ? <SectionError title="Employees unavailable" message={data.errors.employees} /> : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {result && !result.ok ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>{result.kind === "partial" ? "Request still processing" : result.kind === "validation" ? "Check required information" : "Could not complete request"}</AlertTitle>
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      ) : null}

      {releaseOutcome ? (
        <Alert className="border-blue-200 bg-blue-50 text-blue-900">
          {releaseOutcome.jobStatus === "Active" && releaseOutcome.estimateStatus === "Accepted" ? <CheckCircle2 className="size-4" /> : <Loader2 className="size-4 animate-spin" />}
          <AlertTitle>Approval result</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2">Job <StatusBadge status={releaseOutcome.jobStatus} /> Estimate <StatusBadge status={releaseOutcome.estimateStatus} /></AlertDescription>
        </Alert>
      ) : null}

      <section className="overflow-hidden rounded-md border border-amber-200 bg-background shadow-xs">
        <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50/70 px-3 py-2.5">
          <div className="flex items-center gap-2"><ClipboardCheck className="size-4 text-amber-700" /><div><h2 className="text-sm font-semibold text-amber-950">Waiting for estimate approval</h2><p className="text-[11px] text-amber-800/70">{waitingJobs.length} job{waitingJobs.length === 1 ? "" : "s"}</p></div></div>
          <IconButton label="Refresh approvals" onClick={onRefresh}><RefreshCw className="size-3.5" /></IconButton>
        </div>
        {waitingJobs.length === 0 ? (
          <EmptyState icon={<ClipboardCheck className="size-8" />} title="No jobs awaiting approval" detail="Jobs that need an estimate will appear here until the estimate is approved." />
        ) : (
          <>
            <div className="divide-y xl:hidden">
              {waitingJobs.map((job) => {
                const estimate = data.estimates.find((item) => item.id === job.estimateId);
                const contact = data.contacts.find((item) => item.id === job.contactId);
                const isReleasing = releasingJobId === job.id;
                return (
                  <div key={job.id} className="space-y-3 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold">Job #{job.number || "-"} {job.name}</p>
                        <div className="mt-1"><StatusBadge status={job.status} /></div>
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums">{money(estimate?.total || estimate?.subtotal || 0)}</p>
                    </div>
                    <div className="grid gap-3 border-y py-3 sm:grid-cols-2">
                      <div><p className="text-[10px] font-semibold uppercase text-muted-foreground">Contact</p><p className="mt-1 text-xs font-medium">{contact?.name || "Contact unavailable"}</p>{contact?.company ? <p className="text-[10px] text-muted-foreground">{contact.company}</p> : null}</div>
                      <div><p className="text-[10px] font-semibold uppercase text-muted-foreground">Schedule</p><p className="mt-1 text-xs">{dateLabel(job.scheduledDate)}</p><p className="text-[10px] text-muted-foreground">{job.priority || "Normal"} / {job.jobType || "One-Time"}</p></div>
                      <div className="sm:col-span-2"><p className="text-[10px] font-semibold uppercase text-muted-foreground">Estimate</p><p className="mt-1 break-words text-xs font-medium">#{estimate?.number || "-"} {estimate?.name || "Estimate unavailable"}</p><div className="mt-1 flex flex-wrap gap-1.5"><StatusBadge status={estimate?.status || null} />{estimate?.qboSyncStatus ? <StatusBadge status={estimate.qboSyncStatus} /> : null}</div></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button className="h-10 flex-1 bg-blue-700 font-semibold text-white shadow-sm hover:bg-blue-800" disabled={isReleasing || cancellingJobId === job.id || !estimate}>{isReleasing ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />} Confirm approval</Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Approve estimate and start this job?</AlertDialogTitle>
                            <AlertDialogDescription>This approves estimate #{estimate?.number || "-"} and makes Job #{job.number || "-"} ready to schedule.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => void confirmRelease(job.id)}>Approve and start job</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      {cancelControl(job)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto xl:block">
            <table className="w-full min-w-[920px] text-xs">
              <thead><tr className="border-b bg-muted/20 text-left text-[10px] uppercase text-muted-foreground"><th className="px-3 py-2 font-medium">Job</th><th className="px-3 py-2 font-medium">Contact</th><th className="px-3 py-2 font-medium">Estimate</th><th className="px-3 py-2 font-medium">Amount</th><th className="px-3 py-2 font-medium">Schedule</th><th className="px-3 py-2 text-right font-medium">Action</th></tr></thead>
              <tbody>
                {waitingJobs.map((job) => {
                  const estimate = data.estimates.find((item) => item.id === job.estimateId);
                  const contact = data.contacts.find((item) => item.id === job.contactId);
                  const isReleasing = releasingJobId === job.id;
                  return (
                    <tr key={job.id} className="border-b transition-colors last:border-0 hover:bg-amber-50/40">
                      <td className="max-w-[240px] px-3 py-2"><p className="truncate font-medium">Job #{job.number || "-"} {job.name}</p><StatusBadge status={job.status} /></td>
                      <td className="px-3 py-2"><p className="font-medium">{contact?.name || "Contact unavailable"}</p><p className="text-[10px] text-muted-foreground">{contact?.company}</p></td>
                      <td className="max-w-[260px] px-3 py-2"><p className="truncate font-medium">#{estimate?.number || "-"} {estimate?.name || "Estimate unavailable"}</p><div className="mt-1 flex gap-1.5"><StatusBadge status={estimate?.status || null} />{estimate?.qboSyncStatus ? <StatusBadge status={estimate.qboSyncStatus} /> : null}</div></td>
                      <td className="px-3 py-2 font-medium tabular-nums">{money(estimate?.total || estimate?.subtotal || 0)}</td>
                      <td className="px-3 py-2"><p>{dateLabel(job.scheduledDate)}</p><p className="text-[10px] text-muted-foreground">{job.priority || "Normal"} / {job.jobType || "One-Time"}</p></td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button size="sm" className="h-9 bg-blue-700 font-semibold text-white shadow-sm hover:bg-blue-800" disabled={isReleasing || cancellingJobId === job.id || !estimate}>{isReleasing ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />} Confirm approval</Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Approve estimate and start this job?</AlertDialogTitle>
                                <AlertDialogDescription>This approves estimate #{estimate?.number || "-"} and makes Job #{job.number || "-"} ready to schedule.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => void confirmRelease(job.id)}>Approve and start job</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          {cancelControl(job)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </>
        )}
      </section>

      <section className="overflow-hidden rounded-md border border-emerald-200 bg-background shadow-xs">
        <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/70 px-3 py-2.5">
          <div className="flex items-center gap-2"><BriefcaseBusiness className="size-4 text-emerald-700" /><div><h2 className="text-sm font-semibold text-emerald-950">Schedule and assign jobs</h2><p className="text-[11px] text-emerald-800/70">{activeJobs.length} job{activeJobs.length === 1 ? "" : "s"} ready</p></div></div>
          <IconButton label="Refresh jobs" onClick={onRefresh}><RefreshCw className="size-3.5" /></IconButton>
        </div>
        {activeJobs.length === 0 ? (
          <EmptyState icon={<BriefcaseBusiness className="size-8" />} title="No jobs ready to schedule" detail="Approved jobs will appear here for crew assignment and scheduling." />
        ) : (
          <>
            <div className="divide-y xl:hidden">
              {activeJobs.map((job) => {
                const draft = assignments[job.id];
                const contact = data.contacts.find((item) => item.id === job.contactId);
                if (!draft) return null;
                return (
                  <div key={job.id} className="space-y-3 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold">Job #{job.number || "-"} {job.name}</p>
                        <div className="mt-1"><StatusBadge status={job.status} /></div>
                      </div>
                      <div className="text-right"><p className="text-xs font-medium">{contact?.name || "Contact unavailable"}</p>{contact?.company ? <p className="text-[10px] text-muted-foreground">{contact.company}</p> : null}</div>
                    </div>
                    <div className="grid gap-3 border-y py-3 sm:grid-cols-2">
                      <div className="sm:col-span-2"><p className="mb-1.5 text-[11px] font-semibold text-foreground/70">Assigned crew</p><CrewPicker employees={data.employees} value={draft.assignedCrewIds} onChange={(ids) => patchAssignment(job.id, { assignedCrewIds: ids })} /></div>
                      <div><p className="mb-1.5 text-[11px] font-semibold text-foreground/70">Scheduled date</p><Input type="date" className="h-10 text-xs shadow-xs focus-visible:border-emerald-500 focus-visible:ring-emerald-500/15" value={draft.scheduledDate || ""} onChange={(event) => patchAssignment(job.id, { scheduledDate: event.target.value || null })} /></div>
                      <div><p className="mb-1.5 text-[11px] font-semibold text-foreground/70">Priority</p><NativeSelect value={draft.priority} onChange={(event) => patchAssignment(job.id, { priority: event.target.value as JobPriority })}>{JOB_PRIORITIES.map((item) => <option key={item}>{item}</option>)}</NativeSelect></div>
                      <div className="sm:col-span-2"><p className="mb-1.5 text-[11px] font-semibold text-foreground/70">Job type</p><NativeSelect value={draft.jobType} onChange={(event) => patchAssignment(job.id, { jobType: event.target.value as JobType })}>{JOB_TYPES.map((item) => <option key={item}>{item}</option>)}</NativeSelect></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button className="h-10 flex-1 bg-emerald-700 font-semibold text-white hover:bg-emerald-800" disabled={savingJobId === job.id || cancellingJobId === job.id} onClick={() => void saveAssignment(job.id)}>{savingJobId === job.id ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Save assignment</Button>
                      {cancelControl(job)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto xl:block">
            <table className="w-full min-w-[980px] text-xs">
              <thead><tr className="border-b bg-muted/20 text-left text-[10px] uppercase text-muted-foreground"><th className="px-3 py-2 font-medium">Job</th><th className="px-3 py-2 font-medium">Contact</th><th className="px-3 py-2 font-medium">Assigned crew</th><th className="px-3 py-2 font-medium">Scheduled date</th><th className="px-3 py-2 font-medium">Priority</th><th className="px-3 py-2 font-medium">Job type</th><th className="px-3 py-2" /></tr></thead>
              <tbody>
                {activeJobs.map((job) => {
                  const draft = assignments[job.id];
                  const contact = data.contacts.find((item) => item.id === job.contactId);
                  if (!draft) return null;
                  return (
                    <tr key={job.id} className="border-b transition-colors last:border-0 hover:bg-emerald-50/40">
                      <td className="max-w-[230px] px-3 py-2"><p className="truncate font-medium">Job #{job.number || "-"} {job.name}</p><StatusBadge status={job.status} /></td>
                      <td className="max-w-[180px] px-3 py-2"><p className="truncate">{contact?.name || "Contact unavailable"}</p><p className="truncate text-[10px] text-muted-foreground">{contact?.company}</p></td>
                      <td className="w-[230px] px-3 py-2"><CrewPicker employees={data.employees} value={draft.assignedCrewIds} onChange={(ids) => patchAssignment(job.id, { assignedCrewIds: ids })} /></td>
                      <td className="w-[150px] px-3 py-2"><Input type="date" className="h-9 text-xs shadow-xs focus-visible:border-emerald-500 focus-visible:ring-emerald-500/15" value={draft.scheduledDate || ""} onChange={(event) => patchAssignment(job.id, { scheduledDate: event.target.value || null })} /></td>
                      <td className="w-[120px] px-3 py-2"><NativeSelect value={draft.priority} onChange={(event) => patchAssignment(job.id, { priority: event.target.value as JobPriority })}>{JOB_PRIORITIES.map((item) => <option key={item}>{item}</option>)}</NativeSelect></td>
                      <td className="w-[140px] px-3 py-2"><NativeSelect value={draft.jobType} onChange={(event) => patchAssignment(job.id, { jobType: event.target.value as JobType })}>{JOB_TYPES.map((item) => <option key={item}>{item}</option>)}</NativeSelect></td>
                      <td className="px-3 py-2 text-right"><div className="flex items-center justify-end gap-1.5"><IconButton label="Save assignment" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800" disabled={savingJobId === job.id || cancellingJobId === job.id} onClick={() => void saveAssignment(job.id)}>{savingJobId === job.id ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}</IconButton>{cancelControl(job)}</div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
