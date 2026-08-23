// Silverback Vault V3 - Owners XLS/CSV/TXT -> unique usernames
(() => {
  const escCsv = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  let lastResult = [];

  function uniqUsernames(values) {
    const seen = new Set();
    const out = [];
    for (const raw of values) {
      const v = String(raw || '').trim();
      if (!v) continue;
      const key = v.toLowerCase();
      if (key === 'username' || seen.has(key)) continue;
      seen.add(key);
      out.push(v);
    }
    return out;
  }

  function parseHtmlTable(text) {
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const tables = [...doc.querySelectorAll('table')];
    for (const table of tables) {
      const rows = [...table.querySelectorAll('tr')].map(tr => [...tr.querySelectorAll('th,td')].map(c => c.textContent.trim()));
      if (!rows.length) continue;
      let headerRow = -1, userCol = -1;
      for (let r = 0; r < Math.min(rows.length, 10); r++) {
        const idx = rows[r].findIndex(v => /^username$/i.test(v.trim()));
        if (idx >= 0) { headerRow = r; userCol = idx; break; }
      }
      if (userCol >= 0) return rows.slice(headerRow + 1).map(r => r[userCol]).filter(Boolean);
    }
    return [];
  }

  function parseXmlSpreadsheet(text) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.querySelector('parsererror')) return [];
    const rows = [...doc.getElementsByTagNameNS('*', 'Row')];
    const matrix = rows.map(row => [...row.getElementsByTagNameNS('*', 'Cell')].map(cell => {
      const data = cell.getElementsByTagNameNS('*', 'Data')[0];
      return (data?.textContent || cell.textContent || '').trim();
    }));
    let headerRow = -1, userCol = -1;
    for (let r = 0; r < Math.min(matrix.length, 10); r++) {
      const idx = matrix[r].findIndex(v => /^username$/i.test(v));
      if (idx >= 0) { headerRow = r; userCol = idx; break; }
    }
    return userCol >= 0 ? matrix.slice(headerRow + 1).map(r => r[userCol]).filter(Boolean) : [];
  }

  function splitDelimited(line, delimiter) {
    const out = []; let cur = '', quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') { cur += '"'; i++; }
        else quoted = !quoted;
      } else if (ch === delimiter && !quoted) { out.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    out.push(cur.trim());
    return out;
  }

  function parseDelimited(text) {
    const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
    if (!lines.length) return [];
    for (const delimiter of ['\t', ',', ';']) {
      for (let r = 0; r < Math.min(lines.length, 10); r++) {
        const head = splitDelimited(lines[r], delimiter);
        const idx = head.findIndex(v => /^username$/i.test(v));
        if (idx >= 0) return lines.slice(r + 1).map(l => splitDelimited(l, delimiter)[idx]).filter(Boolean);
      }
    }
    return [];
  }

  function parseUsernameText(text) {
    const html = parseHtmlTable(text); if (html.length) return html;
    if (/Workbook|Worksheet|ss:Name/i.test(text)) {
      const xml = parseXmlSpreadsheet(text); if (xml.length) return xml;
    }
    const delimited = parseDelimited(text); if (delimited.length) return delimited;
    return [];
  }

  async function readOwnersFile(file) {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    // Old binary BIFF .xls cannot be parsed safely without a spreadsheet library.
    if (bytes.length >= 8 && bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0) {
      throw new Error(`${file.name}: format XLS binary lama belum didukung. Export ulang dari ZekeHub sebagai XLS/HTML atau CSV.`);
    }
    return new TextDecoder('utf-8').decode(bytes);
  }

  function saveText(text, filename, type = 'text/plain;charset=utf-8') {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function ensureDialog() {
    if (document.getElementById('ownersUsernameDialog')) return;
    const d = document.createElement('dialog'); d.id = 'ownersUsernameDialog';
    d.innerHTML = `<div class="modal paste-upc-modal">
      <div class="modal-head"><div><div class="eyebrow">SPLITTER</div><h2>Owners → Username</h2></div><button id="closeOwnersSplit" type="button" class="icon-btn">×</button></div>
      <div class="notice">Pilih satu atau beberapa file <b>owners_*.xls / .csv / .txt</b>. Silverback mencari kolom Username, menggabungkan semua file, lalu menghapus duplicate.</div>
      <input id="ownersFiles" type="file" multiple accept=".xls,.csv,.txt,text/plain,text/csv,application/vnd.ms-excel">
      <div id="ownersSummary" class="notice">Belum ada file diproses.</div>
      <textarea id="ownersPreview" rows="12" spellcheck="false" readonly placeholder="Username hasil splitter akan muncul di sini"></textarea>
      <div class="modal-actions"><button id="copyOwnersUsers" type="button" class="secondary">Copy Username</button><button id="downloadOwnersCsv" type="button" class="secondary">Download CSV</button><span class="spacer"></span><button id="downloadOwnersTxt" type="button" class="primary">Download TXT</button></div>
    </div>`;
    document.body.appendChild(d);
    const close = () => d.close();
    d.querySelector('#closeOwnersSplit').onclick = close;
    d.querySelector('#ownersFiles').onchange = async e => {
      const files = [...e.target.files];
      const summary = d.querySelector('#ownersSummary');
      const preview = d.querySelector('#ownersPreview');
      if (!files.length) return;
      summary.textContent = 'Memproses file…';
      const all = []; let total = 0; const errors = [];
      for (const file of files) {
        try {
          const text = await readOwnersFile(file);
          const names = parseUsernameText(text);
          total += names.length; all.push(...names);
          if (!names.length) errors.push(`${file.name}: kolom Username tidak ditemukan`);
        } catch (err) { errors.push(String(err.message || err)); }
      }
      lastResult = uniqUsernames(all);
      const dupes = Math.max(0, total - lastResult.length);
      preview.value = lastResult.join('\n');
      summary.textContent = `${files.length} file • ${total.toLocaleString('id-ID')} entri → ${lastResult.length.toLocaleString('id-ID')} username unik • ${dupes.toLocaleString('id-ID')} duplicate dihapus${errors.length ? ` • ${errors.length} file bermasalah` : ''}`;
      if (errors.length) summary.title = errors.join('\n');
    };
    d.querySelector('#copyOwnersUsers').onclick = async () => {
      if (!lastResult.length) return toast('Belum ada username hasil splitter.');
      try { await navigator.clipboard.writeText(lastResult.join('\n')); toast(`${lastResult.length} username dicopy.`); }
      catch { d.querySelector('#ownersPreview').select(); document.execCommand('copy'); toast(`${lastResult.length} username dicopy.`); }
    };
    d.querySelector('#downloadOwnersTxt').onclick = () => {
      if (!lastResult.length) return toast('Belum ada username hasil splitter.');
      saveText(lastResult.join('\n'), `owners-usernames-${lastResult.length}.txt`);
    };
    d.querySelector('#downloadOwnersCsv').onclick = () => {
      if (!lastResult.length) return toast('Belum ada username hasil splitter.');
      saveText(['Username', ...lastResult.map(escCsv)].join('\n'), `owners-usernames-${lastResult.length}.csv`, 'text/csv;charset=utf-8');
    };
  }

  function ensureButton() {
    ensureDialog();
    const quick = document.querySelector('.quick-list');
    if (!quick || document.getElementById('ownersUsernameBtn')) return;
    const b = document.createElement('button');
    b.id = 'ownersUsernameBtn'; b.innerHTML = '✂ <span>Owners → Username</span>';
    b.onclick = () => {
      lastResult = [];
      const d = document.getElementById('ownersUsernameDialog');
      d.querySelector('#ownersFiles').value = '';
      d.querySelector('#ownersPreview').value = '';
      d.querySelector('#ownersSummary').textContent = 'Belum ada file diproses.';
      d.showModal();
    };
    const sync = document.getElementById('quickSyncBtn');
    quick.insertBefore(b, sync || null);
  }

  const baseRender = typeof render === 'function' ? render : null;
  if (baseRender) render = function(){ baseRender(); ensureButton(); };
  document.addEventListener('DOMContentLoaded', ensureButton, { once: true });
  ensureButton();
})();
