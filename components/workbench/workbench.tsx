"use client";

import { useState } from "react";
import { Calculator, ClipboardCheck, FilePenLine, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { refreshWorkbenchData } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { OPERATIONAL_JOB_STATUSES, type WorkbenchData } from "@/lib/workbench-contract";
import { ApprovalAssignmentTab } from "./approval-assignment-tab";
import { EstimateBuilderTab } from "./estimate-builder-tab";
import { PriceJobsTab } from "./price-jobs-tab";
import { IconButton } from "./shared";

type WorkflowStep = "price" | "estimate" | "approval";

export function Workbench({ initialData }: { initialData: WorkbenchData }) {
  const [data, setData] = useState(initialData);
  const [activeStep, setActiveStep] = useState<WorkflowStep>("price");
  const [refreshing, setRefreshing] = useState(false);
  const waiting = data.jobs.filter((job) => job.status === "Waiting for Estimate").length;
  const operational = data.jobs.filter((job) => OPERATIONAL_JOB_STATUSES.includes(job.status as (typeof OPERATIONAL_JOB_STATUSES)[number])).length;
  const draftWaitingIds = new Set(data.jobs.filter((job) => job.status === "Waiting for Estimate").map((job) => job.estimateId));
  const drafts = data.estimates.filter((estimate) => estimate.status === "Draft" && draftWaitingIds.has(estimate.id)).length;
  const workflowSteps = [
    { value: "price" as const, number: "1", title: "Price work", mobileTitle: "Price", detail: "New calculation", icon: Calculator, count: null, activeClass: "data-[state=active]:border-emerald-200 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-950", numberClass: "bg-emerald-100 text-emerald-800" },
    { value: "estimate" as const, number: "2", title: "Build estimates", mobileTitle: "Estimate", detail: drafts === 1 ? "1 needs pricing" : `${drafts} need pricing`, icon: FilePenLine, count: drafts, activeClass: "data-[state=active]:border-amber-200 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-950", numberClass: "bg-amber-100 text-amber-800" },
    { value: "approval" as const, number: "3", title: "Approve & schedule", mobileTitle: "Approve", detail: `${waiting} approval / ${operational} operational`, icon: ClipboardCheck, count: waiting, activeClass: "data-[state=active]:border-blue-200 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-950", numberClass: "bg-blue-100 text-blue-800" },
  ];
  const stageStatus = activeStep === "price"
    ? { label: "Pricing calculator", detail: "Ready for services and cost details", tone: "border-emerald-500", dot: "bg-emerald-600" }
    : activeStep === "estimate"
      ? { label: "Estimate preparation", detail: drafts === 0 ? "No estimates need pricing" : `${drafts} estimate${drafts === 1 ? "" : "s"} need pricing`, tone: "border-amber-500", dot: "bg-amber-500" }
      : { label: "Approval and scheduling", detail: `${waiting} awaiting approval and ${operational} operational`, tone: "border-blue-500", dot: "bg-blue-600" };

  async function refresh() {
    setRefreshing(true);
    try {
      setData(await refreshWorkbenchData());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The latest data could not be loaded");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <Tabs value={activeStep} onValueChange={(value) => setActiveStep(value as WorkflowStep)} className="w-full gap-0">
      <div className="sticky top-0 z-20 border-b bg-slate-50/95 shadow-xs backdrop-blur">
        <div className="mx-auto max-w-[1600px] px-2 py-2 sm:px-5 sm:py-3">
          <TabsList className="grid h-auto! w-full grid-cols-3 overflow-hidden rounded-md border bg-background p-0 shadow-xs">
            {workflowSteps.map((step) => {
              const StepIcon = step.icon;
              return (
                <TabsTrigger
                  key={step.value}
                  value={step.value}
                  className={cn(
                    "h-14 min-w-0 flex-col justify-center gap-1 rounded-none border-0 border-r px-1 text-center shadow-none last:border-r-0 data-[state=active]:shadow-none sm:h-16 sm:flex-row sm:justify-start sm:gap-2 sm:px-4 sm:text-left",
                    step.activeClass
                  )}
                >
                  <span className={cn("hidden size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold sm:flex", step.numberClass)}>{step.number}</span>
                  <StepIcon className="size-4 shrink-0 text-muted-foreground sm:hidden lg:block" />
                  <span className="min-w-0 sm:flex-1">
                    <span className="block text-[10px] font-semibold leading-tight sm:hidden">{step.mobileTitle}</span>
                    <span className="hidden whitespace-normal text-xs font-semibold leading-tight sm:block">{step.title}</span>
                    <span className="mt-0.5 hidden truncate text-[10px] font-normal text-muted-foreground md:block">{step.detail}</span>
                  </span>
                  {step.count !== null && step.count > 0 ? <Badge className="hidden h-5 min-w-5 rounded-full px-1.5 text-[10px] sm:inline-flex">{step.count}</Badge> : null}
                </TabsTrigger>
              );
            })}
          </TabsList>
          <div className={cn("mt-2 flex min-h-10 items-center justify-between gap-2 border-l-2 bg-background px-2.5 py-1.5 shadow-xs sm:min-h-9 sm:px-3", stageStatus.tone)}>
            <div className="flex min-w-0 items-center gap-2 text-xs">
              <span className={cn("size-2 shrink-0 rounded-full", stageStatus.dot)} />
              <span className="shrink-0 font-semibold">{stageStatus.label}</span>
              <span className="hidden truncate text-muted-foreground sm:inline">{stageStatus.detail}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-[10px] text-muted-foreground">
              <span className="hidden md:inline">Updated {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" }).format(new Date(data.loadedAt))}</span>
              <IconButton label="Refresh data" onClick={() => void refresh()} disabled={refreshing} className="bg-muted/60 hover:bg-muted">
                {refreshing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
              </IconButton>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1600px] px-2 py-3 sm:px-5 sm:py-5">
        <TabsContent value="price" className="mt-0"><PriceJobsTab data={data} onRefresh={refresh} /></TabsContent>
        <TabsContent value="estimate" className="mt-0"><EstimateBuilderTab data={data} onRefresh={refresh} /></TabsContent>
        <TabsContent value="approval" className="mt-0"><ApprovalAssignmentTab data={data} onRefresh={refresh} /></TabsContent>
      </div>
    </Tabs>
  );
}
