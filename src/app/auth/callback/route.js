import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Handles the redirect Supabase sends users to after they click a
// password-reset (or email-confirmation) link. Exchanges the `code`
// query param for a session, then forwards them to `next`.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Link was missing, expired, or already used
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}