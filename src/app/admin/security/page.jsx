import { ExternalLink, Info, ShieldCheck } from 'lucide-react';

export default function AdminSecurityPage() {
  return <div className="max-w-3xl space-y-5">
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" /><div><h2 className="font-semibold text-foreground">Application access controls</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Admin pages and server actions verify the signed-in user’s database-backed profile role. Privileged cross-user reads run only on the server after this check. User-owned media data remains scoped to the authenticated user by Supabase RLS.</p></div></div>
    </div>
    <div role="status" className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground"><Info className="mt-0.5 h-4 w-4 shrink-0" /><p>No live Supabase security-advisor integration is available in this application, so this page does not report finding counts or certify the current database security state.</p></div>
    <a href="https://supabase.com/docs/guides/database/database-linter" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">Supabase database linter documentation <ExternalLink className="h-3 w-3" /></a>
  </div>;
}
