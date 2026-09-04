/* EXAUDDD Supabase keep-alive
   Makes one tiny authenticated database read per local calendar day.
   It reuses the existing Supabase configuration/session and does not write vault data.
*/
(() => {
  const KEEPALIVE_KEY = "exauddd.supabaseKeepAlive.lastDate";

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  async function runSupabaseKeepAlive() {
    try {
      if (typeof syncConfigured !== "function" || typeof isSignedIn !== "function" || typeof supabaseRequest !== "function") return;
      if (!syncConfigured() || !isSignedIn()) return;

      const today = todayKey();
      if (localStorage.getItem(KEEPALIVE_KEY) === today) return;

      const s = typeof getSettings === "function" ? getSettings() : {};
      if (!s.vaultId) return;

      // A minimal real database query. No credential/cookie/vault contents are logged.
      await supabaseRequest(`vaults?vault_id=eq.${encodeURIComponent(s.vaultId)}&select=vault_id&limit=1`);
      localStorage.setItem(KEEPALIVE_KEY, today);
      console.info("[EXAUDDD] Supabase daily keep-alive OK");
    } catch (err) {
      console.warn("[EXAUDDD] Supabase keep-alive skipped:", err?.message || err);
    }
  }

  window.runSupabaseKeepAlive = runSupabaseKeepAlive;
  window.addEventListener("load", () => setTimeout(runSupabaseKeepAlive, 4000));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") runSupabaseKeepAlive();
  });
  setInterval(runSupabaseKeepAlive, 60 * 60 * 1000);
})();
