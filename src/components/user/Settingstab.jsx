'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { deleteAccount } from '@/lib/action/Setting.Actions';

const CONFIRM_PHRASE = 'DELETE';

export default function SettingsTab() {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const canConfirm = confirmText.trim() === CONFIRM_PHRASE;

  async function handleDelete() {
    if (!canConfirm) return;
    setDeleting(true);
    setError('');

    const result = await deleteAccount();

    if (result?.error) {
      setDeleting(false);
      setError(result.error);
      return;
    }

    // Account and all related data are gone — send them somewhere that
    // doesn't assume a signed-in user.
    router.push('/');
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-white">Settings</h2>
        <p className="text-sm text-muted-foreground/50 mt-1">
          Manage your account.
        </p>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <AlertTriangle className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white">Delete account</h3>
            <p className="text-xs text-muted-foreground/60 mt-1 leading-relaxed">
              Permanently deletes your account, profile, and saved movie and TV data.
              This cannot be undone.
            </p>
          </div>
        </div>

        {!confirmOpen ? (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete my account
          </button>
        ) : (
          <div className="mt-4 flex flex-col gap-3 max-w-sm">
            <label className="text-xs text-muted-foreground/60">
              Type <span className="font-bold text-white">{CONFIRM_PHRASE}</span> to confirm.
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              disabled={deleting}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-muted-foreground/30 outline-none focus:border-red-500/50 disabled:opacity-50"
            />

            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canConfirm || deleting}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Permanently delete account'
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  setConfirmText('');
                  setError('');
                }}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground/60 hover:text-white transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
