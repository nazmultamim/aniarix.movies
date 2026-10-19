'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordForm() {
  const supabase = createClient();
  const router = useRouter();

  // Whether this browser actually has a valid recovery session.
  // 'checking' | 'valid' | 'invalid'
  const [sessionState, setSessionState] = useState('checking');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let mounted = true;

    // The callback route already exchanged the reset-link code for a
    // session (stored in cookies). Confirm it's actually there before
    // letting the user submit a new password.
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!mounted) return;
      setSessionState(user ? 'valid' : 'invalid');
    });

    return () => {
      mounted = false;
    };
  }, [supabase]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message || 'Could not update your password.');
        return;
      }
      setDone(true);
      setTimeout(() => router.push('/home'), 2000);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (sessionState === 'checking') {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-5 h-5 text-white animate-spin" />
      </div>
    );
  }

  if (sessionState === 'invalid') {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <AlertCircle className="w-6 h-6 text-red-400" />
        <p className="text-sm text-muted-foreground/70">
          This reset link is invalid or has expired. Request a new one from the login screen.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
        <p className="text-sm text-muted-foreground/70">
          Password updated. Redirecting you now…
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="text-sm font-medium text-muted-foreground/60 mb-1.5 block">
          New password
        </label>
        <div className="relative flex items-center rounded-xl border border-white/[0.08] bg-white/[0.03] focus-within:border-orange-500/60 focus-within:bg-white/[0.05] transition-all">
          <Lock className="absolute left-4 w-4 h-4 text-muted-foreground/40" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="New password"
            className="w-full bg-transparent pl-11 pr-11 py-3.5 text-sm text-white placeholder:text-muted-foreground/30 outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword(p => !p)}
            className="absolute right-3 p-1.5 rounded-lg text-muted-foreground/40 hover:text-muted-foreground/80 hover:bg-white/5 transition-all"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-muted-foreground/60 mb-1.5 block">
          Confirm password
        </label>
        <div className="relative flex items-center rounded-xl border border-white/[0.08] bg-white/[0.03] focus-within:border-orange-500/60 focus-within:bg-white/[0.05] transition-all">
          <Lock className="absolute left-4 w-4 h-4 text-muted-foreground/40" />
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="w-full bg-transparent pl-11 pr-11 py-3.5 text-sm text-white placeholder:text-muted-foreground/30 outline-none"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(p => !p)}
            className="absolute right-3 p-1.5 rounded-lg text-muted-foreground/40 hover:text-muted-foreground/80 hover:bg-white/5 transition-all"
          >
            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="relative w-full mt-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-sm text-white overflow-hidden transition-all duration-200 disabled:cursor-not-allowed"
      >
        <div className={`absolute inset-0 rounded-xl transition-opacity duration-200 ${submitting ? 'opacity-60' : 'opacity-100'} bg-gradient-to-r from-orange-500 to-red-600`} />
        <span className="relative z-10 flex items-center gap-2.5">
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Update password
        </span>
      </button>
    </form>
  );
}