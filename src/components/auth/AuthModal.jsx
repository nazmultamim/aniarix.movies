'use client';

import { createPortal } from 'react-dom';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Eye, EyeOff, Lock, Mail, User as UserIcon,
  AlertCircle, X, ShieldCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
const IS_DEV_TURNSTILE_KEY = TURNSTILE_SITE_KEY === '1x00000000000000000000AA';
const SHOULD_USE_TURNSTILE = Boolean(TURNSTILE_SITE_KEY) && !IS_DEV_TURNSTILE_KEY;

// ── Plain icon + placeholder input (no floating label, matches ref) ─
function InputField({ id, type, placeholder, value, onChange, icon: Icon, rightSlot, error }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`relative flex items-center rounded-xl border transition-all duration-200 ${
        error
          ? 'border-red-500/60 bg-red-500/5'
          : focused
          ? 'border-orange-500/60 bg-white/[0.05] shadow-[0_0_0_3px_rgba(249,115,22,0.10)]'
          : 'border-white/[0.08] bg-white/[0.03] hover:border-white/[0.14]'
      }`}>
        <Icon className={`absolute left-4 w-4 h-4 transition-colors ${focused ? 'text-orange-400' : 'text-muted-foreground/40'}`} />
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full bg-transparent pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-muted-foreground/30 outline-none"
          autoComplete={id === 'email' ? 'email' : id === 'name' ? 'name' : 'current-password'}
        />
        {rightSlot && <div className="absolute right-3">{rightSlot}</div>}
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-400 mt-0.5">
          <AlertCircle className="w-3 h-3 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

// ── Cloudflare Turnstile widget ─────
function TurnstileWidget({ turnstileRef, onVerify, onExpire, error }) {
  const showWidget = SHOULD_USE_TURNSTILE;
  const [TurnstileComponent, setTurnstileComponent] = useState(null);

  useEffect(() => {
    if (!showWidget) {
      setTurnstileComponent(null);
      return undefined;
    }

    let cancelled = false;

    import('@marsidev/react-turnstile')
      .then((mod) => {
        if (!cancelled) {
          setTurnstileComponent(() => mod.Turnstile);
        }
      })
      .catch((err) => {
        console.warn('[Turnstile] failed to load widget:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [showWidget]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className={`border p-1 flex justify-center min-h-[55px] items-center transition-colors rounded-xl ${
        error ? 'border-red-500/60 bg-red-500/5' : 'border-none'
      }`}>
        {!showWidget ? (
          <p className="text-xs text-muted-foreground/50 py-4 text-center px-3">
            {TURNSTILE_SITE_KEY
              ? 'Turnstile is disabled in local development'
              : 'Verify you are human'}
          </p>
        ) : TurnstileComponent ? (
          <TurnstileComponent
            ref={turnstileRef}
            siteKey={TURNSTILE_SITE_KEY}
            options={{ theme: 'dark' }}
            onSuccess={(token) => onVerify(token)}
            onExpire={() => onExpire()}
            onError={() => onExpire()}
          />
        ) : (
          <p className="text-xs text-muted-foreground/50 py-4 text-center px-3">
            Loading verification...
          </p>
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-400 mt-0.5">
          <AlertCircle className="w-3 h-3 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

// ── Main Auth Modal ──────────────────────────────────────────────
export default function AuthModal({ isOpen, onClose, initialMode = 'signin' }) {
  const supabase = useMemo(() => createClient(), []);

  const [mode, setMode] = useState(initialMode); // 'signin' | 'signup' | 'forgot'
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef(null);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');


  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setName(''); setEmail(''); setPassword(''); setConfirmPassword('');
      setRememberMe(false);
      setTurnstileToken('');
      setErrors({});
      setSuccessMessage('');
      setIsLoading(false);
      setForgotEmail('');
      setForgotLoading(false);
      setForgotSent(false);
      const t = setTimeout(() => setVisible(true), 20);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const { style: htmlStyle } = document.documentElement;
    const { style: bodyStyle } = document.body;
    const prevHtmlOverflow = htmlStyle.overflow;
    const prevBodyOverflow = bodyStyle.overflow;
    htmlStyle.overflow = 'hidden';
    bodyStyle.overflow = 'hidden';
    return () => {
      htmlStyle.overflow = prevHtmlOverflow;
      bodyStyle.overflow = prevBodyOverflow;
    };
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(() => onClose?.(), 200);
  }, [onClose]);

  const switchMode = (next) => {
    setMode(next);
    setErrors({});
    setSuccessMessage('');
    setTurnstileToken('');
    setForgotSent(false);
    turnstileRef.current?.reset();
  };

  function validate() {
    const e = {};
    if (mode === 'signup' && !name.trim()) e.name = 'Full name is required';
    if (!email) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';
    if (mode === 'signup') {
      if (!confirmPassword) e.confirmPassword = 'Please confirm your password';
      else if (confirmPassword !== password) e.confirmPassword = 'Passwords do not match';
    }
    if (SHOULD_USE_TURNSTILE && !turnstileToken) {
      e.turnstile = 'Please complete the verification challenge';
    }
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      if (mode === 'signin') {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
          ...(SHOULD_USE_TURNSTILE ? { options: { captchaToken: turnstileToken } } : {}),
        });

        if (signInError) {
          setErrors({ form: 'Invalid email or password.' });
          setTurnstileToken('');
          turnstileRef.current?.reset();
          return;
        }

        // Role check — admin goes to dashboard, everyone else reloads
        const { data: profileResult } = await supabase.rpc('get_my_profile');
        const profile = Array.isArray(profileResult) ? profileResult[0] : profileResult;

        handleClose();

        if (profile?.role === 'admin') {
          window.location.assign('/admin/dash');
        } else {
          window.location.reload();
        }
      } else {
        // Signup — only pass full_name; the DB trigger auto-generates username
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            ...(SHOULD_USE_TURNSTILE ? { captchaToken: turnstileToken } : {}),
          },
        });

        if (signUpError) {
          setErrors({ form: signUpError.message || 'Unable to create account. Please try again.' });
          setTurnstileToken('');
          turnstileRef.current?.reset();
          return;
        }

        if (data.session) {
          // Email confirmation is off — user is signed in immediately
          handleClose();
          window.location.reload();
        } else {
          setSuccessMessage('Account created! Check your inbox to confirm your email.');
        }
      }
    } catch (err) {
      setErrors({ form: 'Something went wrong. Please try again.' });
      setTurnstileToken('');
      turnstileRef.current?.reset();
    } finally {
      setIsLoading(false);
    }
  }

  // Forgot password — sends a reset link via Supabase
  async function handleForgotPassword(e) {
    e.preventDefault();
    if (!forgotEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      setErrors({ forgotEmail: 'Enter a valid email address' });
      return;
    }
    setErrors({});
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
      });
      // Always show the same success state regardless of whether the email
      // exists — avoids leaking which addresses have accounts. Only a
      // genuine send failure (rate limit, bad config) surfaces as an error.
      if (error && error.status !== 400) {
        setErrors({ form: error.message || 'Could not send reset email. Please try again.' });
      } else {
        setForgotSent(true);
      }
    } catch {
      setErrors({ form: 'Something went wrong. Please try again.' });
    } finally {
      setForgotLoading(false);
    }
  }

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        onClick={handleClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-xl"
      />

      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center overflow-y-auto px-4 py-4 sm:items-center sm:py-8">
        <div
          className={`relative w-full max-w-[460px] max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-2xl bg-[#110d0d]/95 border border-white/[0.07] shadow-[0_32px_80px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.03)] [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none] transition-all duration-300 ease-out ${
            visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-[0.98]'
          }`}
        >
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-orange-500/20 via-transparent to-transparent opacity-60 blur-sm pointer-events-none" />

          <div className="relative rounded-2xl bg-[#110d0d]/95">
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-80" />

            <button
              onClick={handleClose}
              aria-label="Close"
              className="absolute top-5 right-5 z-20 w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 text-muted-foreground hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-7 sm:px-9 pt-9 pb-8">
              {mode === 'forgot' ? (
                <>
                  <div className="mb-7">
                    <h1 id="auth-modal-title" className="text-3xl font-display font-black text-white tracking-tight">
                      Reset password
                    </h1>
                    <p className="text-sm text-muted-foreground/60 mt-1.5">
                      {forgotSent
                        ? "We've sent a reset link if that email has an account."
                        : "Enter your email and we'll send you a reset link."}
                    </p>
                  </div>

                  {errors.form && (
                    <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {errors.form}
                    </div>
                  )}

                  {forgotSent ? (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm">
                        <ShieldCheck className="w-4 h-4 shrink-0" />
                        Check your inbox for the reset link.
                      </div>
                      <button
                        type="button"
                        onClick={() => switchMode('signin')}
                        className="text-sm font-semibold text-orange-400 hover:text-orange-300 transition-colors self-center"
                      >
                        Back to login
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotPassword} noValidate className="flex flex-col gap-4">
                      <InputField
                        id="forgot-email"
                        type="email"
                        placeholder="Email"
                        value={forgotEmail}
                        onChange={v => { setForgotEmail(v); setErrors(p => ({ ...p, forgotEmail: undefined, form: undefined })); }}
                        icon={Mail}
                        error={errors.forgotEmail}
                      />

                      <button
                        type="submit"
                        disabled={forgotLoading}
                        className="relative w-full mt-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-sm text-white overflow-hidden transition-all duration-200 disabled:cursor-not-allowed group"
                      >
                        <div className={`absolute inset-0 rounded-xl transition-opacity duration-200 ${forgotLoading ? 'opacity-60' : 'opacity-100'} bg-gradient-to-r from-orange-500 to-red-600`} />
                        <span className="relative z-10 flex items-center gap-2.5">
                          {forgotLoading ? (
                            <>
                              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Sending…
                            </>
                          ) : (
                            'Send reset link'
                          )}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => switchMode('signin')}
                        className="text-sm font-semibold text-muted-foreground/60 hover:text-orange-400 transition-colors self-center"
                      >
                        Back to login
                      </button>
                    </form>
                  )}
                </>
              ) : (
                <>
                  <div className="mb-7">
                    <h1 id="auth-modal-title" className="text-3xl font-display font-black text-white tracking-tight">
                      {mode === 'signin' ? 'Login' : 'Register'}
                    </h1>
                    <p className="text-sm text-muted-foreground/60 mt-1.5">
                      {mode === 'signin'
                        ? 'Welcome back!'
                        : 'Create an account to use full range of functions..'}
                    </p>
                  </div>

                  {errors.form && (
                    <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {errors.form}
                    </div>
                  )}

                  {successMessage && (
                    <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      {successMessage}
                    </div>
                  )}

                  {!successMessage && (
                    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                      {mode === 'signup' && (
                        <InputField
                          id="name"
                          type="text"
                          placeholder="Full name"
                          value={name}
                          onChange={v => { setName(v); setErrors(p => ({ ...p, name: undefined, form: undefined })); }}
                          icon={UserIcon}
                          error={errors.name}
                        />
                      )}

                      <InputField
                        id="email"
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={v => { setEmail(v); setErrors(p => ({ ...p, email: undefined, form: undefined })); }}
                        icon={Mail}
                        error={errors.email}
                      />

                      <InputField
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        value={password}
                        onChange={v => { setPassword(v); setErrors(p => ({ ...p, password: undefined, form: undefined })); }}
                        icon={Lock}
                        error={errors.password}
                        rightSlot={
                          <button
                            type="button"
                            onClick={() => setShowPassword(p => !p)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-muted-foreground/80 hover:bg-white/5 transition-all"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        }
                      />

                      {mode === 'signup' && (
                        <InputField
                          id="confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Password confirmation"
                          value={confirmPassword}
                          onChange={v => { setConfirmPassword(v); setErrors(p => ({ ...p, confirmPassword: undefined, form: undefined })); }}
                          icon={Lock}
                          error={errors.confirmPassword}
                          rightSlot={
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(p => !p)}
                              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                              className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-muted-foreground/80 hover:bg-white/5 transition-all"
                            >
                              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          }
                        />
                      )}

                      {mode === 'signin' && (
                        <div className="flex items-center justify-between -mt-1">

                          {/* Forgot password button and remember me checkbox */}
                          <button
                            type="button"
                            onClick={() => switchMode('forgot')}
                            className="text-xs text-muted-foreground/50 hover:text-orange-400 transition-colors font-medium"
                          >
                            Forgot password
                          </button>
                          <label className="flex items-center gap-2 text-xs text-muted-foreground/60 select-none cursor-pointer">
                            <input
                              type="checkbox"
                              checked={rememberMe}
                              onChange={e => setRememberMe(e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 accent-orange-500 cursor-pointer"
                            />
                            Remember me
                          </label>
                        </div>
                      )}

                      <TurnstileWidget
                        turnstileRef={turnstileRef}
                        error={errors.turnstile}
                        onVerify={(token) => { setTurnstileToken(token); setErrors(p => ({ ...p, turnstile: undefined })); }}
                        onExpire={() => setTurnstileToken('')}
                      />

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="relative w-full mt-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-sm text-white overflow-hidden transition-all duration-200 disabled:cursor-not-allowed group"
                      >
                        <div className={`absolute inset-0 rounded-xl transition-opacity duration-200 ${isLoading ? 'opacity-60' : 'opacity-100'} bg-gradient-to-r from-orange-500 to-red-600`} />
                        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[linear-gradient(105deg,transparent_30%,rgba(255,255,255,0.12)_50%,transparent_70%)] bg-[length:200%_100%] group-hover:animate-[shimmer_0.6s_ease_forwards]" />
                        <div className={`absolute inset-0 rounded-xl transition-all duration-300 ${isLoading ? '' : 'group-hover:shadow-[0_0_28px_rgba(249,115,22,0.55)]'}`} />

                        <span className="relative z-10 flex items-center gap-2.5">
                          {isLoading ? (
                            <>
                              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              {mode === 'signin' ? 'Logging in…' : 'Registering…'}
                            </>
                          ) : (
                            mode === 'signin' ? 'Login' : 'Register'
                          )}
                        </span>
                      </button>
                    </form>
                  )}

                  <p className="text-center text-sm text-muted-foreground/60 mt-6">
                    {mode === 'signin' ? (
                      <>Don&apos;t have an account?{' '}
                        <button onClick={() => switchMode('signup')} className="font-semibold text-orange-400 hover:text-orange-300 transition-colors">
                          Register
                        </button>
                      </>
                    ) : (
                      <>Already have an account?{' '}
                        <button onClick={() => switchMode('signin')} className="font-semibold text-orange-400 hover:text-orange-300 transition-colors">
                          Sign in
                        </button>
                      </>
                    )}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
