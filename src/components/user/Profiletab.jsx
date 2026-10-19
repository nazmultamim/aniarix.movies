'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShieldAlert, ShieldCheck, Info, KeyRound, Loader2, CheckCircle2, AlertCircle,
  Pencil, Lock,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { updateProfileName, updateAvatarUrl, changePassword } from '@/lib/action/profile-actions';
import AvatarPickerModal from '@/components/user/Avatarpickermodal';
import ProfileMediaActivity from '@/components/user/ProfileMediaActivity';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

// ── Plain labeled field (label above, box below) ─────────────────
function Field({ label, value, onChange, type = 'text', placeholder, disabled, hint, locked }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-2 md:gap-6 items-start py-4 border-b border-white/[0.05] last:border-b-0">
      <label className="text-sm font-medium text-muted-foreground/60 pt-3">{label}</label>
      <div>
        <div className="relative">
          <input
            type={type}
            value={value}
            placeholder={placeholder}
            disabled={disabled || locked}
            onChange={e => onChange?.(e.target.value)}
            className={`w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-muted-foreground/30 outline-none transition-all ${
              locked
                ? 'opacity-50 cursor-not-allowed pr-10'
                : 'focus:border-orange-500/60 focus:bg-white/[0.05] focus:shadow-[0_0_0_3px_rgba(249,115,22,0.10)]'
            }`}
          />
          {locked && (
            <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/30" />
          )}
        </div>
        {hint && <p className="text-xs text-muted-foreground/40 mt-1.5">{hint}</p>}
      </div>
    </div>
  );
}

// ── Cloudflare Turnstile (with localhost bypass) ─────────────────
function TurnstileWidget({ onVerify, onExpire }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [scriptReady, setScriptReady] = useState(typeof window !== 'undefined' && !!window.turnstile);

  const isLocalhost = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  useEffect(() => {
    if (isLocalhost) {
      onVerify?.('localhost-bypass');
      return;
    }
    if (scriptReady) return;

    const existing = document.querySelector('script[src^="https://challenges.cloudflare.com/turnstile"]');
    if (existing) {
      existing.addEventListener('load', () => setScriptReady(true));
      if (window.turnstile) setScriptReady(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptReady(true);
    document.head.appendChild(script);
  }, [scriptReady, isLocalhost, onVerify]);

  useEffect(() => {
    if (isLocalhost || !scriptReady || !containerRef.current || !window.turnstile) return;
    if (widgetIdRef.current !== null) return;
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: 'dark',
      callback: (token) => onVerify?.(token),
      'expired-callback': () => onExpire?.(),
      'error-callback': () => onExpire?.(),
    });
    return () => {
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [scriptReady, isLocalhost, onVerify, onExpire]);

  if (isLocalhost) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-xs text-muted-foreground/50 text-center">
        Captcha bypassed (localhost)
      </div>
    );
  }

  if (!TURNSTILE_SITE_KEY) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-xs text-muted-foreground/50 text-center">
        Set NEXT_PUBLIC_TURNSTILE_SITE_KEY to enable human verification.
      </div>
    );
  }

  return <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-1 flex justify-center min-h-[66px] items-center" ref={containerRef} />;
}

export default function ProfileTab({ user, profile, onProfileUpdated }) {
  const supabase = createClient();
  const emailVerified = !!(profile?.email_verified ?? user?.email_confirmed_at);

  // Identity header state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [localAvatar, setLocalAvatar] = useState(
    profile?.avatar_url || profile?.avatar || user?.user_metadata?.avatar_url || user?.user_metadata?.picture
  );

  // Verification flow state
  const [showVerifyFlow, setShowVerifyFlow] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState(null);

  // Editable profile fields
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [username, setUsername] = useState(profile?.username || user?.user_metadata?.username || '');
  const [updating, setUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState(null);

  // Change password
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);

  // Avatar saving
  const [avatarSaving, setAvatarSaving] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name || '');
    setUsername(profile?.username || user?.user_metadata?.username || '');
    setEmail(user?.email || '');
    setLocalAvatar(profile?.avatar_url || profile?.avatar || user?.user_metadata?.avatar_url || user?.user_metadata?.picture);
  }, [profile, user]);

  const headerName =
    profile?.full_name ||
    profile?.name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'User';
  const headerUsername = profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'user';

  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—';

  // Avatar selection — calls server action to update avatar_url
  const handleSelectAvatar = useCallback(async (imageUrl) => {
    setAvatarSaving(true);
    try {
      const result = await updateAvatarUrl(imageUrl);
      if (result.error) {
        console.error('Failed to update avatar:', result.error);
        return;
      }
      setLocalAvatar(imageUrl);
      window.dispatchEvent(
        new CustomEvent('profile-updated', {
          detail: { avatar_url: imageUrl, avatar: imageUrl },
        }),
      );
      onProfileUpdated?.();
    } catch (err) {
      console.error('Failed to update avatar:', err.message);
    } finally {
      setAvatarSaving(false);
    }
  }, [onProfileUpdated]);

  // Email verification code request
  const handleRequestCode = useCallback(async () => {
    if (!turnstileToken) {
      setVerifyMessage({ type: 'error', text: 'Please complete the verification challenge first.' });
      return;
    }
    setSendingCode(true);
    setVerifyMessage(null);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user?.email,
        options: { captchaToken: turnstileToken },
      });
      if (error) {
        setVerifyMessage({ type: 'error', text: error.message || 'Could not send the code. Try again.' });
      } else {
        setCodeSent(true);
        setVerifyMessage({ type: 'success', text: 'Verification code sent — check your inbox.' });
      }
    } catch {
      setVerifyMessage({ type: 'error', text: 'Something went wrong sending the code.' });
    } finally {
      setSendingCode(false);
    }
  }, [turnstileToken, user?.email, supabase]);

  // Email verification code submit
  const handleVerifyCode = useCallback(async (e) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      setVerifyMessage({ type: 'error', text: 'Enter the 6 digit code from your email.' });
      return;
    }
    setVerifyingCode(true);
    setVerifyMessage(null);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: user?.email,
        token: code.trim(),
        type: 'email',
      });
      if (error) {
        setVerifyMessage({ type: 'error', text: error.message || 'Invalid or expired code.' });
      } else {
        setVerifyMessage({ type: 'success', text: 'Email verified! Refreshing your account…' });
        onProfileUpdated?.();
        setShowVerifyFlow(false);
      }
    } catch {
      setVerifyMessage({ type: 'error', text: 'Something went wrong verifying the code.' });
    } finally {
      setVerifyingCode(false);
    }
  }, [code, user?.email, onProfileUpdated, supabase]);

  // Profile update — only full_name is editable (email & username locked)
  async function handleUpdateProfile(e) {
    e.preventDefault();
    setUpdating(true);
    setUpdateMessage(null);
    try {
      const result = await updateProfileName(fullName);
      if (result.error) {
        setUpdateMessage({ type: 'error', text: result.error });
        return;
      }
      setUpdateMessage({ type: 'success', text: 'Profile updated successfully.' });
      onProfileUpdated?.();
    } catch (err) {
      setUpdateMessage({ type: 'error', text: err.message || 'Something went wrong updating your profile.' });
    } finally {
      setUpdating(false);
    }
  }

  // Password change — calls server action
  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordMessage(null);
    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    setChangingPassword(true);
    try {
      const result = await changePassword(newPassword);
      if (result.error) {
        setPasswordMessage({ type: 'error', text: result.error });
      } else {
        setPasswordMessage({ type: 'success', text: 'Password changed successfully.' });
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setPasswordMessage({ type: 'error', text: 'Something went wrong changing your password.' });
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <div className="px-6 sm:px-8 py-7">
      {/* Identity header */}
      <div className="flex items-center gap-5 pb-6 mb-6 border-b border-white/[0.06]">
        <button
          onClick={() => setPickerOpen(true)}
          aria-label="Change avatar"
          disabled={avatarSaving}
          className="group relative w-20 h-20 rounded-full overflow-hidden border border-white/10 shrink-0 shadow-[0_0_30px_rgba(249,115,22,0.15)] transition-transform hover:scale-[1.03] disabled:opacity-60"
        >
          {localAvatar ? (
            <img src={localAvatar} alt={headerName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-500/30 to-red-600/30 flex items-center justify-center text-2xl font-black text-white">
              {headerName[0]?.toUpperCase()}
            </div>
          )}
          <span className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            {avatarSaving ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Pencil className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </span>
        </button>

        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-display font-black bg-gradient-to-r from-orange-400 via-orange-500 to-red-500 bg-clip-text text-transparent tracking-wide truncate">
            {headerName}
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1 text-sm text-muted-foreground/60">
            <span>@{headerUsername}</span>
            <span className="hidden sm:block w-1 h-1 rounded-full bg-white/20" />
            <span>Joined {joinDate}</span>
          </div>
        </div>
      </div>

      {/* Verification banner */}
      {emailVerified ? (
        <div className="flex items-center gap-2.5 mb-6 text-emerald-400 font-semibold text-sm">
          <ShieldCheck className="w-4 h-4" />
          Verified
        </div>
      ) : (
        <div className="mb-6">
          <div className="flex items-center gap-2.5 text-red-400 font-semibold text-sm mb-2">
            <ShieldAlert className="w-4 h-4" />
            Not Verified
          </div>
          <p className="text-sm text-muted-foreground/70 flex flex-wrap items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            Account not verified!
            <button
              onClick={() => setShowVerifyFlow(v => !v)}
              className="px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.1] text-red-400 font-semibold text-xs transition-colors"
            >
              Click here
            </button>
            to email a verification code. (If not received, you can resend below.)
          </p>
          <p className="text-sm text-sky-400/90 flex items-center gap-2 mt-2">
            <Info className="w-4 h-4 shrink-0" />
            Must be verified to make W2G Rooms and add comments.
          </p>
        </div>
      )}

      {/* Verification flow */}
      {!emailVerified && showVerifyFlow && (
        <div className="mb-6">
          <label className="text-sm font-medium text-muted-foreground/60 block mb-2">Verification Code</label>
          <div className="flex flex-col gap-3 max-w-md">
            <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken('')} />
            <form onSubmit={handleVerifyCode} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="6 digit verify code"
                className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm tracking-[0.3em] text-white placeholder:text-muted-foreground/30 placeholder:tracking-normal outline-none focus:border-orange-500/60 focus:bg-white/[0.05] transition-all"
              />
              <button
                type="submit"
                disabled={verifyingCode || code.length !== 6}
                className="shrink-0 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] transition-all"
              >
                {verifyingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Verify
              </button>
            </form>
            <button
              type="button"
              onClick={handleRequestCode}
              disabled={sendingCode || !turnstileToken}
              className="self-start text-xs font-semibold text-orange-400 hover:text-orange-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              {sendingCode && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {codeSent ? 'Resend code' : 'Send verification code'}
            </button>
            {verifyMessage && (
              <p className={`text-xs flex items-center gap-1.5 ${verifyMessage.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
                {verifyMessage.type === 'error' ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {verifyMessage.text}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Profile fields */}
      <form onSubmit={handleUpdateProfile}>
        <div className="rounded-2xl border border-white/[0.05] bg-white/[0.015] px-5">
          <Field label="Full Name" value={fullName} onChange={setFullName} placeholder="Your full name" />

          {/* Email — LOCKED */}
          <Field
            label="Email address"
            value={email}
            onChange={() => {}}
            type="email"
            placeholder="you@example.com"
            locked
            hint="Email cannot be changed."
          />

          {/* Username — LOCKED */}
          <Field
            label="Username"
            value={username}
            onChange={() => {}}
            placeholder="username"
            locked
            hint="Username is auto-generated and cannot be changed."
          />

          {/* Change password section */}
          <div className="py-4">
            <button
              type="button"
              onClick={() => setShowChangePassword(v => !v)}
              className="flex items-center gap-2 text-sm font-semibold text-muted-foreground/60 hover:text-orange-400 transition-colors"
            >
              <KeyRound className="w-4 h-4" />
              Change password
            </button>

            {showChangePassword && (
              <div className="mt-4 flex flex-col gap-3 max-w-md">
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-muted-foreground/30 outline-none focus:border-orange-500/60 focus:bg-white/[0.05] transition-all"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-muted-foreground/30 outline-none focus:border-orange-500/60 focus:bg-white/[0.05] transition-all"
                />
                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  className="self-start flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-sm font-semibold disabled:opacity-50 transition-colors"
                >
                  {changingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Update password
                </button>
                {passwordMessage && (
                  <p className={`text-xs flex items-center gap-1.5 ${passwordMessage.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
                    {passwordMessage.type === 'error' ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    {passwordMessage.text}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {updateMessage && (
          <p className={`text-sm mt-4 flex items-center gap-2 ${updateMessage.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
            {updateMessage.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            {updateMessage.text}
          </p>
        )}

        <div className="flex justify-center mt-8">
          <button
            type="submit"
            disabled={updating}
            className="relative flex items-center justify-center gap-2.5 px-10 py-3.5 rounded-xl font-bold text-sm text-white overflow-hidden transition-all duration-200 disabled:cursor-not-allowed group"
          >
            <div className={`absolute inset-0 rounded-xl transition-opacity duration-200 ${updating ? 'opacity-60' : 'opacity-100'} bg-gradient-to-r from-orange-500 to-red-600`} />
            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[linear-gradient(105deg,transparent_30%,rgba(255,255,255,0.12)_50%,transparent_70%)] bg-[length:200%_100%] group-hover:animate-[shimmer_0.6s_ease_forwards]" />
            <span className="relative z-10 flex items-center gap-2">
              {updating && <Loader2 className="w-4 h-4 animate-spin" />}
              Save
            </span>
          </button>
        </div>
      </form>

      <ProfileMediaActivity />

      <AvatarPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        currentAvatarUrl={localAvatar}
        onSelect={handleSelectAvatar}
      />
    </div>
  );
}
