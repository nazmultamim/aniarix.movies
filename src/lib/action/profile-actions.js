'use server';

import { createClient } from '@/lib/supabase/server';

function normalizeProfile(data) {
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

async function getOwnProfile(supabase, userId) {
  const { data, error } = await supabase.rpc('get_my_profile');
  const profile = normalizeProfile(data);
  if (error || profile?.id !== userId) return { profile: null, error: error?.message || 'Unable to read your profile.' };
  return { profile, error: null };
}

// Shared: every action here needs an authenticated user first.
async function getAuthedUser(supabase) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, error: 'Not authenticated.' };
  }
  return { user, error: null };
}

/**
 * Updates the authenticated user's full_name in the profiles table.
 * Username and email are intentionally NOT editable here.
 */
export async function updateProfileName(fullName) {
  const trimmed = fullName?.trim();
  if (!trimmed) {
    return { error: 'Name cannot be empty.' };
  }
  if (trimmed.length > 100) {
    return { error: 'Name is too long.' };
  }

  const supabase = await createClient();
  const { user, error: authError } = await getAuthedUser(supabase);
  if (authError) return { error: authError };

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: trimmed,
    })
    .eq('id', user.id)
    .select('id');

  if (error) {
    return { error: error.message };
  }
  const { profile, error: profileError } = await getOwnProfile(supabase, user.id);
  return profileError ? { error: profileError } : { profile };
}

/**
 * Updates the authenticated user's avatar_url in the profiles table.
 * Only accepts a URL string (presets are passed from AvatarPickerModal).
 */
export async function updateAvatarUrl(avatarUrl) {
  if (!avatarUrl || typeof avatarUrl !== 'string') {
    return { error: 'Invalid avatar.' };
  }
  try {
    const parsed = new URL(avatarUrl);
    if (parsed.protocol !== 'https:' || avatarUrl.length > 2048) return { error: 'Avatar must be a valid HTTPS URL under 2048 characters.' };
  } catch {
    return { error: 'Avatar must be a valid HTTPS URL.' };
  }

  const supabase = await createClient();
  const { user, error: authError } = await getAuthedUser(supabase);
  if (authError) return { error: authError };

  const { error } = await supabase
    .from('profiles')
    .update({
      avatar_url: avatarUrl,
    })
    .eq('id', user.id)
    .select('id');

  if (error) {
    return { error: error.message };
  }
  const { profile, error: profileError } = await getOwnProfile(supabase, user.id);
  return profileError ? { error: profileError } : { profile };
}

/**
 * Changes the authenticated user's password.
 * Uses the server client which carries the user's session via cookies.
 */
export async function changePassword(newPassword) {
  if (!newPassword || newPassword.length < 6) {
    return { error: 'Password must be at least 6 characters.' };
  }

  const supabase = await createClient();
  const { error: authError } = await getAuthedUser(supabase);
  if (authError) return { error: authError };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    return { error: error.message };
  }
  return { success: true };
}
