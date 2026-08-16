import Image from "next/image";
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
          <Image
            src="/main-logo-grey-moss.svg"
            alt="Harris & Sharp"
            width={190}
            height={38}
            loading="eager"
            className="h-auto w-[160px] shrink-0 sm:w-[190px]"
          />
          <div className="hidden min-w-0 border-l border-emerald-950/15 pl-3 md:block">
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
