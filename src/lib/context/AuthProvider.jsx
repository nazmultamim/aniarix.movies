'use client';

import { createContext, useContext, useEffect, useRef, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
});

function normalizeRpcRow(data) {
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  // Tracks which user id we last fetched a profile for, so TOKEN_REFRESHED
  // and duplicate SIGNED_IN events (e.g. firing right after the initial
  // getUser() call) don't trigger a second unnecessary DB hit.
  const loadedProfileFor = useRef(null);

  const fetchProfile = async (userId) => {
    // `role` and `full_name` are intentionally not selectable through the
    // regular API. This security-definer RPC only returns auth.uid()'s row.
    const { data, error } = await supabase.rpc('get_my_profile');

    if (error) {
      console.error('Failed to load profile:', error.message);
      return null;
    }

    const ownProfile = normalizeRpcRow(data);
    if (ownProfile?.id !== userId) return null;
    loadedProfileFor.current = userId;
    return ownProfile;
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const {
        data: { user: initialUser },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (initialUser) {
        setUser(initialUser);
        const profileData = await fetchProfile(initialUser.id);
        if (mounted) setProfile(profileData);
      }

      if (mounted) setLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        loadedProfileFor.current = null;
        return;
      }

      if (event === 'TOKEN_REFRESHED') {
        // Token refresh doesn't change profile data — just sync the user,
        // no DB hit needed.
        setUser(session?.user ?? null);
        return;
      }

      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);

        // Skip re-fetching if we already loaded this user's profile
        // (e.g. init() already handled it on first load).
        if (loadedProfileFor.current === session.user.id) return;

        const profileData = await fetchProfile(session.user.id);
        if (mounted) setProfile(profileData);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (!user) return;
    const profileData = await fetchProfile(user.id);
    setProfile(profileData);
  };

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Failed to sign out:', error.message);
      return;
    }

    setUser(null);
    setProfile(null);
    loadedProfileFor.current = null;
  }

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, isAdmin, refreshProfile, refreshAuth: refreshProfile, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
