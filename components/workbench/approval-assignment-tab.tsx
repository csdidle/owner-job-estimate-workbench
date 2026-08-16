"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  RefreshCw,
  Save,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { getReleaseResult, releaseJob, updateActiveJob } from "@/app/actions";
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
            toast.success("Existing job is Active and estimate is Accepted");
            await onRefresh();
            return;
          }
        }
      } catch (error) {
        setResult({ ok: false, kind: "error", message: error instanceof Error ? error.message : "Release refresh failed" });
        setReleasingJobId(null);
        return;
      }
    }
    setReleasingJobId(null);
    setResult({ ok: false, kind: "partial", message: "Release is still pending in the shared manager workflow. Refresh to check the existing job and estimate." });
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
      const message = error instanceof Error ? error.message : "Release command failed";
      setResult({ ok: false, kind: "error", message });
      setReleasingJobId(null);
      toast.error(message);
    }
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
    <div className="space-y-4">
      {result && !result.ok ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>{result.kind === "partial" ? "Workflow still pending" : result.kind === "validation" ? "Validation" : "Operation failed"}</AlertTitle>
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      ) : null}

      {releaseOutcome ? (
        <Alert className="border-blue-200 bg-blue-50 text-blue-900">
          {releaseOutcome.jobStatus === "Active" && releaseOutcome.estimateStatus === "Accepted" ? <CheckCircle2 className="size-4" /> : <Loader2 className="size-4 animate-spin" />}
          <AlertTitle>Manager release outcome</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2">Existing job <StatusBadge status={releaseOutcome.jobStatus} /> Linked estimate <StatusBadge status={releaseOutcome.estimateStatus} /></AlertDescription>
        </Alert>
      ) : null}

      <section className="border-y bg-background">
        <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
          <div className="flex items-center gap-2"><ClipboardCheck className="size-4 text-muted-foreground" /><div><h2 className="text-sm font-semibold">Waiting for estimate approval</h2><p className="text-[11px] text-muted-foreground">{waitingJobs.length} job{waitingJobs.length === 1 ? "" : "s"}</p></div></div>
          <IconButton label="Refresh approval queue" onClick={onRefresh}><RefreshCw className="size-3.5" /></IconButton>
        </div>
        {waitingJobs.length === 0 ? (
          <EmptyState icon={<ClipboardCheck className="size-8" />} title="No jobs awaiting manager release" detail="Estimate-gated jobs appear here after shared routing links the waiting job and estimate." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-xs">
              <thead><tr className="border-b bg-muted/20 text-left text-[10px] uppercase text-muted-foreground"><th className="px-3 py-2 font-medium">Job</th><th className="px-3 py-2 font-medium">Contact</th><th className="px-3 py-2 font-medium">Estimate</th><th className="px-3 py-2 font-medium">Amount</th><th className="px-3 py-2 font-medium">Schedule</th><th className="px-3 py-2 text-right font-medium">Manager action</th></tr></thead>
              <tbody>
                {waitingJobs.map((job) => {
                  const estimate = data.estimates.find((item) => item.id === job.estimateId);
                  const contact = data.contacts.find((item) => item.id === job.contactId);
                  const isReleasing = releasingJobId === job.id;
                  return (
                    <tr key={job.id} className="border-b last:border-0">
                      <td className="max-w-[240px] px-3 py-2"><p className="truncate font-medium">Job #{job.number || "-"} {job.name}</p><StatusBadge status={job.status} /></td>
                      <td className="px-3 py-2"><p className="font-medium">{contact?.name || "Contact unavailable"}</p><p className="text-[10px] text-muted-foreground">{contact?.company}</p></td>
                      <td className="max-w-[260px] px-3 py-2"><p className="truncate font-medium">#{estimate?.number || "-"} {estimate?.name || "Linked estimate unavailable"}</p><div className="mt-1 flex gap-1.5"><StatusBadge status={estimate?.status || null} />{estimate?.qboSyncStatus ? <StatusBadge status={estimate.qboSyncStatus} /> : null}</div></td>
                      <td className="px-3 py-2 font-medium tabular-nums">{money(estimate?.total || estimate?.subtotal || 0)}</td>
                      <td className="px-3 py-2"><p>{dateLabel(job.scheduledDate)}</p><p className="text-[10px] text-muted-foreground">{job.priority || "Normal"} / {job.jobType || "One-Time"}</p></td>
                      <td className="px-3 py-2 text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button size="sm" className="h-8" disabled={isReleasing || !estimate}>{isReleasing ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />} Confirm approval</Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Release existing job?</AlertDialogTitle>
                              <AlertDialogDescription>This sets Release to Pipeline to true on Job #{job.number || "-"}. The shared manager-release automation must mark estimate #{estimate?.number || "-"} Accepted and activate this same job.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => void confirmRelease(job.id)}>Confirm release</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="border-y bg-background">
        <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
          <div className="flex items-center gap-2"><BriefcaseBusiness className="size-4 text-muted-foreground" /><div><h2 className="text-sm font-semibold">Active job assignment</h2><p className="text-[11px] text-muted-foreground">{activeJobs.length} active job{activeJobs.length === 1 ? "" : "s"}</p></div></div>
          <IconButton label="Refresh active jobs" onClick={onRefresh}><RefreshCw className="size-3.5" /></IconButton>
        </div>
        {activeJobs.length === 0 ? (
          <EmptyState icon={<BriefcaseBusiness className="size-8" />} title="No Active jobs" detail="Jobs activated by shared routing and manager release appear here for assignment." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-xs">
              <thead><tr className="border-b bg-muted/20 text-left text-[10px] uppercase text-muted-foreground"><th className="px-3 py-2 font-medium">Job</th><th className="px-3 py-2 font-medium">Contact</th><th className="px-3 py-2 font-medium">Assigned crew</th><th className="px-3 py-2 font-medium">Scheduled date</th><th className="px-3 py-2 font-medium">Priority</th><th className="px-3 py-2 font-medium">Job type</th><th className="px-3 py-2" /></tr></thead>
              <tbody>
                {activeJobs.map((job) => {
                  const draft = assignments[job.id];
                  const contact = data.contacts.find((item) => item.id === job.contactId);
                  if (!draft) return null;
                  return (
                    <tr key={job.id} className="border-b last:border-0">
                      <td className="max-w-[230px] px-3 py-2"><p className="truncate font-medium">Job #{job.number || "-"} {job.name}</p><StatusBadge status={job.status} /></td>
                      <td className="max-w-[180px] px-3 py-2"><p className="truncate">{contact?.name || "Contact unavailable"}</p><p className="truncate text-[10px] text-muted-foreground">{contact?.company}</p></td>
                      <td className="w-[230px] px-3 py-2"><CrewPicker employees={data.employees} value={draft.assignedCrewIds} onChange={(ids) => patchAssignment(job.id, { assignedCrewIds: ids })} /></td>
                      <td className="w-[150px] px-3 py-2"><Input type="date" className="h-8 text-xs" value={draft.scheduledDate || ""} onChange={(event) => patchAssignment(job.id, { scheduledDate: event.target.value || null })} /></td>
                      <td className="w-[120px] px-3 py-2"><NativeSelect value={draft.priority} onChange={(event) => patchAssignment(job.id, { priority: event.target.value as JobPriority })}>{JOB_PRIORITIES.map((item) => <option key={item}>{item}</option>)}</NativeSelect></td>
                      <td className="w-[140px] px-3 py-2"><NativeSelect value={draft.jobType} onChange={(event) => patchAssignment(job.id, { jobType: event.target.value as JobType })}>{JOB_TYPES.map((item) => <option key={item}>{item}</option>)}</NativeSelect></td>
                      <td className="px-3 py-2 text-right"><IconButton label="Save assignment" disabled={savingJobId === job.id} onClick={() => void saveAssignment(job.id)}>{savingJobId === job.id ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}</IconButton></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
