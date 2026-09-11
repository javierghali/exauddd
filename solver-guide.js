// EXAUDDD Vault - Solver Guide (encrypted vault reference)
// Stores reference entries inside the encrypted EXAUDDD vault so they can follow Supabase ciphertext sync.
// Legacy localStorage entries are migrated after unlock. This feature only stores/copies references; it does not run a solver.
(() => {
  const LEGACY_STORE='exauddd_solver_guides_v1';
  let editingId=null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
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
      return false;
    }
  }

  function resetForm(){
    const d=document.getElementById('solverGuideDialog');if(!d)return;
    editingId=null;
    ['#solverName','#solverUrl','#solverKey','#solverNote'].forEach(x=>{const el=d.querySelector(x);if(el)el.value=''});
    const key=d.querySelector('#solverKey');if(key)key.type='password';
    const show=d.querySelector('#solverKeyShow');if(show)show.textContent='Show';
    const save=d.querySelector('#solverAdd');if(save)save.textContent='+ Add Solver';
    const cancel=d.querySelector('#solverCancelEdit');if(cancel)cancel.classList.add('hidden');
  }

  function startEdit(item){
    const d=document.getElementById('solverGuideDialog');if(!d||!item)return;
    editingId=String(item.id);
    d.querySelector('#solverName').value=item.name||'';
    d.querySelector('#solverUrl').value=item.url||'';
    d.querySelector('#solverKey').value=item.key||'';
    d.querySelector('#solverKey').type='password';
    d.querySelector('#solverKeyShow').textContent='Show';
    d.querySelector('#solverNote').value=item.note||'';
    d.querySelector('#solverAdd').textContent='Save Changes';
    d.querySelector('#solverCancelEdit').classList.remove('hidden');
    d.querySelector('#solverName').focus({preventScroll:true});
    d.querySelector('.solver-form').scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  async function saveForm(){
    if(!unlocked())return toast('Unlock vault dulu.');
    const d=document.getElementById('solverGuideDialog');if(!d)return;
    const name=d.querySelector('#solverName').value.trim(),url=d.querySelector('#solverUrl').value.trim(),key=d.querySelector('#solverKey').value.trim(),note=d.querySelector('#solverNote').value.trim();
    if(!name||!url)return toast('Isi nama dan URL solver.');
    const items=getItems(),now=new Date().toISOString();

    if(editingId){
      const item=items.find(x=>String(x.id)===editingId);
      if(!item){resetForm();return toast('Data solver tidak ditemukan.');}
      item.name=name;item.url=url;item.key=key;item.note=note;item.updatedAt=now;
      try{await persist();resetForm();renderList();toast('Solver berhasil diedit dan disync.')}catch(e){console.error(e);toast('Gagal menyimpan perubahan Solver Guide.')}
      return;
    }

    items.push({id:crypto.randomUUID?.()||String(Date.now()),name,url,key,note,createdAt:now,updatedAt:now});
    try{await persist();resetForm();renderList();toast('Solver disimpan ke vault terenkripsi.')}catch(e){console.error(e);toast('Gagal menyimpan Solver Guide.')}
  }

  function ensureDialog(){
    if(document.getElementById('solverGuideDialog'))return;
    const d=document.createElement('dialog');d.id='solverGuideDialog';
    d.innerHTML=`<div class="modal solver-guide-modal"><div class="modal-head"><div><div class="eyebrow">ENCRYPTED REFERENCE VAULT</div><h2>Solver Guide</h2></div><button id="solverGuideClose" class="icon-btn" type="button">×</button></div>
      <div class="notice">URL, key, dan catatan disimpan di dalam vault terenkripsi. Jika Supabase Sync aktif, data ikut tersinkron sebagai ciphertext dan dapat muncul di device lain setelah login + unlock dengan master password yang sama. Fitur ini hanya menyimpan/copy referensi dan tidak menjalankan solver.</div>
      <div class="solver-form"><input id="solverName" placeholder="Nama solver / label"><input id="solverUrl" type="url" placeholder="https://solver.example/api"><div class="credential-input"><input id="solverKey" type="password" autocomplete="off" placeholder="API key"><button id="solverKeyShow" type="button" class="mini-btn">Show</button></div><textarea id="solverNote" rows="3" placeholder="Catatan / cara pemakaian (opsional)"></textarea><div class="solver-form-actions"><button id="solverCancelEdit" class="secondary hidden" type="button">Cancel Edit</button><button id="solverAdd" class="primary" type="button">+ Add Solver</button></div></div>
      <div id="solverList" class="solver-list"></div></div>`;
    document.body.appendChild(d);
    d.querySelector('#solverGuideClose').onclick=()=>{resetForm();d.close()};
    d.querySelector('#solverKeyShow').onclick=()=>{const i=d.querySelector('#solverKey');i.type=i.type==='password'?'text':'password';d.querySelector('#solverKeyShow').textContent=i.type==='password'?'Show':'Hide'};
    d.querySelector('#solverAdd').onclick=saveForm;
    d.querySelector('#solverCancelEdit').onclick=()=>{resetForm();toast('Edit dibatalkan.')};
    d.addEventListener('cancel',resetForm);
  }

  function renderList(){
    const el=document.getElementById('solverList');if(!el)return;
    if(!unlocked()){el.innerHTML='<div class="notice">Unlock vault untuk melihat Solver Guide.</div>';return}
    const items=getItems();
    el.innerHTML=items.length?items.map(x=>`<div class="solver-card" data-id="${esc(x.id)}"><div class="solver-card-head"><strong>${esc(x.name)}</strong><div class="solver-card-actions"><button class="solver-edit secondary small" type="button">Edit</button><button class="solver-delete danger-btn small" type="button">Delete</button></div></div><div class="solver-line"><code>${esc(x.url)}</code><button class="solver-copy-url secondary small" type="button">Copy URL</button></div><div class="solver-line"><code class="solver-secret">••••••••••••</code><button class="solver-show secondary small" type="button">Show</button><button class="solver-copy-key secondary small" type="button">Copy Key</button></div>${x.note?`<p>${esc(x.note)}</p>`:''}</div>`).join(''):'<div class="notice">Belum ada solver tersimpan di vault ini.</div>';
    el.querySelectorAll('.solver-card').forEach(card=>{const item=items.find(x=>String(x.id)===card.dataset.id);if(!item)return;
      card.querySelector('.solver-edit').onclick=()=>startEdit(item);
      card.querySelector('.solver-copy-url').onclick=()=>copy(item.url);
      card.querySelector('.solver-copy-key').onclick=()=>copy(item.key);
      card.querySelector('.solver-show').onclick=e=>{const c=card.querySelector('.solver-secret');const hidden=c.textContent.startsWith('•');c.textContent=hidden?(item.key||'(empty)'):'••••••••••••';e.currentTarget.textContent=hidden?'Hide':'Show'};
      card.querySelector('.solver-delete').onclick=async()=>{
        if(!confirm(`Hapus Solver Guide "${item.name}"?`))return;
        const arr=getItems(),idx=arr.findIndex(x=>String(x.id)===String(item.id));if(idx>=0)arr.splice(idx,1);
        try{await persist();if(editingId===String(item.id))resetForm();renderList();toast('Solver dihapus dari vault.')}catch(e){console.error(e);toast('Gagal menghapus Solver Guide.')}
      };
    });
  }

  async function openGuide(){
    if(!unlocked())return toast('Unlock vault dulu.');
    await migrateLegacy().catch(()=>{});
    resetForm();renderList();document.getElementById('solverGuideDialog').showModal();
  }

  function ensureButton(){
    ensureDialog();const quick=document.querySelector('.quick-list');if(!quick||document.getElementById('solverGuideBtn'))return;
    const b=document.createElement('button');b.id='solverGuideBtn';b.type='button';b.innerHTML='⚙ <span>Solver Guide</span>';b.onclick=openGuide;
    const sync=document.getElementById('quickSyncBtn');quick.insertBefore(b,sync||null);
  }

  if(!document.getElementById('solverGuideStyles')){
    const s=document.createElement('style');s.id='solverGuideStyles';s.textContent=`
      #solverGuideDialog{position:fixed;inset:0;margin:0;padding:24px;border:0;background:transparent;max-width:none;max-height:none;width:100vw;height:100vh;overflow:hidden;box-sizing:border-box;font-family:"Inter",ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      #solverGuideDialog[open]{display:grid;place-items:center}
      #solverGuideDialog::backdrop{background:rgba(0,0,0,.72);backdrop-filter:blur(1.5px)}
      .solver-guide-modal{box-sizing:border-box;width:min(720px,calc(100vw - 48px));max-width:720px;max-height:min(84vh,790px);overflow:hidden;display:flex;flex-direction:column;margin:0!important;border-radius:14px;font-family:inherit}
      .solver-guide-modal .modal-head{flex:0 0 auto}.solver-guide-modal .modal-head h2{font-weight:700;letter-spacing:-.02em}
      .solver-guide-modal .eyebrow{font-weight:700;letter-spacing:.08em}
      .solver-guide-modal .notice{flex:0 0 auto;line-height:1.5}
      .solver-form{display:grid;grid-template-columns:1fr;gap:10px;margin:12px 0 16px;flex:0 0 auto}
      .solver-form input,.solver-form textarea,.solver-form .credential-input,.solver-form button{width:100%;box-sizing:border-box;min-width:0;font-family:inherit}
      .solver-form input,.solver-form textarea{font-weight:400}
      .solver-form .credential-input{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:stretch}
      .solver-form .credential-input input{min-width:0}.solver-form .credential-input .mini-btn{width:auto;min-width:58px}
      .solver-form-actions{display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px}.solver-form-actions .hidden{display:none!important}
      .solver-list{display:grid;gap:10px;overflow:auto;min-height:0;max-height:none;padding-right:3px}
      .solver-card{padding:12px;border:1px solid #21462c;border-radius:10px;background:#07110a;min-width:0}
      .solver-card-head,.solver-line{display:flex;align-items:center;gap:8px;justify-content:space-between;min-width:0}.solver-card-head strong{font-weight:700}
      .solver-card-actions{display:flex;gap:8px;flex:0 0 auto}.solver-line{margin-top:8px}
      .solver-line code{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
      .solver-card p{margin:9px 0 0;color:#9aa7a0;font-size:12px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}
      .solver-card-head button,.solver-line button{flex:0 0 auto;font-family:inherit;font-weight:600}
      @media(max-width:900px){.solver-guide-modal{width:min(680px,calc(100vw - 36px));max-height:86vh}}
      @media(max-width:640px){
        #solverGuideDialog{padding:12px}
        .solver-guide-modal{width:100%;max-width:none;max-height:calc(100vh - 24px);border-radius:12px}
        .solver-guide-modal .notice{font-size:10px;line-height:1.45}
        .solver-card-head{align-items:flex-start}.solver-card-actions{flex-wrap:wrap;justify-content:flex-end}
        .solver-line{align-items:stretch;flex-wrap:wrap}.solver-line code{flex:1 1 100%;white-space:normal;overflow-wrap:anywhere}.solver-line button{flex:1 1 auto}
        .solver-form-actions{grid-template-columns:1fr}.solver-form-actions .secondary{order:2}
      }
      @media(max-height:700px){.solver-guide-modal{max-height:calc(100vh - 28px)}.solver-form{gap:7px;margin:8px 0 10px}.solver-form textarea{min-height:64px;max-height:90px}}
    `;document.head.appendChild(s)
  }

  const old=window.render;
  if(typeof old==='function')window.render=function(){old();ensureButton()};
  ensureButton();document.addEventListener('DOMContentLoaded',ensureButton);
})();