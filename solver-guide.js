// EXAUDDD Vault - Solver Guide (local reference only)
// Stores solver URL/key locally in this browser. Does not call or bypass any challenge.
(() => {
  const STORE='exauddd_solver_guides_v1';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const load=()=>{try{return JSON.parse(localStorage.getItem(STORE)||'[]')}catch{return []}};
  const save=x=>localStorage.setItem(STORE,JSON.stringify(x));
  const copy=async text=>{try{await navigator.clipboard.writeText(text);toast('Copied.')}catch{toast('Copy gagal.')}};

  function ensureDialog(){
    if(document.getElementById('solverGuideDialog'))return;
    const d=document.createElement('dialog');d.id='solverGuideDialog';
    d.innerHTML=`<div class="modal solver-guide-modal"><div class="modal-head"><div><div class="eyebrow">REFERENCE VAULT</div><h2>Solver Guide</h2></div><button id="solverGuideClose" class="icon-btn" type="button">×</button></div>
      <div class="notice">Simpan URL dan key sebagai catatan lokal agar mudah copy/paste. Key tidak dimasukkan ke source GitHub dan fitur ini tidak menjalankan solver.</div>
      <div class="solver-form"><input id="solverName" placeholder="Nama solver / label"><input id="solverUrl" type="url" placeholder="https://solver.example/api"><div class="credential-input"><input id="solverKey" type="password" placeholder="API key"><button id="solverKeyShow" type="button" class="mini-btn">Show</button></div><textarea id="solverNote" rows="3" placeholder="Catatan / cara pemakaian (opsional)"></textarea><button id="solverAdd" class="primary" type="button">+ Add Solver</button></div>
      <div id="solverList" class="solver-list"></div></div>`;
    document.body.appendChild(d);
    d.querySelector('#solverGuideClose').onclick=()=>d.close();
    d.querySelector('#solverKeyShow').onclick=()=>{const i=d.querySelector('#solverKey');i.type=i.type==='password'?'text':'password'};
    d.querySelector('#solverAdd').onclick=()=>{
      const name=d.querySelector('#solverName').value.trim(),url=d.querySelector('#solverUrl').value.trim(),key=d.querySelector('#solverKey').value.trim(),note=d.querySelector('#solverNote').value.trim();
      if(!name||!url)return toast('Isi nama dan URL solver.');
      const items=load();items.push({id:crypto.randomUUID?.()||String(Date.now()),name,url,key,note});save(items);
      ['#solverName','#solverUrl','#solverKey','#solverNote'].forEach(x=>d.querySelector(x).value='');renderList();toast('Solver disimpan lokal.');
    };
  }

  function renderList(){
    const el=document.getElementById('solverList');if(!el)return;const items=load();
    el.innerHTML=items.length?items.map(x=>`<div class="solver-card" data-id="${esc(x.id)}"><div class="solver-card-head"><strong>${esc(x.name)}</strong><button class="solver-delete danger-btn small" type="button">Delete</button></div><div class="solver-line"><code>${esc(x.url)}</code><button class="solver-copy-url secondary small" type="button">Copy URL</button></div><div class="solver-line"><code class="solver-secret">••••••••••••</code><button class="solver-show secondary small" type="button">Show</button><button class="solver-copy-key secondary small" type="button">Copy Key</button></div>${x.note?`<p>${esc(x.note)}</p>`:''}</div>`).join(''):'<div class="notice">Belum ada solver tersimpan.</div>';
    el.querySelectorAll('.solver-card').forEach(card=>{const item=items.find(x=>x.id===card.dataset.id);if(!item)return;
      card.querySelector('.solver-copy-url').onclick=()=>copy(item.url);card.querySelector('.solver-copy-key').onclick=()=>copy(item.key);
      card.querySelector('.solver-show').onclick=e=>{const c=card.querySelector('.solver-secret');const hidden=c.textContent.startsWith('•');c.textContent=hidden?(item.key||'(empty)'):'••••••••••••';e.currentTarget.textContent=hidden?'Hide':'Show'};
      card.querySelector('.solver-delete').onclick=()=>{save(load().filter(x=>x.id!==item.id));renderList();toast('Solver dihapus.')};
    });
  }

  function ensureButton(){
    ensureDialog();const quick=document.querySelector('.quick-list');if(!quick||document.getElementById('solverGuideBtn'))return;
    const b=document.createElement('button');b.id='solverGuideBtn';b.type='button';b.innerHTML='⚙ <span>Solver Guide</span>';b.onclick=()=>{renderList();document.getElementById('solverGuideDialog').showModal()};
    const sync=document.getElementById('quickSyncBtn');quick.insertBefore(b,sync||null);
  }
  if(!document.getElementById('solverGuideStyles')){const s=document.createElement('style');s.id='solverGuideStyles';s.textContent='.solver-guide-modal{width:min(760px,calc(100vw - 24px))}.solver-form{display:grid;gap:9px;margin:12px 0 16px}.solver-list{display:grid;gap:10px;max-height:45vh;overflow:auto}.solver-card{padding:12px;border:1px solid #21462c;border-radius:10px;background:#07110a}.solver-card-head,.solver-line{display:flex;align-items:center;gap:8px;justify-content:space-between}.solver-line{margin-top:8px}.solver-line code{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}.solver-card p{margin:9px 0 0;color:#9aa7a0;font-size:12px;white-space:pre-wrap}';document.head.appendChild(s)}
  const old=window.render;if(typeof old==='function')window.render=function(){old();ensureButton()};
  ensureButton();document.addEventListener('DOMContentLoaded',ensureButton);
})();