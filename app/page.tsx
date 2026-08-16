import { BriefcaseBusiness } from "lucide-react";
import { connection } from "next/server";
import { getWorkbenchData } from "@/app/actions";
import { UserMenu } from "@/components/auth/user-menu";
import { Workbench } from "@/components/workbench/workbench";

export default async function HomePage() {
  await connection();
  const data = await getWorkbenchData();

  return (
    <main className="min-h-screen bg-slate-50/80">
      <header className="border-b border-emerald-950/10 bg-background shadow-xs">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-3 sm:px-5">
          <div className="flex size-9 items-center justify-center rounded-md bg-emerald-700 text-white shadow-sm">
            <BriefcaseBusiness className="size-4.5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-semibold">Owner Job &amp; Estimate Workbench</h1>
            <p className="text-[11px] text-muted-foreground">Create, approve, and schedule work</p>
          </div>
          <div className="ml-auto"><UserMenu /></div>
        </div>
      </header>
      <Workbench initialData={data} />
    </main>
  );
}
