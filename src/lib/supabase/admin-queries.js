/**
 * Client calls for app settings. Admin data that needs elevated columns or
 * cross-user access is handled by server actions after database-backed role
 * verification; the service-role key never enters the client bundle.
 */

export async function getAppSetting(supabase, key) {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value, updated_at")
    .eq("key", key)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function setAppSetting(supabase, key, value) {
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key, value });

  if (error) throw error;
}

/**
 * No security advisor findings are bundled with the repository. This
 * helper deliberately does not imply that a live advisor check occurred.
 */
export function getSecurityFindings() {
  return [];
}
