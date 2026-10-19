'use client';

import { useState, useCallback, useEffect } from 'react';
import {  LogOut, Pencil } from 'lucide-react';
import { updateAvatarUrl } from '@/lib/action/profile-actions';

// Decorative faint doodle pattern behind the avatar (pure CSS/SVG, no external art)
function DoodlePattern() {
    return (
        <svg
            className="absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none"
            viewBox="0 0 300 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d="M20 30 Q35 15 50 30 T80 30" stroke="currentColor" strokeWidth="2" />
            <circle cx="250" cy="40" r="6" stroke="currentColor" strokeWidth="2" />
            <path d="M240 150 L250 140 L260 150 L250 160 Z" stroke="currentColor" strokeWidth="2" />
            <path d="M30 160 L38 150 M30 150 L38 160" stroke="currentColor" strokeWidth="2" />
            <circle cx="270" cy="110" r="3" fill="currentColor" />
            <circle cx="20" cy="100" r="3" fill="currentColor" />
            <path d="M140 20 L146 32 L134 32 Z" stroke="currentColor" strokeWidth="2" />
        </svg>
    );
}

export default function DashboardSidebar({ user, profile, onLogout, onProfileUpdated, onOpenAvatarPicker }) {
    const [pickerOpen, setPickerOpen] = useState(false);

    const displayName =
        profile?.full_name ||
        profile?.name ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email?.split('@')[0] ||
        'User';

    const username = profile?.username || profile?.user_name || user?.user_metadata?.username || user?.email?.split('@')[0] || 'user';
    // prefer the server column `avatar` (RPC writes this), but fall back to
    // legacy `avatar_url` and user metadata if present
    const initialAvatar = profile?.avatar || profile?.avatar_url || user?.user_metadata?.avatar_url;
    const [localAvatar, setLocalAvatar] = useState(initialAvatar);
    const joinDate = user?.created_at
        ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : '—';

    const handleSelectAvatar = useCallback(async (imageUrl) => {
        if (!user?.id) return;
        try {
            const result = await updateAvatarUrl(imageUrl);
            if (result?.error) throw new Error(result.error);
            // update UI optimistically so no full reload is necessary
            setLocalAvatar(imageUrl);
            onProfileUpdated?.();
        } catch (err) {
            console.error('Failed to update avatar:', err.message);
        }
    }, [user?.id, onProfileUpdated]);

    // keep local avatar in sync if parent passes a new profile/user
    useEffect(() => {
        const next = profile?.avatar_url || profile?.avatar || user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
        setLocalAvatar(next);
    }, [profile, user]);

    // allow other parts of the app to broadcast a profile update without
    // threading callbacks through many components. Emit an event like:
    // `window.dispatchEvent(new CustomEvent('profile-updated', { detail: { avatar } }))`
    useEffect(() => {
        function onProfileUpdatedEvent(e) {
            const avatar = e?.detail?.avatar || e?.detail?.avatar_url;
            if (avatar) setLocalAvatar(avatar);
        }
        window.addEventListener('profile-updated', onProfileUpdatedEvent);
        return () => window.removeEventListener('profile-updated', onProfileUpdatedEvent);
    }, []);

    return (
        <>
            <aside className="w-[280px] h-fit shrink-0 rounded-2xl border border-white/[0.06] bg-[#0d0b0c]/80 backdrop-blur-xl overflow-hidden flex flex-col">
                {/* Avatar + doodle header */}
                <div className="relative flex flex-col items-center pt-8 pb-6 px-6 text-orange-400">
                    <DoodlePattern />
                    <button
                        onClick={onOpenAvatarPicker}
                        aria-label="Change avatar"
                        data-testid="button-change-avatar"
                        className="group relative w-28 h-28 rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_30px_rgba(249,115,22,0.15)] transition-transform hover:scale-[1.03]"
                    >
                        {localAvatar ? (
                            <img src={localAvatar} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-orange-500/30 to-red-600/30 flex items-center justify-center text-3xl font-black text-white">
                                {displayName[0]?.toUpperCase()}
                            </div>
                        )}
                        <span className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                            <Pencil className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                    </button>
                    <h2 className="relative z-10 mt-4 text-lg font-display font-black tracking-wide bg-gradient-to-r from-fuchsia-400 to-orange-400 bg-clip-text text-transparent">
                        {displayName}
                    </h2>
                </div>

                {/* Stats */}
                <div className="px-6 py-5 border-t border-white/[0.06] flex flex-col gap-3 text-sm">
                    <Row label="Username" value={username} />
                    <Row label="Join date" value={joinDate} />
                </div>


                {/* Actions */}
                <div className="mt-auto px-6 py-5 border-t border-white/[0.06] flex items-center justify-between">
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-2 text-sm font-semibold text-muted-foreground/80 hover:text-red-400 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Log out
                    </button>
                </div>
            </aside>
        </>
    );
}

function Row({ label, value }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground/50">{label}</span>
            <span className="font-semibold text-white/90 text-right">{value}</span>
        </div>
    );
}
