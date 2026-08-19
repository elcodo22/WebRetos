import { RedirectIfAuthed } from "@/components/auth/redirect-if-authed";
import { RegistroForm } from "@/components/auth/registro-form";
import { SiteHeader } from "@/components/layout/site-header";

export const dynamic = "force-static";

export default function RegistroPage() {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[var(--background)] text-white">
      <RedirectIfAuthed />
      <div className="hidden shrink-0 md:block">
        <SiteHeader user={null} variant="registro" />
      </div>
      <RegistroForm />
    </div>
  );
}
