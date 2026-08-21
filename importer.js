// Silverback Vault V3 - extended import support
// Supports encrypted Silverback JSON backups and text account lists.
// TXT importer prevents duplicate usernames, duplicate cookies/sessions, and exact duplicate rows.

(function(){
  const input=document.getElementById("importInput");
  if(!input)return;

  input.accept=".json,.txt,application/json,text/plain";

  const normUser=v=>String(v||"").trim().toLowerCase();
  const normCookie=v=>String(v||"").trim();
  const exactKey=(u,p,c)=>`${normUser(u)}\u0000${String(p||"")}\u0000${normCookie(c)}`;

  function parseAccountText(text){
    const rows=[];
    const rejected=[];
    const duplicateInFile=[];
    const seenExact=new Set();
    const seenUsers=new Map();
    const seenCookies=new Map();
    const lines=text.replace(/^\uFEFF/,"").split(/\r?\n/);

    lines.forEach((raw,index)=>{
      const line=raw.trim();
      if(!line)return;

      const first=line.indexOf(":");
      const second=first>=0?line.indexOf(":",first+1):-1;
      if(first<=0||second<=first+1){rejected.push(index+1);return;}

      const username=line.slice(0,first).trim();
      const password=line.slice(first+1,second);
      const cookie=line.slice(second+1).trim();
      if(!username||!cookie){rejected.push(index+1);return;}

      const ukey=normUser(username);
      const ckey=normCookie(cookie);
      const ekey=exactKey(username,password,cookie);

      if(seenExact.has(ekey)){
        duplicateInFile.push(index+1);
        return;
      }

      if(seenUsers.has(ukey)){
        const prevIndex=seenUsers.get(ukey);
        const old=rows[prevIndex];
        if(old) seenExact.delete(exactKey(old.username,old.password,old.cookie));
        rows[prevIndex]=null;
      }

      if(seenCookies.has(ckey) && seenCookies.get(ckey)!==ukey){
        duplicateInFile.push(index+1);
        return;
      }

      const now=new Date().toISOString();
      const row={id:crypto.randomUUID(),username,password,cookie,status:"Active",group:"Imported",notes:"Imported from TXT",createdAt:now,updatedAt:now};
      const pos=rows.length;
      rows.push(row);
      seenUsers.set(ukey,pos);
      seenCookies.set(ckey,ukey);
      seenExact.add(ekey);
    });

    return {rows:rows.filter(Boolean),rejected,duplicateInFile};
  }

  input.onchange=async e=>{
    const file=e.target.files?.[0];
    if(!file)return;

    try{
      const text=await file.text();
      const trimmed=text.trim();

      if(trimmed.startsWith("{")){
        const payload=JSON.parse(trimmed);
        if(!payload.salt||!payload.iv||!payload.data)throw new Error("JSON bukan backup Silverback yang valid");
        localStorage.setItem(LOCAL_VAULT_KEY,JSON.stringify(payload));
        lock();
        toast("Backup JSON dimuat. Unlock dengan master password backup.");
        return;
      }

      if(!masterKey)throw new Error("Unlock vault sebelum import TXT");
      const {rows,rejected,duplicateInFile}=parseAccountText(text);
      if(!rows.length)throw new Error("Tidak ada baris username:password:cookie yang terbaca");

      const existingByUser=new Map();
      const existingByCookie=new Map();
      const existingExact=new Set();

      vault.accounts.forEach(a=>{
        const ukey=normUser(a.username);
        const ckey=normCookie(a.cookie);
        if(ukey&&!existingByUser.has(ukey))existingByUser.set(ukey,a);
        if(ckey&&!existingByCookie.has(ckey))existingByCookie.set(ckey,a);
        if(ukey&&ckey)existingExact.add(exactKey(a.username,a.password,a.cookie));
      });

      let added=0,updated=0,skippedExact=0,cookieConflicts=0;

      for(const row of rows){
        const ukey=normUser(row.username);
        const ckey=normCookie(row.cookie);
        const ekey=exactKey(row.username,row.password,row.cookie);

        if(existingExact.has(ekey)){
          skippedExact++;
          continue;
        }

        const old=existingByUser.get(ukey);
        const cookieOwner=existingByCookie.get(ckey);

        if(cookieOwner && cookieOwner!==old && normUser(cookieOwner.username)!==ukey){
          cookieConflicts++;
          continue;
        }

        if(old){
          const oldCookie=normCookie(old.cookie);
          if(oldCookie && existingByCookie.get(oldCookie)===old) existingByCookie.delete(oldCookie);
          existingExact.delete(exactKey(old.username,old.password,old.cookie));

          old.password=row.password;
          old.cookie=row.cookie;
          old.updatedAt=new Date().toISOString();
          if(!old.group)old.group="Imported";

          existingByCookie.set(ckey,old);
          existingExact.add(ekey);
          updated++;
        }else{
          vault.accounts.push(row);
          existingByUser.set(ukey,row);
          existingByCookie.set(ckey,row);
          existingExact.add(ekey);
          added++;
        }
      }

      if(added||updated) await saveLocalAndMaybeRemote();
      render();

      const parts=[`${added} baru`,`${updated} diperbarui`];
      if(skippedExact)parts.push(`${skippedExact} duplikat dilewati`);
      if(duplicateInFile.length)parts.push(`${duplicateInFile.length} duplikat di file dilewati`);
      if(cookieConflicts)parts.push(`${cookieConflicts} konflik cookie dilewati`);
      if(rejected.length)parts.push(`${rejected.length} baris invalid`);
      toast(`Import selesai: ${parts.join(" • ")}`);
    }catch(err){
      console.error("Import failed",err);
      toast("Import gagal: "+String(err.message||err).slice(0,120));
    }finally{
      e.target.value="";
    }
  };
})();

// Load the optional group manager without changing the main HTML bundle.
(() => {
  if(document.querySelector('script[data-silverback-groups]')) return;
  const s=document.createElement('script');
  s.src='./groups.js';
  s.dataset.silverbackGroups='1';
  document.body.appendChild(s);
})();
