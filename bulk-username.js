// Silverback Vault V3 - bulk username detector/selector
(() => {
  const MAX_BULK_USERNAME = 1000;

  const normalize = value => String(value || '').trim().toLowerCase();

  function parseUsernames(text){
    const out=[];
    const seen=new Set();
    String(text||'')
      .replace(/\r/g,'\n')
      .split(/[\s,;]+/)
      .map(x=>x.trim())
      .filter(Boolean)
      .forEach(name=>{
        const key=normalize(name);
        if(!key||seen.has(key))return;
        seen.add(key);
        out.push(name);
      });
    return out.slice(0,MAX_BULK_USERNAME);
  }

  function ensureUi(){
    const toolbar=document.getElementById('bulkToolbar');
    if(!toolbar||document.getElementById('bulkUsernameBtn'))return;

    const btn=document.createElement('button');
    btn.id='bulkUsernameBtn';
    btn.type='button';
    btn.className='secondary small';
    btn.textContent='Bulk Username';
    const firstSelect=document.getElementById('bulkStatus');
    if(firstSelect) firstSelect.insertAdjacentElement('beforebegin',btn);
    else toolbar.appendChild(btn);

    const dialog=document.createElement('dialog');
    dialog.id='bulkUsernameDialog';
    dialog.innerHTML=`
      <form method="dialog" class="modal" id="bulkUsernameForm">
        <div class="modal-head">
          <div><div class="eyebrow">BULK SELECT</div><h2>Bulk Username</h2></div>
          <button type="button" class="icon-btn" id="closeBulkUsername">×</button>
        </div>
        <div class="notice">Paste hingga ${MAX_BULK_USERNAME} username. Bisa dipisah spasi, baris baru, koma, atau titik koma (;).</div>
        <label class="full">Usernames
          <textarea id="bulkUsernameInput" rows="10" autocomplete="off" placeholder="username1\nusername2\nusername3"></textarea>
        </label>
        <div id="bulkUsernameResult" class="notice hidden"></div>
        <div class="modal-actions">
          <button type="button" class="secondary" id="bulkUsernameClear">Clear</button>
          <span class="spacer"></span>
          <button type="button" class="secondary" id="bulkUsernameCancel">Cancel</button>
          <button type="button" class="primary" id="bulkUsernameDetect">Detect & Select</button>
        </div>
      </form>`;
    document.body.appendChild(dialog);

    btn.addEventListener('click',()=>{
      if(!masterKey){toast('Unlock vault dulu.');return}
      dialog.showModal();
      setTimeout(()=>document.getElementById('bulkUsernameInput')?.focus(),50);
    });
    document.getElementById('closeBulkUsername').addEventListener('click',()=>dialog.close());
    document.getElementById('bulkUsernameCancel').addEventListener('click',()=>dialog.close());
    document.getElementById('bulkUsernameClear').addEventListener('click',()=>{
      document.getElementById('bulkUsernameInput').value='';
      const result=document.getElementById('bulkUsernameResult');
      result.textContent='';result.classList.add('hidden');
    });
    document.getElementById('bulkUsernameDetect').addEventListener('click',detectAndSelect);
  }

  function clearFiltersAndRender(){
    const search=document.getElementById('searchInput');
    const group=document.getElementById('groupFilter');
    const status=document.getElementById('statusFilter');
    if(search)search.value='';
    if(group)group.value='';
    if(status)status.value='';
    render();
  }

  function dispatchCheckbox(id){
    const escaped=(window.CSS&&CSS.escape)?CSS.escape(id):String(id).replace(/["\\]/g,'\\$&');
    const cb=document.querySelector(`[data-account-select="${escaped}"]`);
    if(!cb)return false;
    if(!cb.checked){
      cb.checked=true;
      cb.dispatchEvent(new Event('change',{bubbles:true}));
    }
    return true;
  }

  function detectAndSelect(){
    const input=document.getElementById('bulkUsernameInput');
    const requested=parseUsernames(input?.value||'');
    if(!requested.length){toast('Paste username dulu.');return}

    const byUser=new Map();
    vault.accounts.forEach(account=>{
      const key=normalize(account.username);
      if(key&&!byUser.has(key))byUser.set(key,account);
    });

    const matched=[];
    const missing=[];
    requested.forEach(name=>{
      const account=byUser.get(normalize(name));
      if(account)matched.push(account);
      else missing.push(name);
    });

    clearFiltersAndRender();

    let selected=0;
    matched.slice(0,MAX_BULK_USERNAME).forEach(account=>{
      if(dispatchCheckbox(account.id))selected++;
    });

    const result=document.getElementById('bulkUsernameResult');
    if(result){
      result.classList.remove('hidden');
      const sample=missing.slice(0,8).join(', ');
      result.textContent=`${selected} akun ditemukan & dipilih • ${missing.length} username tidak ditemukan${sample?` • Tidak ditemukan: ${sample}${missing.length>8?'…':''}`:''}`;
    }

    toast(`${selected} akun otomatis dipilih.${missing.length?` ${missing.length} tidak ditemukan.`:''}`);
    if(selected){
      setTimeout(()=>{
        document.getElementById('bulkUsernameDialog')?.close();
        document.getElementById('bulkToolbar')?.scrollIntoView({behavior:'smooth',block:'center'});
      },500);
    }
  }

  ensureUi();
  const baseRender=render;
  render=function(){baseRender();ensureUi()};
})();
