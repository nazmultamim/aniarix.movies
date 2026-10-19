import ResetPasswordForm from '@/components/auth/Resetpasswordform';
import { createClient } from '@/lib/supabase/server';

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0a0808]">
      <div className="w-full max-w-[420px] rounded-2xl border border-white/[0.07] bg-[#110d0d]/95 p-8">
        {user && (
          <>
            <h1 className="text-2xl font-display font-black text-white tracking-tight mb-1.5">
              Set a new password
            </h1>
            <p className="text-sm text-muted-foreground/60 mb-6">
              Choose a new password for your account.
            </p>
          </>
        )}
        <ResetPasswordForm />
      </div>
    </div>
  );
}
