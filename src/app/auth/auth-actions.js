'use server';

/**
 * Kept as a generic compatibility response for stale clients. Username to
 * email lookup is intentionally disabled: returning an email here allowed
 * unauthenticated callers to enumerate private account addresses. The active
 * sign-in flow already accepts email directly.
 */
export async function resolveUsernameToEmail() {
  return { error: 'Sign in with your email address and password.' };
}
