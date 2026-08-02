import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Callback tras confirmar email / recovery.
 * Escribe la sesión en las cookies del redirect (necesario para PKCE).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const authError = searchParams.get("error");
  const authErrorDesc = searchParams.get("error_description");

  let next = searchParams.get("next") ?? "/";
  if (!next.startsWith("/")) next = "/";

  const fail = (detail: string) =>
    NextResponse.redirect(
      `${origin}/login?error=auth&detail=${encodeURIComponent(detail)}`,
    );

  if (authError) {
    return fail(authErrorDesc || authError);
  }

  let response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.redirect(`${origin}${next}`);
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail(error.message);
    return response;
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (error) return fail(error.message);
    return response;
  }

  return fail(
    "Falta el código de verificación. Abre el enlace en el mismo navegador donde te registraste, con la app en marcha.",
  );
}
