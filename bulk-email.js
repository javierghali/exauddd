// EXAUDDD Vault V3 - Bulk Email metadata
// Safe metadata mapping only: username:email. Does not export passwords/cookies.
(() => {
  const normUser = v => String(v || '').trim().toLowerCase();
  const isVaultUnlocked = () => { try { return Boolean(masterKey && vault && Array.isArray(vault.accounts)); } catch { return false; } };

  function parseEmailMap(text) {
    const rows = [], rejected = [];
    String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).forEach((raw, i) => {
      const line = raw.trim(); if (!line) return;
      const p = line.indexOf(':');
      if (p <= 0) { rejected.push(i + 1); return; }
      const username = line.slice(0, p).trim();
      const email = line.slice(p + 1).trim();
      if (!username || !email || !email.includes('@')) { rejected.push(i + 1); return; }
      rows.push({ username, email });
    });
    return { rows, rejected };
  }

  async function applyEmailMap(text) {
    if (!isVaultUnlocked()) throw new Error('Unlock vault dulu');
    const { rows, rejected } = parseEmailMap(text);
    if (!rows.length) throw new Error('Tidak ada baris username:email yang valid');
    const byUser = new Map(vault.accounts.map(a => [normUser(a.username), a]));
    let updated = 0, notFound = 0;
    for (const row of rows) {
      const a = byUser.get(normUser(row.username));
      if (!a) { notFound++; continue; }
      a.email = row.email;
      a.updatedAt = new Date().toISOString();
      updated++;
    }
    if (updated) await saveLocalAndMaybeRemote();
    render();
    return `${updated} akun diperbarui${notFound ? ` • ${notFound} username tidak ditemukan` : ''}${rejected.length ? ` • ${rejected.length} baris invalid` : ''}`;
  }

  function selectedIds() { return new Set([...document.querySelectorAll('[data-account-select]:checked')].map(x => x.dataset.accountSelect).filter(Boolean)); }
  function exportList() {
    const scope = document.querySelector('input[name="emailExportScope"]:checked')?.value || 'all';
    if (scope === 'selected') { const ids = selectedIds(); return vault.accounts.filter(a => ids.has(a.id)); }
    return [...vault.accounts];
  }
  async function saveText(text, name) {
    const blob = new Blob(['\uFEFF' + text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; a.style.display = 'none'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function ensureEmailDialogs() {
    if (!document.getElementById('bulkEmailDialog')) {
      const d = document.createElement('dialog'); d.id = 'bulkEmailDialog';
      d.innerHTML = `<div class="modal paste-upc-modal"><div class="modal-head"><div><div class="eyebrow">ACCOUNTS</div><h2>Bulk Email</h2></div><button class="icon-btn" data-close>×</button></div><div class="notice">Satu akun per baris: <b>username:email</b>. Data dicocokkan berdasarkan username dan tidak mengubah password/cookie.</div><textarea id="bulkEmailText" rows="14" spellcheck="false" placeholder="username:email@example.com"></textarea><div class="modal-actions"><span class="spacer"></span><button class="secondary" data-close>Cancel</button><button id="applyBulkEmail" class="primary">Apply Email</button></div></div>`;
      document.body.appendChild(d); d.querySelectorAll('[data-close]').forEach(b => b.onclick = () => d.close());
      d.querySelector('#applyBulkEmail').onclick = async () => { const b=d.querySelector('#applyBulkEmail'); b.disabled=true; try { const msg=await applyEmailMap(d.querySelector('#bulkEmailText').value); d.close(); toast('Bulk Email: '+msg); } catch(e) { toast('Bulk Email gagal: '+String(e.message||e).slice(0,120)); } finally { b.disabled=false; } };
    }
    if (!document.getElementById('exportEmailDialog')) {
      const d = document.createElement('dialog'); d.id = 'exportEmailDialog';
      d.innerHTML = `<div class="modal paste-upc-modal"><div class="modal-head"><div><div class="eyebrow">EXPORT</div><h2>Export Username + Email</h2></div><button class="icon-btn" data-close>×</button></div><div class="notice">TXT metadata saja: <b>username:email</b>. Password dan cookie tidak disertakan.</div><div class="export-scope-row"><label><input type="radio" name="emailExportScope" value="all" checked> All accounts</label><label><input type="radio" name="emailExportScope" value="selected"> Selected items</label></div><div class="modal-actions"><span class="spacer"></span><button class="secondary" data-close>Cancel</button><button id="downloadEmailExport" class="primary">Export TXT</button></div></div>`;
      document.body.appendChild(d); d.querySelectorAll('[data-close]').forEach(b => b.onclick = () => d.close());
      d.querySelector('#downloadEmailExport').onclick = async () => { if(!isVaultUnlocked()) return toast('Unlock vault dulu.'); const list=exportList().filter(a=>String(a.email||'').trim()); if(!list.length) return toast('Belum ada email untuk diexport.'); const text=list.map(a=>`${String(a.username||'').trim()}:${String(a.email||'').trim()}`).join('\r\n'); await saveText(text,`username-email-${list.length}-${new Date().toISOString().slice(0,10)}.txt`); toast(`${list.length} username + email diexport.`); };
    }
  }

  function ensureEmailButtons() {
    ensureEmailDialogs(); const quick=document.querySelector('.quick-list'); if(!quick) return;
    if(!document.getElementById('bulkEmailBtn')) { const b=document.createElement('button'); b.id='bulkEmailBtn'; b.innerHTML='✉ <span>Bulk Email</span>'; b.onclick=()=>{ if(!isVaultUnlocked()) return toast('Unlock vault dulu.'); document.getElementById('bulkEmailDialog').showModal(); }; quick.insertBefore(b,document.getElementById('quickSyncBtn')||null); }
    if(!document.getElementById('exportEmailBtn')) { const b=document.createElement('button'); b.id='exportEmailBtn'; b.innerHTML='⇩ <span>Export Username + Email</span>'; b.onclick=()=>{ if(!isVaultUnlocked()) return toast('Unlock vault dulu.'); document.getElementById('exportEmailDialog').showModal(); }; quick.insertBefore(b,document.getElementById('quickSyncBtn')||null); }
  }
  const oldRender=render; render=function(){ oldRender(); ensureEmailButtons(); }; ensureEmailButtons();
})();
