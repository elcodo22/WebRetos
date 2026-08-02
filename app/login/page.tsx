import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { RedirectIfAuthed } from "@/components/auth/redirect-if-authed";

export const dynamic = "force-static";

export default function LoginPage() {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[var(--background)] text-white">
      <RedirectIfAuthed />
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
