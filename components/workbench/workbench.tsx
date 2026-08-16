"use client";

import { useState } from "react";
import { Calculator, ClipboardCheck, FilePenLine, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getWorkbenchData } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { WorkbenchData } from "@/lib/workbench-contract";
import { ApprovalAssignmentTab } from "./approval-assignment-tab";
import { EstimateBuilderTab } from "./estimate-builder-tab";
import { PriceJobsTab } from "./price-jobs-tab";
import { IconButton } from "./shared";

export function Workbench({ initialData }: { initialData: WorkbenchData }) {
  const [data, setData] = useState(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const waiting = data.jobs.filter((job) => job.status === "Waiting for Estimate").length;
  const active = data.jobs.filter((job) => job.status === "Active").length;
  const draftWaitingIds = new Set(data.jobs.filter((job) => job.status === "Waiting for Estimate").map((job) => job.estimateId));
  const drafts = data.estimates.filter((estimate) => estimate.status === "Draft" && draftWaitingIds.has(estimate.id)).length;

  async function refresh() {
    setRefreshing(true);
    try {
      setData(await getWorkbenchData());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Workbench refresh failed");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <Tabs defaultValue="price" className="w-full">
      <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center gap-2 px-3 py-2 sm:px-5">
          <TabsList className="h-9 flex-1 justify-start overflow-x-auto rounded-md bg-muted/70 p-1 sm:flex-none">
            <TabsTrigger value="price" className="h-7 gap-1.5 px-3 text-xs"><Calculator className="size-3.5" /> Price Jobs</TabsTrigger>
            <TabsTrigger value="estimate" className="h-7 gap-1.5 px-3 text-xs"><FilePenLine className="size-3.5" /> Estimate Builder {drafts > 0 ? <Badge variant="secondary" className="h-4 min-w-4 rounded px-1 text-[9px]">{drafts}</Badge> : null}</TabsTrigger>
            <TabsTrigger value="approval" className="h-7 gap-1.5 px-3 text-xs"><ClipboardCheck className="size-3.5" /> Approval & Assignment {waiting > 0 ? <Badge variant="secondary" className="h-4 min-w-4 rounded px-1 text-[9px]">{waiting}</Badge> : null}</TabsTrigger>
          </TabsList>
          <div className="ml-auto hidden items-center gap-3 text-[11px] text-muted-foreground md:flex">
            <span><strong className="font-medium text-foreground">{active}</strong> active</span>
            <span><strong className="font-medium text-foreground">{waiting}</strong> waiting</span>
            <span>{new Date(data.loadedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
          </div>
          <IconButton label="Refresh workbench" onClick={() => void refresh()} disabled={refreshing}>
            {refreshing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          </IconButton>
        </div>
      </div>
      <div className="mx-auto max-w-[1600px] px-3 py-4 sm:px-5">
        <TabsContent value="price" className="mt-0"><PriceJobsTab data={data} onRefresh={refresh} /></TabsContent>
        <TabsContent value="estimate" className="mt-0"><EstimateBuilderTab data={data} onRefresh={refresh} /></TabsContent>
        <TabsContent value="approval" className="mt-0"><ApprovalAssignmentTab data={data} onRefresh={refresh} /></TabsContent>
      </div>
    </Tabs>
  );
}
