import { LoginForm } from "@/components/auth/login-form";
import { RedirectIfAuthed } from "@/components/auth/redirect-if-authed";
import { SiteHeader } from "@/components/layout/site-header";

export const dynamic = "force-static";

export default function LoginPage() {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[var(--background)] text-white">
      <RedirectIfAuthed />
      <div className="shrink-0">
        <SiteHeader user={null} variant="login" />
      </div>
      <LoginForm />
    </div>
  );
}
