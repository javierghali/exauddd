// EXAUDDD - Roblox account status checker (status only)
// Uses the stored session cookie to check whether Roblox recognizes the session.
// It does NOT solve/bypass CAPTCHA, Face Lock, 2FA, or other challenges.
(() => {
  const CHECK_STATUSES=["Valid","Invalid","Banned","Challenge","Error"];

  function normalizeText(el){return String(el?.textContent||"").replace(/\s+/g," ").trim().toLowerCase()}

  function cleanupQuickActions(){
    const quick=document.querySelector(".quick-list");
    if(!quick)return;

    // Keep exactly one canonical Owners -> Username action.
    const owners=[...quick.querySelectorAll("button,label")].filter(el=>normalizeText(el).includes("owners → username"));
    const canonical=document.getElementById("ownerSplitBtn")||owners[0]||null;
    owners.forEach(el=>{if(el!==canonical)el.remove()});

    // Preferred order: Export Username -> Owners -> Verify -> Sync.
    const exportUser=[...quick.querySelectorAll("button,label")].find(el=>normalizeText(el).includes("export username"));
    const verify=document.getElementById("verifyRobloxBtn");
    const sync=document.getElementById("quickSyncBtn");
    if(exportUser&&canonical)exportUser.insertAdjacentElement("afterend",canonical);
    if(canonical&&verify)canonical.insertAdjacentElement("afterend",verify);
    if(verify&&sync)verify.insertAdjacentElement("afterend",sync);
    else if(canonical&&sync)canonical.insertAdjacentElement("afterend",sync);
  }

  function ensureUi(){
    const quick=document.querySelector(".quick-list");
    if(!quick)return;
    let btn=document.getElementById("verifyRobloxBtn");
    if(!btn){
      btn=document.createElement("button");
      btn.id="verifyRobloxBtn";btn.type="button";
      btn.innerHTML='⌕ <span>Verify Roblox Status</span>';
      btn.onclick=verifyAll;
      quick.insertBefore(btn,document.getElementById("quickSyncBtn")||null);
    }
    cleanupQuickActions();
  }

  function normalizeCookie(raw){
    const v=String(raw||"").trim();
    if(!v)return "";
    const m=v.match(/(?:^|;\s*)\.ROBLOSECURITY=([^;]+)/i);
    return m?m[1].trim():v;
  }

  async function checkCookie(raw){
    const token=normalizeCookie(raw);
    if(!token)return {status:"Invalid",detail:"Cookie kosong"};
    try{
      const res=await fetch("https://users.roblox.com/v1/users/authenticated",{
        method:"GET",
        headers:{"Accept":"application/json","Cookie":".ROBLOSECURITY="+token},
        credentials:"omit"
      });
      const text=await res.text();
      let data={};try{data=text?JSON.parse(text):{}}catch{}
      if(res.ok&&data?.id)return {status:"Valid",detail:`Authenticated as ${data.name||data.id}`};
      if(res.status===401||res.status===403)return {status:"Invalid",detail:"Session ditolak / expired"};
      if(res.status===429)return {status:"Error",detail:"Rate limited; coba lagi nanti"};
      return {status:"Error",detail:`HTTP ${res.status}`};
    }catch(err){
      return {status:"Error",detail:"Browser/CORS memblokir pemeriksaan cookie. Checker perlu backend/worker same-origin."};
    }
  }

  async function verifyAll(){
    if(typeof masterKey==="undefined"||!masterKey){toast("Unlock vault dulu.");return}
    if(!Array.isArray(vault?.accounts)||!vault.accounts.length){toast("Tidak ada akun untuk diperiksa.");return}
    const btn=document.getElementById("verifyRobloxBtn");btn.disabled=true;
    const original=btn.innerHTML;btn.innerHTML='… <span>Checking...</span>';
    let valid=0,invalid=0,errors=0;
    try{
      for(let i=0;i<vault.accounts.length;i++){
        const a=vault.accounts[i];
        const r=await checkCookie(a.cookie);
        a.robloxCheck=r.status;
        a.robloxCheckDetail=r.detail;
        a.robloxCheckedAt=new Date().toISOString();
        if(r.status==="Valid"){a.status="Active";valid++}
        else if(r.status==="Invalid"){a.status="Inactive";invalid++}
        else errors++;
        if(i%20===19){render();await new Promise(r=>setTimeout(r,250))}
      }
      await saveLocalAndMaybeRemote();render();
      toast(`Check selesai: ${valid} valid, ${invalid} invalid, ${errors} error.`);
    }finally{btn.disabled=false;btn.innerHTML=original;cleanupQuickActions()}
  }

  window.checkRobloxCookieStatus=checkCookie;
  ensureUi();
  document.addEventListener("DOMContentLoaded",ensureUi,{once:true});
  setTimeout(cleanupQuickActions,250);
})();
