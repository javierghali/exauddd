// Silverback Vault V3 - Paste UPC + Export UPC + Export Username
// UPC format: username;password;cookie (one account per line).
(() => {
  const normUser=v=>String(v||'').trim().toLowerCase();
  const normCookie=v=>String(v||'').trim();
  const exactKey=(u,p,c)=>`${normUser(u)}\u0000${String(p||'')}\u0000${normCookie(c)}`;

  function selectedAccountIds(){
    return new Set([...document.querySelectorAll('[data-account-select]:checked')]
      .map(el=>el.dataset.accountSelect).filter(Boolean));
  }

  function parseUPC(text){
    const lines=String(text||'').replace(/^\uFEFF/,'').split(/\r?\n/);
    const rows=[]; const rejected=[]; const duplicateInPaste=[];
    const seenExact=new Set(); const seenUsers=new Map(); const seenCookies=new Map();

    lines.forEach((raw,index)=>{
      const line=raw.trim(); if(!line)return;
      const first=line.indexOf(';');
      const second=first>=0?line.indexOf(';',first+1):-1;
      if(first<=0||second<=first+1){rejected.push(index+1);return;}

      const username=line.slice(0,first).trim();
      const password=line.slice(first+1,second);
      const cookie=line.slice(second+1).trim();
      if(!username||!cookie){rejected.push(index+1);return;}

      const ukey=normUser(username), ckey=normCookie(cookie), ekey=exactKey(username,password,cookie);
      if(seenExact.has(ekey)){duplicateInPaste.push(index+1);return;}

      if(seenUsers.has(ukey)){
        const prev=seenUsers.get(ukey); const old=rows[prev];
        if(old)seenExact.delete(exactKey(old.username,old.password,old.cookie));
        rows[prev]=null;
      }
      if(seenCookies.has(ckey)&&seenCookies.get(ckey)!==ukey){duplicateInPaste.push(index+1);return;}

      const now=new Date().toISOString();
      const row={id:crypto.randomUUID(),username,password,cookie,status:'Active',group:'Imported',notes:'Pasted UPC',createdAt:now,updatedAt:now};
      const pos=rows.length; rows.push(row); seenUsers.set(ukey,pos); seenCookies.set(ckey,ukey); seenExact.add(ekey);
    });
    return {rows:rows.filter(Boolean),rejected,duplicateInPaste};
  }

  async function applyPastedUPC(text){
    if(!masterKey)throw new Error('Unlock vault dulu');
    const {rows,rejected,duplicateInPaste}=parseUPC(text);
    if(!rows.length)throw new Error('Tidak ada baris username;password;cookie yang terbaca');

    const existingByUser=new Map(), existingByCookie=new Map(), existingExact=new Set();
    vault.accounts.forEach(a=>{
      const u=normUser(a.username), c=normCookie(a.cookie);
      if(u&&!existingByUser.has(u))existingByUser.set(u,a);
      if(c&&!existingByCookie.has(c))existingByCookie.set(c,a);
      if(u&&c)existingExact.add(exactKey(a.username,a.password,a.cookie));
    });

    let added=0,updated=0,skippedExact=0,cookieConflicts=0;
    for(const row of rows){
      const u=normUser(row.username), c=normCookie(row.cookie), e=exactKey(row.username,row.password,row.cookie);
      if(existingExact.has(e)){skippedExact++;continue;}
      const old=existingByUser.get(u), cookieOwner=existingByCookie.get(c);
      if(cookieOwner&&cookieOwner!==old&&normUser(cookieOwner.username)!==u){cookieConflicts++;continue;}

      if(old){
        const oldCookie=normCookie(old.cookie);
        if(oldCookie&&existingByCookie.get(oldCookie)===old)existingByCookie.delete(oldCookie);
        existingExact.delete(exactKey(old.username,old.password,old.cookie));
        old.password=row.password; old.cookie=row.cookie; old.updatedAt=new Date().toISOString();
        if(!old.group)old.group='Imported';
        existingByCookie.set(c,old); existingExact.add(e); updated++;
      }else{
        vault.accounts.push(row); existingByUser.set(u,row); existingByCookie.set(c,row); existingExact.add(e); added++;
      }
    }

    if(added||updated)await saveLocalAndMaybeRemote();
    render();
    const parts=[`${added} baru`,`${updated} diperbarui`];
    if(skippedExact)parts.push(`${skippedExact} duplikat dilewati`);
    if(duplicateInPaste.length)parts.push(`${duplicateInPaste.length} duplikat di paste dilewati`);
    if(cookieConflicts)parts.push(`${cookieConflicts} konflik cookie dilewati`);
    if(rejected.length)parts.push(`${rejected.length} baris invalid`);
    return parts.join(' • ');
  }

  function scopeAccounts(name){
    const scope=document.querySelector(`input[name="${name}"]:checked`)?.value||'all';
    if(scope==='selected'){
      const ids=selectedAccountIds();
      return vault.accounts.filter(a=>ids.has(a.id));
    }
    return [...vault.accounts];
  }

  function saveTextFile(text,filename){
    const blob=new Blob([text],{type:'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }

  function ensureDialogs(){
    if(!document.getElementById('pasteUpcDialog')){
      const d=document.createElement('dialog'); d.id='pasteUpcDialog';
      d.innerHTML=`<div class="modal paste-upc-modal">
        <div class="modal-head"><div><div class="eyebrow">ACCOUNTS</div><h2>Paste UPC</h2></div><button id="closePasteUpc" type="button" class="icon-btn">×</button></div>
        <div class="notice">Tempel satu akun per baris dengan format <b>username;password;cookie</b>. Duplicate otomatis dilewati atau diperbarui.</div>
        <textarea id="pasteUpcText" rows="14" spellcheck="false" autocomplete="off" placeholder="username;password;cookie\nusername2;password2;cookie2"></textarea>
        <div class="modal-actions"><span class="spacer"></span><button id="cancelPasteUpc" type="button" class="secondary">Cancel</button><button id="importPasteUpc" type="button" class="primary">Import Paste</button></div>
      </div>`;
      document.body.appendChild(d);
      d.querySelector('#closePasteUpc').onclick=()=>d.close(); d.querySelector('#cancelPasteUpc').onclick=()=>d.close();
      d.querySelector('#importPasteUpc').onclick=async()=>{
        const btn=d.querySelector('#importPasteUpc'); btn.disabled=true;
        try{const summary=await applyPastedUPC(d.querySelector('#pasteUpcText').value); d.querySelector('#pasteUpcText').value=''; d.close(); toast(`Paste selesai: ${summary}`)}
        catch(e){console.error(e);toast('Paste gagal: '+String(e.message||e).slice(0,120))}
        finally{btn.disabled=false}
      };
    }

    if(!document.getElementById('exportUpcDialog')){
      const d=document.createElement('dialog'); d.id='exportUpcDialog';
      d.innerHTML=`<div class="modal paste-upc-modal">
        <div class="modal-head"><div><div class="eyebrow">EXPORT</div><h2>Export UPC</h2></div><button id="closeExportUpc" type="button" class="icon-btn">×</button></div>
        <div class="notice">Export menghasilkan TXT plaintext berisi username;password;cookie. Simpan file hasil export dengan aman.</div>
        <div class="export-scope-row"><label><input type="radio" name="exportScope" value="all" checked> All accounts</label><label><input type="radio" name="exportScope" value="selected"> Selected items</label></div>
        <div id="exportUpcCount" class="notice"></div>
        <div class="modal-actions"><span class="spacer"></span><button id="cancelExportUpc" type="button" class="secondary">Cancel</button><button id="downloadExportUpc" type="button" class="primary">Export TXT</button></div>
      </div>`;
      document.body.appendChild(d);
      d.querySelector('#closeExportUpc').onclick=()=>d.close(); d.querySelector('#cancelExportUpc').onclick=()=>d.close();
      d.addEventListener('change',refreshExportCount);
      d.querySelector('#downloadExportUpc').onclick=downloadUPC;
    }

    if(!document.getElementById('exportUsernameDialog')){
      const d=document.createElement('dialog'); d.id='exportUsernameDialog';
      d.innerHTML=`<div class="modal paste-upc-modal">
        <div class="modal-head"><div><div class="eyebrow">EXPORT</div><h2>Export Username</h2></div><button id="closeExportUsername" type="button" class="icon-btn">×</button></div>
        <div class="notice">Hasil TXT hanya berisi username, satu username per baris. Password dan cookie tidak ikut diexport.</div>
        <div class="export-scope-row"><label><input type="radio" name="usernameExportScope" value="all" checked> All accounts</label><label><input type="radio" name="usernameExportScope" value="selected"> Selected items</label></div>
        <div id="exportUsernameCount" class="notice"></div>
        <div class="modal-actions"><span class="spacer"></span><button id="cancelExportUsername" type="button" class="secondary">Cancel</button><button id="downloadExportUsername" type="button" class="primary">Export Username TXT</button></div>
      </div>`;
      document.body.appendChild(d);
      d.querySelector('#closeExportUsername').onclick=()=>d.close();
      d.querySelector('#cancelExportUsername').onclick=()=>d.close();
      d.addEventListener('change',refreshUsernameExportCount);
      d.querySelector('#downloadExportUsername').onclick=downloadUsernames;
    }

    if(!document.getElementById('pasteExportStyles')){
      const s=document.createElement('style'); s.id='pasteExportStyles'; s.textContent=`
        .paste-upc-modal{width:min(760px,calc(100vw - 24px))}.paste-upc-modal textarea{width:100%;resize:vertical;min-height:260px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
        .export-scope-row{display:flex;gap:18px;flex-wrap:wrap;margin:14px 0}.export-scope-row label{display:flex;align-items:center;gap:8px}
      `; document.head.appendChild(s);
    }
  }

  function exportAccountsForScope(){return scopeAccounts('exportScope')}
  function exportUsernameAccountsForScope(){return scopeAccounts('usernameExportScope')}

  function refreshExportCount(){
    const el=document.getElementById('exportUpcCount'); if(!el)return;
    const list=exportAccountsForScope(); el.textContent=`${list.length} akun akan diexport.`;
  }

  function refreshUsernameExportCount(){
    const el=document.getElementById('exportUsernameCount'); if(!el)return;
    const list=exportUsernameAccountsForScope().filter(a=>String(a.username||'').trim());
    el.textContent=`${list.length} username akan diexport.`;
  }

  function downloadUPC(){
    if(!masterKey){toast('Unlock vault dulu.');return}
    const list=exportAccountsForScope();
    if(!list.length){toast('Tidak ada akun untuk diexport.');return}
    const text=list.map(a=>`${String(a.username||'')};${String(a.password||'')};${String(a.cookie||'')}`).join('\n');
    const stamp=new Date().toISOString().replace(/[:.]/g,'-');
    saveTextFile(text,`silverback-upc-${list.length}-${stamp}.txt`);
    toast(`${list.length} akun diexport.`);
  }

  function downloadUsernames(){
    if(!masterKey){toast('Unlock vault dulu.');return}
    const list=exportUsernameAccountsForScope();
    const usernames=[...new Set(list.map(a=>String(a.username||'').trim()).filter(Boolean))];
    if(!usernames.length){toast('Tidak ada username untuk diexport.');return}
    const stamp=new Date().toISOString().replace(/[:.]/g,'-');
    saveTextFile(usernames.join('\n'),`silverback-usernames-${usernames.length}-${stamp}.txt`);
    toast(`${usernames.length} username diexport.`);
  }

  function ensureButtons(){
    ensureDialogs();
    const quick=document.querySelector('.quick-list');
    if(quick&&!document.getElementById('pasteUpcBtn')){
      const paste=document.createElement('button'); paste.id='pasteUpcBtn'; paste.innerHTML='⌨ <span>Paste UPC</span>'; paste.onclick=()=>{if(!masterKey){toast('Unlock vault dulu.');return}document.getElementById('pasteUpcDialog').showModal();setTimeout(()=>document.getElementById('pasteUpcText')?.focus(),50)};
      const exp=document.createElement('button'); exp.id='exportUpcBtn'; exp.innerHTML='⇩ <span>Export UPC</span>'; exp.onclick=()=>{if(!masterKey){toast('Unlock vault dulu.');return}refreshExportCount();document.getElementById('exportUpcDialog').showModal()};
      const expUser=document.createElement('button'); expUser.id='exportUsernameBtn'; expUser.innerHTML='⇩ <span>Export Username</span>'; expUser.onclick=()=>{if(!masterKey){toast('Unlock vault dulu.');return}refreshUsernameExportCount();document.getElementById('exportUsernameDialog').showModal()};
      const sync=document.getElementById('quickSyncBtn'); quick.insertBefore(paste,sync||null); quick.insertBefore(exp,sync||null); quick.insertBefore(expUser,sync||null);
    }else if(quick&&!document.getElementById('exportUsernameBtn')){
      const expUser=document.createElement('button'); expUser.id='exportUsernameBtn'; expUser.innerHTML='⇩ <span>Export Username</span>'; expUser.onclick=()=>{if(!masterKey){toast('Unlock vault dulu.');return}refreshUsernameExportCount();document.getElementById('exportUsernameDialog').showModal()};
      const sync=document.getElementById('quickSyncBtn'); quick.insertBefore(expUser,sync||null);
    }
  }

  const baseRender=render;
  render=function(){baseRender();ensureButtons()};
  ensureButtons();
})();
