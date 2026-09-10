// EXAUDDD Vault - Solver Guide (encrypted vault reference)
// Stores reference entries inside the encrypted EXAUDDD vault so they can follow Supabase ciphertext sync.
// Legacy localStorage entries are migrated after unlock. This feature only stores/copies references; it does not run a solver.
(() => {
  const LEGACY_STORE='exauddd_solver_guides_v1';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[c]));
  const unlocked=()=>{try{return Boolean(masterKey&&vault)}catch{return false}};
  const copy=async text=>{try{await navigator.clipboard.writeText(String(text||''));toast('Copied.')}catch{toast('Copy gagal.')}};

  function getItems(){
    if(!unlocked())return [];
    if(!vault.references||typeof vault.references!=='object')vault.references={};
    if(!Array.isArray(vault.references.solverGuides))vault.references.solverGuides=[];
    return vault.references.solverGuides;
  }

  async function persist(message){
    if(!unlocked())throw new Error('Unlock vault dulu.');
    await saveLocalAndMaybeRemote();
    if(message)toast(message);
  }

  async function migrateLegacy(){
    if(!unlocked())return false;
    let legacy=[];
    try{legacy=JSON.parse(localStorage.getItem(LEGACY_STORE)||'[]')}catch{legacy=[]}
    if(!Array.isArray(legacy)||!legacy.length)return false;

    const items=getItems();
    const known=new Set(items.map(x=>String(x.id||'')));
    let added=0;
    for(const x of legacy){
      if(!x||(!x.name&&!x.url))continue;
      const id=String(x.id||crypto.randomUUID?.()||Date.now()+'-'+Math.random());
      if(known.has(id))continue;
      items.push({
        id,
        name:String(x.name||'').trim(),
        url:String(x.url||'').trim(),
        key:String(x.key||''),
        note:String(x.note||''),
        createdAt:x.createdAt||new Date().toISOString(),
        updatedAt:new Date().toISOString()
      });
      known.add(id);added++;
    }
    if(!added)return false;

    try{
      await saveLocalAndMaybeRemote();
      localStorage.removeItem(LEGACY_STORE);
      toast(`${added} Solver Guide lama dipindahkan ke vault terenkripsi.`);
      return true;
    }catch(e){
      console.warn('[EXAUDDD] Solver Guide migration save failed:',e?.message||e);
      // Keep legacy localStorage intact if encrypted save/sync path fails.
      return false;
    }
  }

  function ensureDialog(){
    if(document.getElementById('solverGuideDialog'))return;
    const d=document.createElement('dialog');d.id='solverGuideDialog';
    d.innerHTML=`<div class="modal solver-guide-modal"><div class="modal-head"><div><div class="eyebrow">ENCRYPTED REFERENCE VAULT</div><h2>Solver Guide</h2></div><button id="solverGuideClose" class="icon-btn" type="button">×</button></div>
      <div class="notice">URL, key, dan catatan disimpan di dalam vault terenkripsi. Jika Supabase Sync aktif, data ikut tersinkron sebagai ciphertext dan dapat muncul di device lain setelah login + unlock dengan master password yang sama. Fitur ini hanya menyimpan/copy referensi dan tidak menjalankan solver.</div>
      <div class="solver-form"><input id="solverName" placeholder="Nama solver / label"><input id="solverUrl" type="url" placeholder="https://solver.example/api"><div class="credential-input"><input id="solverKey" type="password" autocomplete="off" placeholder="API key"><button id="solverKeyShow" type="button" class="mini-btn">Show</button></div><textarea id="solverNote" rows="3" placeholder="Catatan / cara pemakaian (opsional)"></textarea><button id="solverAdd" class="primary" type="button">+ Add Solver</button></div>
      <div id="solverList" class="solver-list"></div></div>`;
    document.body.appendChild(d);
    d.querySelector('#solverGuideClose').onclick=()=>d.close();
    d.querySelector('#solverKeyShow').onclick=()=>{const i=d.querySelector('#solverKey');i.type=i.type==='password'?'text':'password';d.querySelector('#solverKeyShow').textContent=i.type==='password'?'Show':'Hide'};
    d.querySelector('#solverAdd').onclick=async()=>{
      if(!unlocked())return toast('Unlock vault dulu.');
      const name=d.querySelector('#solverName').value.trim(),url=d.querySelector('#solverUrl').value.trim(),key=d.querySelector('#solverKey').value.trim(),note=d.querySelector('#solverNote').value.trim();
      if(!name||!url)return toast('Isi nama dan URL solver.');
      const now=new Date().toISOString();
      getItems().push({id:crypto.randomUUID?.()||String(Date.now()),name,url,key,note,createdAt:now,updatedAt:now});
      try{
        await persist();
        ['#solverName','#solverUrl','#solverKey','#solverNote'].forEach(x=>d.querySelector(x).value='');
        d.querySelector('#solverKey').type='password';d.querySelector('#solverKeyShow').textContent='Show';
        renderList();toast('Solver disimpan ke vault terenkripsi.');
      }catch(e){console.error(e);toast('Gagal menyimpan Solver Guide.');}
    };
  }

  function renderList(){
    const el=document.getElementById('solverList');if(!el)return;
    if(!unlocked()){el.innerHTML='<div class="notice">Unlock vault untuk melihat Solver Guide.</div>';return}
    const items=getItems();
    el.innerHTML=items.length?items.map(x=>`<div class="solver-card" data-id="${esc(x.id)}"><div class="solver-card-head"><strong>${esc(x.name)}</strong><button class="solver-delete danger-btn small" type="button">Delete</button></div><div class="solver-line"><code>${esc(x.url)}</code><button class="solver-copy-url secondary small" type="button">Copy URL</button></div><div class="solver-line"><code class="solver-secret">••••••••••••</code><button class="solver-show secondary small" type="button">Show</button><button class="solver-copy-key secondary small" type="button">Copy Key</button></div>${x.note?`<p>${esc(x.note)}</p>`:''}</div>`).join(''):'<div class="notice">Belum ada solver tersimpan di vault ini.</div>';
    el.querySelectorAll('.solver-card').forEach(card=>{const item=items.find(x=>String(x.id)===card.dataset.id);if(!item)return;
      card.querySelector('.solver-copy-url').onclick=()=>copy(item.url);
      card.querySelector('.solver-copy-key').onclick=()=>copy(item.key);
      card.querySelector('.solver-show').onclick=e=>{const c=card.querySelector('.solver-secret');const hidden=c.textContent.startsWith('•');c.textContent=hidden?(item.key||'(empty)'):'••••••••••••';e.currentTarget.textContent=hidden?'Hide':'Show'};
      card.querySelector('.solver-delete').onclick=async()=>{
        if(!confirm(`Hapus Solver Guide "${item.name}"?`))return;
        const arr=getItems(),idx=arr.findIndex(x=>String(x.id)===String(item.id));if(idx>=0)arr.splice(idx,1);
        try{await persist();renderList();toast('Solver dihapus dari vault.')}catch(e){console.error(e);toast('Gagal menghapus Solver Guide.')}
      };
    });
  }

  async function openGuide(){
    if(!unlocked())return toast('Unlock vault dulu.');
    await migrateLegacy().catch(()=>{});
    renderList();document.getElementById('solverGuideDialog').showModal();
  }

  function ensureButton(){
    ensureDialog();const quick=document.querySelector('.quick-list');if(!quick||document.getElementById('solverGuideBtn'))return;
    const b=document.createElement('button');b.id='solverGuideBtn';b.type='button';b.innerHTML='⚙ <span>Solver Guide</span>';b.onclick=openGuide;
    const sync=document.getElementById('quickSyncBtn');quick.insertBefore(b,sync||null);
  }

  if(!document.getElementById('solverGuideStyles')){
    const s=document.createElement('style');s.id='solverGuideStyles';s.textContent='.solver-guide-modal{width:min(760px,calc(100vw - 24px))}.solver-form{display:grid;gap:9px;margin:12px 0 16px}.solver-list{display:grid;gap:10px;max-height:45vh;overflow:auto}.solver-card{padding:12px;border:1px solid #21462c;border-radius:10px;background:#07110a}.solver-card-head,.solver-line{display:flex;align-items:center;gap:8px;justify-content:space-between}.solver-line{margin-top:8px}.solver-line code{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}.solver-card p{margin:9px 0 0;color:#9aa7a0;font-size:12px;white-space:pre-wrap}';document.head.appendChild(s)
  }

  const old=window.render;
  if(typeof old==='function')window.render=function(){old();ensureButton()};
  ensureButton();document.addEventListener('DOMContentLoaded',ensureButton);
})();