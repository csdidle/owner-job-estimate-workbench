import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="min-h-screen bg-muted/20">
      <div className="h-14 border-b bg-background" />
      <div className="border-b bg-background px-4 py-2"><Skeleton className="h-9 w-[520px] max-w-full" /></div>
      <div className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3 border-y bg-background p-3">
          <div className="grid grid-cols-2 gap-3"><Skeleton className="h-8" /><Skeleton className="h-8" /></div>
          <Skeleton className="h-9" />
          {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-12" />)}
        </div>
        <div className="space-y-3 border-y bg-background p-3">
          <Skeleton className="h-8" />
          <Skeleton className="h-28" />
          <Skeleton className="h-40" />
          <Skeleton className="h-9" />
        </div>
      </div>
    </main>
  );
}
