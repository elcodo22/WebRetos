import { SiteHeader } from "@/components/layout/site-header";
import { getCurrentUser } from "@/lib/home-data";
import { redirect } from "next/navigation";

export default async function AjustesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-full min-h-0 flex-col text-white">
      <SiteHeader user={user} showCountdown={false} />
      <div className="flex flex-1 flex-col items-center justify-center px-[18px]">
        <p className="text-[24px] font-normal tracking-wide">ajustes</p>
        <p className="mt-4 max-w-xl text-center text-[18px] tracking-wide text-white/[0.72]">
          Pronto podrás cambiar tu cuenta desde aquí.
        </p>
      </div>
    </div>
  );
}
