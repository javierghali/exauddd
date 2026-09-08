// EXAUDDD Vault V3 - Extract Accounts by username list
(() => {
  const norm = v => String(v || '').trim().toLowerCase();
  const unlocked = () => { try { return Boolean(masterKey && vault && Array.isArray(vault.accounts)); } catch { return false; } };
  let lastResult = { requested: [], matched: [], notFound: [] };

  function parseUsernames(text) {
    const seen = new Set(), out = [];
    String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).forEach(raw => {
      const u = raw.trim(); if (!u) return;
      const k = norm(u); if (seen.has(k)) return;
      seen.add(k); out.push(u);
    });
    return out;
  }

  function runExtract(text) {
    if (!unlocked()) throw new Error('Unlock vault dulu');
    const requested = parseUsernames(text);
    if (!requested.length) throw new Error('Masukkan minimal 1 username');
    const byUser = new Map();
    vault.accounts.forEach(a => { const k = norm(a.username); if (k && !byUser.has(k)) byUser.set(k, a); });
    const matched = [], notFound = [];
    requested.forEach(u => { const a = byUser.get(norm(u)); if (a) matched.push(a); else notFound.push(u); });
    lastResult = { requested, matched, notFound };
    renderResult();
  }

  function esc(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function renderResult() {
    const box = document.getElementById('extractResult'); if (!box) return;
    const { requested, matched, notFound } = lastResult;
    if (!requested.length) { box.innerHTML = '<div class="extract-empty">Belum ada hasil.</div>'; return; }
    const previewMatched = matched.slice(0, 8).map(a => `<div class="extract-row"><span>✓</span><b>${esc(a.username)}</b><em>${esc(a.status || '')}${a.group ? ' • ' + esc(a.group) : ''}</em></div>`).join('');
    const previewMissing = notFound.slice(0, 8).map(u => `<div class="extract-row missing"><span>!</span><b>${esc(u)}</b><em>Not found</em></div>`).join('');
    box.innerHTML = `
      <div class="extract-stats"><div><strong>${requested.length}</strong><span>Requested</span></div><div><strong>${matched.length}</strong><span>Found</span></div><div><strong>${notFound.length}</strong><span>Not Found</span></div></div>
      <div class="extract-preview">${previewMatched}${previewMissing}${(matched.length + notFound.length) > 16 ? '<div class="extract-more">Preview dibatasi 16 baris.</div>' : ''}</div>
      <div class="extract-actions"><button id="selectMatchedBtn" class="secondary">Select Matched</button><button id="copyMissingBtn" class="secondary">Copy Not Found</button><button id="downloadMatchedBtn" class="primary">Download Matched</button><button id="downloadMissingBtn" class="secondary">Download Not Found</button></div>`;
    document.getElementById('selectMatchedBtn').onclick = selectMatched;
    document.getElementById('copyMissingBtn').onclick = copyMissing;
    document.getElementById('downloadMatchedBtn').onclick = downloadMatched;
    document.getElementById('downloadMissingBtn').onclick = downloadMissing;
  }

  async function saveText(text, filename) {
    const blob = new Blob(['\uFEFF' + String(text || '')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = filename; a.style.display = 'none'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  function stamp(){ return new Date().toISOString().slice(0,10); }
  async function downloadMatched(){
    if (!lastResult.matched.length) return toast('Tidak ada akun yang ditemukan.');
    const lines = lastResult.matched.map(a => [a.username, a.email || '', a.status || '', a.group || '', a.notes || ''].map(v => String(v).replace(/[\r\n\t]+/g,' ')).join('\t'));
    await saveText('username\temail\tstatus\tgroup\tnotes\r\n' + lines.join('\r\n'), `matched-accounts-${lastResult.matched.length}-${stamp()}.txt`);
    toast(`${lastResult.matched.length} akun matched didownload.`);
  }
  async function downloadMissing(){
    if (!lastResult.notFound.length) return toast('Tidak ada username yang tidak ditemukan.');
    await saveText(lastResult.notFound.join('\r\n'), `not-found-${lastResult.notFound.length}-${stamp()}.txt`);
    toast(`${lastResult.notFound.length} username not found didownload.`);
  }
  async function copyMissing(){
    if (!lastResult.notFound.length) return toast('Tidak ada username yang tidak ditemukan.');
    try { await navigator.clipboard.writeText(lastResult.notFound.join('\n')); toast(`${lastResult.notFound.length} username dicopy.`); }
    catch { toast('Copy gagal.'); }
  }
  function selectMatched(){
    const ids = new Set(lastResult.matched.map(a => a.id));
    let count = 0;
    document.querySelectorAll('[data-account-select]').forEach(cb => { cb.checked = ids.has(cb.dataset.accountSelect); if (cb.checked) count++; });
    document.dispatchEvent(new Event('change', { bubbles: true }));
    toast(`${count} akun matched dipilih.`);
  }

  function ensureDialog(){
    if (document.getElementById('extractAccountsDialog')) return;
    const d = document.createElement('dialog'); d.id = 'extractAccountsDialog';
    d.innerHTML = `<div class="modal extract-modal"><div class="modal-head"><div><div class="eyebrow">TOOLS</div><h2>Extract Accounts</h2></div><button class="icon-btn" data-close>×</button></div><div class="notice">Paste username, satu per baris. Sistem mencari exact username di database tanpa mengubah data akun.</div><textarea id="extractUsernamesText" rows="12" spellcheck="false" placeholder="username1\nusername2\nusername3"></textarea><div class="modal-actions"><button id="clearExtractBtn" class="secondary">Clear</button><span class="spacer"></span><button class="secondary" data-close>Close</button><button id="runExtractBtn" class="primary">Find & Extract</button></div><div id="extractResult" class="extract-result"><div class="extract-empty">Belum ada hasil.</div></div></div>`;
    document.body.appendChild(d);
    d.querySelectorAll('[data-close]').forEach(b => b.onclick = () => d.close());
    d.querySelector('#clearExtractBtn').onclick = () => { d.querySelector('#extractUsernamesText').value = ''; lastResult = { requested: [], matched: [], notFound: [] }; renderResult(); };
    d.querySelector('#runExtractBtn').onclick = () => { try { runExtract(d.querySelector('#extractUsernamesText').value); } catch(e) { toast(String(e.message || e)); } };

    const s = document.createElement('style'); s.id = 'extractAccountsStyles';
    s.textContent = `.extract-modal{width:min(820px,calc(100vw - 24px))}.extract-modal textarea{width:100%;min-height:220px;resize:vertical;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.extract-result{margin-top:14px;border:1px solid #1f3a2a;border-radius:10px;background:#08100b;overflow:hidden}.extract-empty,.extract-more{padding:14px;color:#6d8474;font-size:11px}.extract-stats{display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid #173122}.extract-stats>div{padding:13px;text-align:center}.extract-stats strong{display:block;font-size:22px;font-weight:600;color:#f3fff5}.extract-stats span{font-size:9px;color:#789083;text-transform:uppercase}.extract-preview{max-height:260px;overflow:auto}.extract-row{display:grid;grid-template-columns:22px minmax(120px,1fr) minmax(100px,1fr);gap:8px;padding:9px 12px;border-bottom:1px solid #14271b;font-size:10px;align-items:center}.extract-row span{color:#72ff83}.extract-row em{font-style:normal;color:#6f8978}.extract-row.missing span,.extract-row.missing em{color:#d99b66}.extract-actions{display:flex;gap:8px;flex-wrap:wrap;padding:12px}@media(max-width:640px){.extract-row{grid-template-columns:20px 1fr}.extract-row em{grid-column:2}.extract-actions button{flex:1 1 45%}}`;
    document.head.appendChild(s);
  }

  function ensureButton(){
    ensureDialog(); const quick = document.querySelector('.quick-list'); if (!quick || document.getElementById('extractAccountsBtn')) return;
    const b = document.createElement('button'); b.id = 'extractAccountsBtn'; b.innerHTML = '⌕ <span>Extract Accounts</span>';
    b.onclick = () => { if (!unlocked()) return toast('Unlock vault dulu.'); document.getElementById('extractAccountsDialog').showModal(); };
    quick.insertBefore(b, document.getElementById('quickSyncBtn') || null);
  }
  const oldRender = render; render = function(){ oldRender(); ensureButton(); }; ensureButton();
})();
