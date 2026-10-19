export function isAdminProfile(profile, authenticatedUserId) {
  return Boolean(
    profile
      && typeof authenticatedUserId === 'string'
      && profile.id === authenticatedUserId
      && profile.role === 'admin'
  );
}

export function canChangeAdminTargetRole(profile, authenticatedUserId, targetUserId) {
  return isAdminProfile(profile, authenticatedUserId)
    && typeof targetUserId === 'string'
    && targetUserId !== authenticatedUserId;
}
