// Silverback Vault V3 - public frontend defaults
// Safe for browser use: Supabase Project URL + publishable key only.
// Never place secret/service_role keys in this file.
(() => {
  const DEFAULTS = {
    supabaseUrl: "https://nzcnrainwijanjehiuqp.supabase.co",
    supabaseAnonKey: "sb_publishable_EhX6VaGJYoPzZVkHfUXl2w_TnZo8HS4",
    vaultId: "silverback-main"
  };

  try {
    const key = typeof SETTINGS_KEY === "string" ? SETTINGS_KEY : "accountVaultV2.settings";
    let current = {};
    try { current = JSON.parse(localStorage.getItem(key)) || {}; } catch {}

    const next = {
      ...current,
      supabaseUrl: current.supabaseUrl || DEFAULTS.supabaseUrl,
      supabaseAnonKey: current.supabaseAnonKey || DEFAULTS.supabaseAnonKey,
      vaultId: current.vaultId || DEFAULTS.vaultId
    };

    localStorage.setItem(key, JSON.stringify(next));
    if (typeof updateSyncUi === "function") updateSyncUi();
    if (typeof updateAuthUi === "function") updateAuthUi();
  } catch (err) {
    console.error("Failed to apply Silverback public defaults", err);
  }
})();
