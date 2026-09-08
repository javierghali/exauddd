// EXAUDDD Vault V3 — optional email credentials + extended export
// Data stays inside the encrypted vault payload. Export is plaintext only when explicitly requested.
(() => {
  const $=id=>document.getElementById(id);
  const unlocked=()=>{try{return Boolean(masterKey&&vault&&Array.isArray(vault.accounts))}catch{return false}};
  const mask=v=>v?'••••••••••':'—';

  function addFields(){
    const form=$('accountForm');
    if(!form||$('accountEmail'))return;
    const grid=form.querySelector('.form-grid');
    const notes=$('notes')?.closest('label');
    if(!grid||!notes)return;
    const email=document.createElement('label');
    email.innerHTML='Email <input id="accountEmail" type="email" autocomplete="off" placeholder="Optional — boleh dikosongkan">';
    const ep=document.createElement('label');
    ep.innerHTML='Email Password <div class="credential-input"><input id="emailPassword" type="password" autocomplete="off" placeholder="Optional — boleh dikosongkan"><button type="button" class="mini-btn" id="revealEmailPassword">Show</button></div>';
    grid.insertBefore(email,notes);grid.insertBefore(ep,notes);
    $('revealEmailPassword').onclick=()=>{const i=$('emailPassword'),show=i.type==='password';i.type=show?'text':'password';$('revealEmailPassword').textContent=show?'Hide':'Show'};
  }

  addFields();

  // Populate the two optional fields whenever Add/Edit Account opens.
  const baseOpen=window.openAccount;
  if(typeof baseOpen==='function'){
    window.openAccount=function(a=null){
      baseOpen(a);addFields();
      $('accountEmail').value=a?.email||'';
      $('emailPassword').value=a?.emailPassword||'';
      $('emailPassword').type='password';$('revealEmailPassword').textContent='Show';
    };
  }

  // Replace the original account submit path so email/emailPassword are saved in the same encrypted account object.
  const form=$('accountForm');
  if(form){
    form.addEventListener('submit',async e=>{
      e.preventDefault();e.stopImmediatePropagation();
      if(!unlocked()){toast('Unlock vault dulu.');return}
      const id=$('accountId').value,now=new Date().toISOString();
      const previous=id?vault.accounts.find(x=>x.id===id):null;
      const obj={
        id:id||crypto.randomUUID(),username:$('username').value.trim(),password:$('password').value,cookie:$('cookie').value,
        email:$('accountEmail').value.trim(),emailPassword:$('emailPassword').value,
        status:$('status').value,group:$('group').value.trim(),notes:$('notes').value.trim(),
        createdAt:previous?.createdAt||now,updatedAt:now
      };
      if(id){const i=vault.accounts.findIndex(x=>x.id===id);if(i>=0)vault.accounts[i]=obj;else vault.accounts.unshift(obj)}else vault.accounts.unshift(obj);
      await saveLocalAndMaybeRemote();$('accountDialog').close();render();toast(id?'Account diperbarui.':'Account ditambahkan.');
    },true);
  }

  function revealNode(value){
    const wrap=document.createElement('div');wrap.className='credential-row';
    const span=document.createElement('span');span.className='credential-value';span.textContent=mask(value);
    let shown=false;const btn=document.createElement('button');btn.type='button';btn.className='mini-btn';btn.textContent='Show';
    btn.onclick=()=>{shown=!shown;span.textContent=shown?(value||'—'):mask(value);btn.textContent=shown?'Hide':'Show'};
    wrap.append(span,btn);return wrap;
  }

  // Add Email + Email Password columns without changing existing username/password/cookie columns.
  const baseRender=window.render;
  if(typeof baseRender==='function'){
    window.render=function(){
      baseRender();
      const table=$('accountRows')?.closest('table');
      const head=table?.querySelector('thead tr');
      if(head&&!head.querySelector('[data-email-head]')){
        const status=[...head.children].find(th=>th.textContent.trim()==='Status');
        const eh=document.createElement('th');eh.dataset.emailHead='1';eh.textContent='Email';
        const ph=document.createElement('th');ph.dataset.emailPassHead='1';ph.textContent='Email Pass';
        head.insertBefore(eh,status);head.insertBefore(ph,status);
      }
      const list=typeof filtered==='function'?filtered():vault.accounts;
      [...($('accountRows')?.children||[])].forEach((tr,i)=>{
        if(tr.querySelector('[data-email-cell]'))return;
        const a=list[i];if(!a)return;const statusCell=tr.children[3];
        const ec=document.createElement('td');ec.dataset.emailCell='1';ec.textContent=a.email||'—';
        const pc=document.createElement('td');pc.dataset.emailPassCell='1';pc.append(revealNode(a.emailPassword));
        tr.insertBefore(ec,statusCell);tr.insertBefore(pc,statusCell);
      });
    };
  }

  function selectedIds(){return new Set([...document.querySelectorAll('[data-account-select]:checked')].map(x=>x.dataset.accountSelect).filter(Boolean))}
  function scoped(){const mode=document.querySelector('input[name="extendedExportScope"]:checked')?.value||'all';if(mode==='selected'){const ids=selectedIds();return vault.accounts.filter(a=>ids.has(a.id))}return [...vault.accounts]}
  async function saveText(text,name){const blob=new Blob(['\uFEFF'+text],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000)}
  function ensureExport(){
    if(!$('exportExtendedDialog')){
      const d=document.createElement('dialog');d.id='exportExtendedDialog';d.innerHTML=`<div class="modal paste-upc-modal"><div class="modal-head"><div><div class="eyebrow">EXPORT</div><h2>Export UPC + Email</h2></div><button id="closeExtendedExport" type="button" class="icon-btn">×</button></div><div class="notice">Format: <b>user:pass:cookie:email:emailpass</b>. Email dan email password bersifat optional; akun yang belum punya data email tetap ikut diexport dengan field kosong.</div><div class="export-scope-row"><label><input type="radio" name="extendedExportScope" value="all" checked> All accounts</label><label><input type="radio" name="extendedExportScope" value="selected"> Selected items</label></div><div id="extendedExportCount" class="notice"></div><div class="modal-actions"><span class="spacer"></span><button id="cancelExtendedExport" type="button" class="secondary">Cancel</button><button id="downloadExtendedExport" type="button" class="primary">Export TXT</button></div></div>`;document.body.appendChild(d);
      $('closeExtendedExport').onclick=() => d.close();$('cancelExtendedExport').onclick=()=>d.close();
      d.addEventListener('change',()=>{$('extendedExportCount').textContent=`${scoped().length} akun akan diexport.`});
      $('downloadExtendedExport').onclick=async()=>{if(!unlocked()){toast('Unlock vault dulu.');return}const list=scoped();if(!list.length){toast('Tidak ada akun untuk diexport.');return}const text=list.map(a=>[a.username,a.password,a.cookie,a.email,a.emailPassword].map(v=>String(v||'')).join(':')).join('\r\n');const stamp=new Date().toISOString().slice(0,10);await saveText(text,`winter-upc-email-${list.length}-${stamp}.txt`);d.close();toast(`${list.length} akun diexport format user:pass:cookie:email:pass.`)};
    }
    const quick=document.querySelector('.quick-list');
    if(quick&&!$('exportExtendedBtn')){const b=document.createElement('button');b.id='exportExtendedBtn';b.innerHTML='⇩ <span>Export UPC + Email</span>';b.onclick=()=>{if(!unlocked()){toast('Unlock vault dulu.');return}ensureExport();$('extendedExportCount').textContent=`${scoped().length} akun akan diexport.`;$('exportExtendedDialog').showModal()};quick.insertBefore(b,$('quickSyncBtn')||null)}
  }
  ensureExport();
  try{render()}catch(e){console.warn(e)}
})();
