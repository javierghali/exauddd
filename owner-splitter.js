// Silverback Vault V3 - ZekeHub owners XLS -> username splitter
(() => {
  const uniq = arr => {
    const seen = new Set(), out = [];
    for (const v of arr) {
      const s = String(v || '').trim();
      if (!s) continue;
      const k = s.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k); out.push(s);
    }
    return out;
  };

  function downloadText(name, text, type='text/plain;charset=utf-8') {
    const blob = new Blob([text], {type});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  function parseSpreadsheetXml(text) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('XML spreadsheet tidak valid');
    const rows = [...doc.getElementsByTagNameNS('*', 'Row')];
    if (!rows.length) throw new Error('Tidak ada row pada spreadsheet');

    let usernameCol = -1, headerRow = -1;
    for (let r = 0; r < Math.min(rows.length, 20); r++) {
      const cells = [...rows[r].getElementsByTagNameNS('*', 'Cell')];
      let logical = 0;
      for (const cell of cells) {
        const idxAttr = cell.getAttributeNS('urn:schemas-microsoft-com:office:spreadsheet','Index') || cell.getAttribute('ss:Index');
        if (idxAttr) logical = Math.max(0, Number(idxAttr) - 1);
        const data = cell.getElementsByTagNameNS('*','Data')[0];
        const value = String(data?.textContent || '').trim();
        if (/^username$/i.test(value)) { usernameCol = logical; headerRow = r; break; }
        logical++;
      }
      if (usernameCol >= 0) break;
    }
    if (usernameCol < 0) throw new Error('Kolom Username tidak ditemukan');

    const usernames = [];
    for (let r = headerRow + 1; r < rows.length; r++) {
      const cells = [...rows[r].getElementsByTagNameNS('*','Cell')];
      let logical = 0, found = '';
      for (const cell of cells) {
        const idxAttr = cell.getAttributeNS('urn:schemas-microsoft-com:office:spreadsheet','Index') || cell.getAttribute('ss:Index');
        if (idxAttr) logical = Math.max(0, Number(idxAttr) - 1);
        if (logical === usernameCol) {
          found = String(cell.getElementsByTagNameNS('*','Data')[0]?.textContent || '').trim();
          break;
        }
        logical++;
      }
      if (found) usernames.push(found);
    }
    return usernames;
  }

  function parseCsvLike(text) {
    const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter(x => x.trim());
    if (!lines.length) return [];
    const delim = lines[0].includes('\t') ? '\t' : (lines[0].includes(';') ? ';' : ',');
    const headers = lines[0].split(delim).map(x => x.replace(/^"|"$/g,'').trim());
    const idx = headers.findIndex(x => /^username$/i.test(x));
    if (idx < 0) throw new Error('Kolom Username tidak ditemukan');
    return lines.slice(1).map(line => line.split(delim)[idx]?.replace(/^"|"$/g,'').trim()).filter(Boolean);
  }

  async function parseOwnerFile(file) {
    const name = String(file.name || '').toLowerCase();
    const text = await file.text();
    if (text.trimStart().startsWith('<?xml') || text.includes('<Workbook')) return parseSpreadsheetXml(text);
    if (name.endsWith('.csv') || name.endsWith('.txt')) return parseCsvLike(text);
    throw new Error('Format belum didukung. Gunakan owners_*.xls XML/CSV/TXT dari ZekeHub.');
  }

  function ensureUi() {
    if (!document.getElementById('ownerSplitInput')) {
      const input = document.createElement('input');
      input.type = 'file'; input.id = 'ownerSplitInput'; input.hidden = true; input.multiple = true;
      input.accept = '.xls,.xml,.csv,.txt';
      document.body.appendChild(input);
      input.addEventListener('change', () => processFiles([...input.files]));
    }

    if (!document.getElementById('ownerSplitDialog')) {
      const d = document.createElement('dialog'); d.id = 'ownerSplitDialog';
      d.innerHTML = `<div class="modal owner-split-modal">
        <div class="modal-head"><div><div class="eyebrow">SPLITTER</div><h2>Owners → Username</h2></div><button id="ownerSplitClose" class="icon-btn" type="button">×</button></div>
        <div id="ownerSplitSummary" class="notice">Pilih satu atau beberapa file owners ZekeHub. Splitter akan mencari kolom Username, menggabungkan semua file, lalu menghapus duplicate secara otomatis.</div>
        <div class="owner-file-picker"><button id="ownerSplitChoose" class="secondary" type="button">Pilih File</button><span id="ownerSplitPickerText">Tidak ada file yang dipilih</span></div>
        <div id="ownerSplitFiles" class="owner-file-list"></div>
        <textarea id="ownerSplitOutput" rows="12" readonly spellcheck="false" placeholder="Username hasil splitter akan muncul di sini..."></textarea>
        <div class="modal-actions owner-split-actions">
          <button id="ownerSplitCopy" class="secondary" type="button">Copy Username</button>
          <button id="ownerSplitCsv" class="secondary" type="button">Download CSV</button>
          <span class="spacer"></span>
          <button id="ownerSplitTxt" class="primary" type="button">Download TXT</button>
        </div>
      </div>`;
      document.body.appendChild(d);
      d.querySelector('#ownerSplitClose').onclick = () => d.close();
      d.querySelector('#ownerSplitChoose').onclick = () => document.getElementById('ownerSplitInput').click();
      d.querySelector('#ownerSplitCopy').onclick = async () => {
        const text = d.querySelector('#ownerSplitOutput').value;
        if (!text) return toast('Belum ada username.');
        try { await navigator.clipboard.writeText(text); toast('Username dicopy.'); }
        catch { d.querySelector('#ownerSplitOutput').select(); document.execCommand('copy'); toast('Username dicopy.'); }
      };
      d.querySelector('#ownerSplitTxt').onclick = () => {
        const text = d.querySelector('#ownerSplitOutput').value;
        if (!text) return toast('Belum ada username.');
        const count = text.split(/\r?\n/).filter(Boolean).length;
        downloadText(`usernames_${count}_unique.txt`, text + '\n');
      };
      d.querySelector('#ownerSplitCsv').onclick = () => {
        const text = d.querySelector('#ownerSplitOutput').value;
        if (!text) return toast('Belum ada username.');
        const names = text.split(/\r?\n/).filter(Boolean);
        const csv = 'Username\r\n' + names.map(x => `"${x.replace(/"/g,'""')}"`).join('\r\n') + '\r\n';
        downloadText(`usernames_${names.length}_unique.csv`, csv, 'text/csv;charset=utf-8');
      };
    }

    if (!document.getElementById('ownerSplitStyles')) {
      const s = document.createElement('style'); s.id = 'ownerSplitStyles';
      s.textContent = `
        #ownerSplitDialog{padding:0;border:0;background:transparent;max-width:none;max-height:none;width:100vw;height:100vh;margin:0;overflow:hidden;font-family:"Inter",system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        #ownerSplitDialog[open]{display:grid;place-items:center}
        #ownerSplitDialog::backdrop{background:rgba(0,0,0,.72);backdrop-filter:blur(1.5px)}
        .owner-split-modal{box-sizing:border-box;width:min(760px,calc(100vw - 56px));max-width:760px;max-height:calc(100vh - 72px);display:flex;flex-direction:column;overflow:hidden;margin:0;border-radius:14px;font-family:"Inter",system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        .owner-split-modal .modal-head,.owner-split-modal .notice,.owner-file-picker,.owner-split-actions{flex:0 0 auto}
        .owner-file-picker{display:flex;align-items:center;gap:10px;margin:10px 0 0;padding:8px;border:1px solid #21462c;border-radius:10px;background:#07110a;min-width:0}
        .owner-file-picker button{flex:0 0 auto}
        #ownerSplitPickerText{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#aab7ae;font-size:12px}
        .owner-split-modal textarea{width:100%;min-height:220px;max-height:42vh;resize:vertical;box-sizing:border-box;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;margin-top:10px}
        .owner-file-list{display:grid;gap:6px;margin:10px 0 0;max-height:130px;overflow:auto;min-height:0}
        .owner-file-row{display:flex;justify-content:space-between;gap:14px;padding:8px 10px;border:1px solid #21462c;border-radius:9px;font-size:12px;min-width:0;background:#07110a}
        .owner-file-row span:first-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .owner-file-row span:last-child{color:#9aa3ab;flex:0 0 auto}
        .owner-split-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px}
        .owner-split-actions .spacer{flex:1}
        @media(max-width:700px){
          #ownerSplitDialog{padding:12px;box-sizing:border-box}
          .owner-split-modal{width:100%;max-width:none;max-height:calc(100vh - 24px);border-radius:12px}
          .owner-split-modal textarea{min-height:180px;max-height:38vh}
          .owner-split-actions button{flex:1 1 45%}
          .owner-split-actions .spacer{display:none}
          .owner-file-picker{align-items:stretch;flex-direction:column}
          #ownerSplitPickerText{white-space:normal;overflow-wrap:anywhere}
        }
        @media(max-height:700px){
          .owner-split-modal{max-height:calc(100vh - 24px)}
          .owner-split-modal textarea{min-height:150px;max-height:32vh}
          .owner-file-list{max-height:90px}
        }
      `;
      document.head.appendChild(s);
    }
  }

  async function processFiles(files) {
    if (!files.length) return;
    ensureUi();
    const d = document.getElementById('ownerSplitDialog');
    const summary = d.querySelector('#ownerSplitSummary');
    const listEl = d.querySelector('#ownerSplitFiles');
    const out = d.querySelector('#ownerSplitOutput');
    const pickerText = d.querySelector('#ownerSplitPickerText');
    if (pickerText) pickerText.textContent = files.length === 1 ? files[0].name : `${files.length} file dipilih`;
    summary.textContent = `Memproses ${files.length} file...`; listEl.innerHTML = ''; out.value = '';
    if (!d.open) d.showModal();

    const all = [], details = []; let failed = 0;
    for (const file of files) {
      try {
        const users = await parseOwnerFile(file);
        all.push(...users); details.push({name:file.name,count:users.length,ok:true});
      } catch (e) {
        failed++; details.push({name:file.name,count:0,ok:false,error:String(e.message || e)});
      }
    }
    const unique = uniq(all), duplicates = Math.max(0, all.length - unique.length);
    out.value = unique.join('\n');
    listEl.innerHTML = details.map(x => `<div class="owner-file-row"><span>${escapeHtml(x.name)}</span><span>${x.ok ? `${x.count} username` : `Gagal: ${escapeHtml(x.error)}`}</span></div>`).join('');
    summary.innerHTML = `<b>${all.length.toLocaleString('id-ID')} entri</b> → <b>${unique.length.toLocaleString('id-ID')} username unik</b> • ${duplicates.toLocaleString('id-ID')} duplicate dihapus${failed ? ` • ${failed} file gagal` : ''}.`;
    toast(`${unique.length} username unik ditemukan.`);
    document.getElementById('ownerSplitInput').value = '';
  }

  function escapeHtml(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function ensureButton() {
    ensureUi();
    const quick = document.querySelector('.quick-list');
    if (!quick || document.getElementById('ownerSplitBtn')) return;
    const b = document.createElement('button'); b.id = 'ownerSplitBtn';
    b.innerHTML = '✂ <span>Owners → Username</span>';
    b.onclick = () => document.getElementById('ownerSplitInput').click();
    const sync = document.getElementById('quickSyncBtn'); quick.insertBefore(b, sync || null);
  }

  const baseRender = render;
  render = function(){ baseRender(); ensureButton(); };
  ensureButton();
})();
