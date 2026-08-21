// Silverback Vault V3 - extended import support
// Supports encrypted Silverback JSON backups and text account lists.

(function(){
  const input=document.getElementById("importInput");
  if(!input)return;

  input.accept=".json,.txt,application/json,text/plain";

  function parseAccountText(text){
    const rows=[];
    const rejected=[];
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

      const now=new Date().toISOString();
      rows.push({id:crypto.randomUUID(),username,password,cookie,status:"Active",group:"Imported",notes:"Imported from TXT",createdAt:now,updatedAt:now});
    });

    return {rows,rejected};
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
      const {rows,rejected}=parseAccountText(text);
      if(!rows.length)throw new Error("Tidak ada baris username:password:cookie yang terbaca");

      const existing=new Map(vault.accounts.map(a=>[String(a.username||"").toLowerCase(),a]));
      let added=0,updated=0;

      for(const row of rows){
        const key=row.username.toLowerCase();
        const old=existing.get(key);
        if(old){
          old.password=row.password;
          old.cookie=row.cookie;
          old.updatedAt=new Date().toISOString();
          if(!old.group)old.group="Imported";
          updated++;
        }else{
          vault.accounts.push(row);
          existing.set(key,row);
          added++;
        }
      }

      await saveLocalAndMaybeRemote();
      render();
      const bad=rejected.length?` • ${rejected.length} baris dilewati`:"";
      toast(`Import selesai: ${added} baru, ${updated} diperbarui${bad}`);
    }catch(err){
      console.error("Import failed",err);
      toast("Import gagal: "+String(err.message||err).slice(0,120));
    }finally{
      e.target.value="";
    }
  };
})();
