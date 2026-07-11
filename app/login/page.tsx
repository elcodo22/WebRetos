import Link from "next/link";
import { OtpForm } from "@/components/auth/otp-form";

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="flex w-full flex-col items-center gap-6">
        <OtpForm />
        <Link
          href="/"
          className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
