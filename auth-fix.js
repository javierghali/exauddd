// Silverback Vault V3 - Supabase publishable-key auth compatibility
(() => {
  const clean = (value, prefix) => {
    let v = String(value ?? '').trim();
    if (prefix && v.startsWith(prefix)) v = v.slice(prefix.length).trim();
    v = v.replace(/^['"]|['"]$/g, '').trim();
    return v;
  };

  const normalizeSettings = (raw = {}) => ({
    ...raw,
    supabaseUrl: clean(raw.supabaseUrl, 'NEXT_PUBLIC_SUPABASE_URL=').replace(/\/$/, ''),
    supabaseAnonKey: clean(raw.supabaseAnonKey, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='),
    vaultId: clean(raw.vaultId)
  });

  const originalGetSettings = typeof getSettings === 'function' ? getSettings : null;
  const originalSaveSettings = typeof saveSettings === 'function' ? saveSettings : null;

  if (originalGetSettings) {
    getSettings = function () {
      const normalized = normalizeSettings(originalGetSettings());
      try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        const old = raw ? JSON.parse(raw) : {};
        if (JSON.stringify(old) !== JSON.stringify(normalized)) {
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
        }
      } catch {}
      return normalized;
    };
  }

  if (originalSaveSettings) {
    saveSettings = function (settings) {
      return originalSaveSettings(normalizeSettings(settings));
    };
  }

  authRequest = async function (path, options = {}) {
    const s = normalizeSettings(getSettings());
    const key = s.supabaseAnonKey;
    const base = s.supabaseUrl;
    if (!base || !key) throw new Error('Supabase URL/key belum disimpan');

    const headers = {
      apikey: key,
      'Content-Type': 'application/json',
      'X-Client-Info': 'silverback-vault/3.0'
    };

    const session = typeof getAuth === 'function' ? getAuth() : null;
    if (options.auth && session?.access_token) {
      headers.Authorization = 'Bearer ' + session.access_token;
    } else {
      // Matches the unauthenticated header behavior used by Supabase clients.
      headers.Authorization = 'Bearer ' + key;
    }

    const url = base + '/auth/v1/' + path;
    let res;
    try {
      res = await fetch(url, {
        method: options.method || 'POST',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        credentials: 'omit',
        cache: 'no-store'
      });
    } catch (err) {
      throw new Error('Tidak dapat terhubung ke Supabase Auth: ' + (err?.message || err));
    }

    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; }
    catch { data = { message: text }; }

    if (!res.ok) {
      const detail = data.msg || data.message || data.error_description || data.error || text || 'Unknown error';
      const keyType = key.startsWith('sb_publishable_') ? 'publishable' : (key.startsWith('eyJ') ? 'legacy-anon' : 'unknown');
      throw new Error(`Supabase Auth HTTP ${res.status}: ${detail} [key=${keyType}, len=${key.length}]`);
    }
    return data;
  };

  // Update label/placeholder to match current Supabase terminology.
  const relabel = () => {
    const keyField = document.getElementById('supabaseAnonKey');
    if (keyField) {
      keyField.placeholder = 'Publishable key (sb_publishable_...) atau legacy anon key';
      const label = keyField.closest('label');
      if (label && label.firstChild?.nodeType === Node.TEXT_NODE) label.firstChild.textContent = 'Supabase Publishable / Anon Key';
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', relabel);
  else relabel();
})();
