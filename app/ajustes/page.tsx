import { SitePageShell } from "@/components/layout/site-page-shell";
import { getCurrentUser } from "@/lib/home-data";
import { redirect } from "next/navigation";

export default async function AjustesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <SitePageShell user={user} className="text-white">
      <div className="flex flex-1 flex-col items-center justify-center px-[18px]">
        <p className="text-[30px] font-normal tracking-wide">ajustes</p>
        <p className="mt-4 max-w-xl text-center text-[22px] tracking-wide text-white/[0.72]">
          Pronto podrás cambiar tu cuenta desde aquí.
        </p>
      </div>
    </SitePageShell>
  );
}
