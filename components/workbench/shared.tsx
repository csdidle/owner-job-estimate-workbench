"use client";

import type { ReactNode } from "react";
import { AlertCircle, Check, ChevronDown, Users } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { EmployeeOption } from "@/lib/workbench-contract";

export function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function dateLabel(value: string | null): string {
  if (!value) return "Not set";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function Field({ label, children, className, required }: {
  label: string;
  children: ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label className="text-[11px] font-semibold text-foreground/70">
        {label}{required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}

export function NativeSelect({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-md border border-input bg-background px-2.5 text-xs shadow-xs outline-none transition-colors hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50 xl:h-9",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function NumericInput({ value, onChange, min = 0, max, step = "0.01", className, disabled }: {
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type="number"
      value={value ?? ""}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
      className={cn(
        "h-10 w-full rounded-md border border-input bg-background px-2.5 text-right text-xs tabular-nums shadow-xs outline-none transition-colors hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50 xl:h-9",
        className
      )}
    />
  );
}

export function CrewPicker({ employees, value, onChange, disabled }: {
  employees: EmployeeOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const selectedNames = employees.filter((employee) => value.includes(employee.id)).map((employee) => employee.name);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 w-full justify-between px-2.5 text-xs font-normal shadow-xs hover:border-slate-300 hover:bg-background xl:h-9" disabled={disabled}>
          <span className="flex min-w-0 items-center gap-1.5">
            <Users className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{selectedNames.length ? selectedNames.join(", ") : "Unassigned"}</span>
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(18rem,calc(100vw-2rem))] p-1 sm:w-64">
        {employees.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">No active employees</p>
        ) : employees.map((employee) => {
          const checked = value.includes(employee.id);
          return (
            <button
              type="button"
              key={employee.id}
              onClick={() => onChange(checked ? value.filter((id) => id !== employee.id) : [...value, employee.id])}
              className="flex min-h-10 w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-xs hover:bg-accent xl:min-h-8 xl:py-1.5"
            >
              <span className="flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input" aria-hidden="true">
                {checked ? <Check className="size-3" /> : null}
              </span>
              <span className="min-w-0 flex-1 truncate">{employee.name}</span>
              {employee.role ? <span className="text-[10px] text-muted-foreground">{employee.role}</span> : null}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

const statusTone: Record<string, string> = {
  Draft: "border-slate-200 bg-slate-50 text-slate-700",
  "Ready to Route": "border-amber-200 bg-amber-50 text-amber-800",
  Routing: "border-blue-200 bg-blue-50 text-blue-700",
  "Job Active": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Waiting for Estimate": "border-amber-200 bg-amber-50 text-amber-800",
  "Pricing Saved": "border-teal-200 bg-teal-50 text-teal-800",
  Error: "border-red-200 bg-red-50 text-red-700",
  Active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Accepted: "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Queued for Draft": "border-blue-200 bg-blue-50 text-blue-700",
  "Pending in QBO": "border-amber-200 bg-amber-50 text-amber-800",
  "Submitted to QBO": "border-blue-200 bg-blue-50 text-blue-700",
  "Not Synced": "border-slate-200 bg-slate-50 text-slate-700",
};

const statusDot: Record<string, string> = {
  Draft: "bg-slate-500",
  "Ready to Route": "bg-amber-500",
  Routing: "bg-blue-500",
  "Job Active": "bg-emerald-600",
  "Waiting for Estimate": "bg-amber-500",
  "Pricing Saved": "bg-teal-600",
  Error: "bg-red-600",
  Active: "bg-emerald-600",
  Accepted: "bg-emerald-600",
  "Queued for Draft": "bg-blue-500",
  "Pending in QBO": "bg-amber-500",
  "Submitted to QBO": "bg-blue-500",
  "Not Synced": "bg-slate-400",
};

const statusLabel: Record<string, string> = {
  "Ready to Route": "Waiting to be created",
  Routing: "Creating records",
  "Job Active": "Job ready",
  "Waiting for Estimate": "Estimate needed",
  "Pricing Saved": "Pricing saved",
  Error: "Needs attention",
  Accepted: "Approved",
  "Queued for Draft": "Waiting for QuickBooks",
  "Pending in QBO": "In QuickBooks",
  "Submitted to QBO": "Sent to QuickBooks",
  "Not Synced": "Not in QuickBooks",
};

export function StatusBadge({ status, pulse = false }: { status: string | null; pulse?: boolean }) {
  const value = status || "Not set";
  const label = statusLabel[value] || value;
  return (
    <Badge variant="outline" className={cn("h-6 gap-1.5 rounded-full px-2 text-[10px] font-semibold shadow-xs", statusTone[value], pulse && "animate-pulse")}>
      <span className={cn("size-1.5 rounded-full", statusDot[value] || "bg-slate-400")} />
      {label}
    </Badge>
  );
}

export function SectionError({ title, message }: { title: string; message: string }) {
  return (
    <Alert variant="destructive" className="border-l-4 py-2 shadow-xs">
      <AlertCircle className="size-4" />
      <AlertTitle className="text-xs">{title}</AlertTitle>
      <AlertDescription className="text-xs">{message}</AlertDescription>
    </Alert>
  );
}

export function EmptyState({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center border-y border-dashed bg-slate-50/50 px-6 py-10 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-background text-muted-foreground shadow-xs ring-1 ring-border">{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-md text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

export function IconButton({ label, children, className, ...props }: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("size-9 xl:size-8", className)} {...props}>{children}</Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function SavedMark({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><Check className="size-3.5" /> Saved</span>;
}
