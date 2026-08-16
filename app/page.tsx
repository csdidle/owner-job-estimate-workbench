import { BriefcaseBusiness } from "lucide-react";
import { connection } from "next/server";
import { getWorkbenchData } from "@/app/actions";
import { UserMenu } from "@/components/auth/user-menu";
import { Workbench } from "@/components/workbench/workbench";

export default async function HomePage() {
  await connection();
  const data = await getWorkbenchData();

  return (
    <main className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-3 sm:px-5">
          <div className="flex size-8 items-center justify-center rounded-md bg-foreground text-background">
            <BriefcaseBusiness className="size-4" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">Owner Job &amp; Estimate Workbench</h1>
            <p className="text-[10px] text-muted-foreground">Owner operations</p>
          </div>
          <div className="ml-auto"><UserMenu /></div>
        </div>
      </header>
      <Workbench initialData={data} />
    </main>
  );
}
