import { RedirectIfAuthed } from "@/components/auth/redirect-if-authed";
import { RegistroForm } from "@/components/auth/registro-form";
import { SitePageShell } from "@/components/layout/site-page-shell";

export const dynamic = "force-static";

export default function RegistroPage() {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[var(--background)] text-white">
      <RedirectIfAuthed />
      <SitePageShell user={null} variant="registro" hideMenu>
        <RegistroForm />
      </SitePageShell>
    </div>
  );
}
