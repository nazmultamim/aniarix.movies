import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Admin client using the SERVICE ROLE key — this bypasses RLS entirely.
 *
 * IMPORTANT: SUPABASE_SERVICE_ROLE_KEY must NOT have the NEXT_PUBLIC_ prefix.
 * Any env var prefixed NEXT_PUBLIC_ is inlined into the client-side JS bundle
 * by Next.js — shipping the service role key to the browser would let anyone
 * read/write your entire database, ignoring every RLS policy you've written.
 *
 * Only import this file from server-side code: Server Components, Route
 * Handlers, or Server Actions. Never import it from a 'use client' file.
 */
export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error(
      'createAdminClient() must never be called in the browser.'
    );
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY, // no NEXT_PUBLIC_ prefix
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
