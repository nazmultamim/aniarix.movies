import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Scheduled by vercel.json to run Sundays and Wednesdays.
 *
 * Behavior:
 *  - Reads the "auto_keepalive" row from app_settings (one lightweight read).
 *  - If enabled=false: stops immediately. No further request is made
 *    against your database.
 *  - If enabled=true: runs one more read-only query (SELECT ... LIMIT 1
 *    on profiles) purely to register activity with Supabase, and returns.
 *
 * Nothing here ever inserts, updates, or deletes a row.
 *
 * Uses the service role key because this runs server-side with no
 * logged-in user, so it bypasses the admin-only RLS on app_settings —
 * keep SUPABASE_SERVICE_ROLE_KEY out of any client bundle.
 */
export async function GET(request) {
  // Verify this is actually Vercel Cron calling in, not a public hit.
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: setting, error: settingError } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "auto_keepalive")
    .maybeSingle();

  if (settingError) {
    return NextResponse.json({ error: settingError.message }, { status: 500 });
  }

  const enabled = setting?.value?.enabled === true;

  if (!enabled) {
    return NextResponse.json({ ran: false, reason: "auto_keepalive is disabled" });
  }

  // The actual keep-alive touch: a plain read, nothing written.
  const { error: pingError } = await supabase.from("profiles").select("id").limit(1);

  if (pingError) {
    return NextResponse.json({ ran: false, error: pingError.message }, { status: 500 });
  }

  return NextResponse.json({ ran: true, at: new Date().toISOString() });
}