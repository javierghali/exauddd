
const LOCAL_VAULT_KEY="accountVaultV2.payload";
const SETTINGS_KEY="accountVaultV2.settings";
const enc=new TextEncoder(),dec=new TextDecoder();
let vault={accounts:[]},masterKey=null,currentSalt=null,deferredInstallPrompt=null;
const $=id=>document.getElementById(id);

function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),1800)}
function bytesToB64(bytes){let s="";bytes.forEach(b=>s+=String.fromCharCode(b));return btoa(s)}
function b64ToBytes(s){const raw=atob(s);return Uint8Array.from(raw,c=>c.charCodeAt(0))}
async function deriveKey(password,salt){
  const base=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveKey"]);
  return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:300000,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"])
}
async function encryptVault(){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const data=enc.encode(JSON.stringify(vault));
  const cipher=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},masterKey,data));
  return {version:3,kdf:"PBKDF2-SHA256",iterations:300000,cipher:"AES-GCM-256",salt:bytesToB64(currentSalt),iv:bytesToB64(iv),data:bytesToB64(cipher),updated_at:new Date().toISOString()}
}
async function decryptPayload(payload,password){
  const salt=b64ToBytes(payload.salt),key=await deriveKey(password,salt);
  const clear=await crypto.subtle.decrypt({name:"AES-GCM",iv:b64ToBytes(payload.iv)},key,b64ToBytes(payload.data));
  return {key,salt,vault:JSON.parse(dec.decode(clear))}
}
function getSettings(){try{return JSON.parse(localStorage.getItem(SETTINGS_KEY))||{}}catch{return {}}}
function saveSettings(s){localStorage.setItem(SETTINGS_KEY,JSON.stringify(s));updateSyncUi()}
function syncConfigured(){const s=getSettings();return Boolean(s.supabaseUrl&&s.supabaseAnonKey&&s.vaultId)}
function updateSyncUi(){
  const configured=syncConfigured();
  $("modeText").textContent=configured?"ONLINE READY":"LOCAL MODE";
  $("syncStatusText").textContent=configured?"Online Ready":"Local Only";
  $("syncDescription").textContent=configured?"Supabase sudah dikonfigurasi. Tekan Sync Now untuk sinkronisasi.":"Data hanya tersimpan di perangkat ini.";
}
async function supabaseRequest(path,options={}){
  const s=getSettings();if(!syncConfigured())throw new Error("Sync belum dikonfigurasi");
  const url=s.supabaseUrl.replace(/\/$/,"")+"/rest/v1/"+path;
  const headers={"apikey":s.supabaseAnonKey,"Authorization":"Bearer "+s.supabaseAnonKey,"Content-Type":"application/json","Prefer":options.prefer||""};
  const res=await fetch(url,{method:options.method||"GET",headers,body:options.body?JSON.stringify(options.body):undefined});
  if(!res.ok)throw new Error(await res.text()||("HTTP "+res.status));
  const txt=await res.text();return txt?JSON.parse(txt):null
}
async function remotePull(){const s=getSettings();const rows=await supabaseRequest(`vaults?vault_id=eq.${encodeURIComponent(s.vaultId)}&select=payload&limit=1`);return rows&&rows.length?rows[0].payload:null}
async function remotePush(payload){const s=getSettings();return supabaseRequest("vaults?on_conflict=vault_id",{method:"POST",prefer:"resolution=merge-duplicates,return=minimal",body:{vault_id:s.vaultId,payload,updated_at:new Date().toISOString()}})}
async function saveLocalAndMaybeRemote(){
  const payload=await encryptVault();localStorage.setItem(LOCAL_VAULT_KEY,JSON.stringify(payload));
  if(syncConfigured()){try{await remotePush(payload);$("modeText").textContent="SYNCED"}catch(e){console.error(e);$("modeText").textContent="LOCAL CHANGES";toast("Tersimpan lokal. Sync online gagal.")}}
}
async function unlock(password){
  let payload=null;
  if(syncConfigured()){try{payload=await remotePull();if(payload)localStorage.setItem(LOCAL_VAULT_KEY,JSON.stringify(payload))}catch(e){console.warn(e)}}
  if(!payload){const raw=localStorage.getItem(LOCAL_VAULT_KEY);if(raw)payload=JSON.parse(raw)}
  if(!payload){
    currentSalt=crypto.getRandomValues(new Uint8Array(16));masterKey=await deriveKey(password,currentSalt);vault={accounts:[]};await saveLocalAndMaybeRemote()
  }else{
    const r=await decryptPayload(payload,password);masterKey=r.key;currentSalt=r.salt;vault=r.vault||{accounts:[]};if(!Array.isArray(vault.accounts))vault.accounts=[]
  }
  $("unlockView").classList.add("hidden");$("vaultView").classList.remove("hidden");$("lockBtn").disabled=false;render();toast("Vault terbuka.")
}
function lock(){
  masterKey=null;currentSalt=null;vault={accounts:[]};$("vaultView").classList.add("hidden");$("unlockView").classList.remove("hidden");$("lockBtn").disabled=true;$("masterPassword").value="";render()
}
function mask(v){return v?"••••••••••":"—"}
function formatDate(v){try{return new Date(v).toLocaleString("id-ID",{dateStyle:"medium",timeStyle:"short"})}catch{return ""}}
function filtered(){
  const q=$("searchInput").value.trim().toLowerCase(),st=$("statusFilter").value,g=$("groupFilter").value;
  return vault.accounts.filter(a=>{
    const blob=[a.username,a.group,a.notes,a.status].join(" ").toLowerCase();
    return (!q||blob.includes(q))&&(!st||a.status===st)&&(!g||a.group===g)
  })
}
function updateStats(){
  $("statTotal").textContent=vault.accounts.length;
  $("statActive").textContent=vault.accounts.filter(a=>a.status==="Active").length;
  $("statCheck").textContent=vault.accounts.filter(a=>a.status==="Check").length;
  $("statInactive").textContent=vault.accounts.filter(a=>["Inactive","Banned"].includes(a.status)).length;
  const groups=[...new Set(vault.accounts.map(a=>a.group).filter(Boolean))];
  $("statGroups").textContent=groups.length;
  const gf=$("groupFilter"),current=gf.value;gf.innerHTML='<option value="">Semua Group</option>';
  groups.sort().forEach(g=>{const o=document.createElement("option");o.value=g;o.textContent=g;gf.append(o)});gf.value=current
}
function revealNode(value){
  const wrap=document.createElement("div");wrap.className="credential-row";
  const span=document.createElement("span");span.className="credential-value";span.textContent=mask(value);
  let shown=false;const btn=document.createElement("button");btn.type="button";btn.className="mini-btn";btn.textContent="Show";
  btn.onclick=()=>{shown=!shown;span.textContent=shown?(value||"—"):mask(value);btn.textContent=shown?"Hide":"Show"};
  wrap.append(span,btn);return wrap
}
function render(){
  if(!$("accountRows"))return;updateStats();updateSyncUi();
  const list=filtered();$("emptyState").classList.toggle("hidden",list.length>0);$("showingText").textContent=`Showing ${list.length} of ${vault.accounts.length} accounts`;
  const tbody=$("accountRows");tbody.innerHTML="";
  list.forEach(a=>{
    const tr=document.createElement("tr");
    const user=document.createElement("td");user.textContent=a.username||"—";
    const pass=document.createElement("td");pass.append(revealNode(a.password));
    const cookie=document.createElement("td");cookie.append(revealNode(a.cookie));
    const st=document.createElement("td"),pill=document.createElement("span");pill.className="status-pill";pill.textContent=a.status||"Check";st.append(pill);
    const group=document.createElement("td");group.textContent=a.group||"—";
    const notes=document.createElement("td");notes.textContent=a.notes||"—";
    const upd=document.createElement("td");upd.textContent=formatDate(a.updatedAt||a.createdAt);
    const act=document.createElement("td"),edit=document.createElement("button");edit.className="mini-btn";edit.textContent="Edit";edit.onclick=()=>openAccount(a);act.append(edit);
    tr.append(user,pass,cookie,st,group,notes,upd,act);tbody.append(tr)
  });

  const mobile=$("mobileList");mobile.innerHTML="";
  list.forEach(a=>{
    const card=document.createElement("article");card.className="mobile-account";
    const top=document.createElement("div");top.className="mobile-top";
    const left=document.createElement("div"),u=document.createElement("strong");u.textContent=a.username||"—";
    const meta=document.createElement("div");meta.className="mobile-meta";meta.textContent=`${a.status||"Check"} • ${a.group||"No group"}`;left.append(u,meta);
    const edit=document.createElement("button");edit.className="mini-btn";edit.textContent="Edit";edit.onclick=()=>openAccount(a);top.append(left,edit);card.append(top);
    [["Password",a.password],["Cookie",a.cookie],["Notes",a.notes||"—"]].forEach(([label,val])=>{
      const row=document.createElement("div");row.className="mobile-line";
      const l=document.createElement("strong");l.textContent=label;const v=document.createElement("div");
      if(label==="Password"||label==="Cookie")v.append(revealNode(val));else v.textContent=val;row.append(l,v);card.append(row)
    });mobile.append(card)
  })
}
function openAccount(a=null){
  $("accountForm").reset();$("accountId").value=a?.id||"";$("username").value=a?.username||"";$("password").value=a?.password||"";$("cookie").value=a?.cookie||"";$("status").value=a?.status||"Active";$("group").value=a?.group||"";$("notes").value=a?.notes||"";$("dialogTitle").textContent=a?"Edit Account":"Add Account";$("deleteBtn").classList.toggle("hidden",!a);["password","cookie"].forEach(id=>$(id).type="password");document.querySelectorAll(".reveal-input").forEach(b=>b.textContent="Show");$("accountDialog").showModal()
}
async function doSync(){
  if(!syncConfigured()){openSettings();toast("Atur Supabase dulu.");return}
  if(!masterKey){toast("Unlock vault dulu.");return}
  try{
    const remote=await remotePull();
    if(remote){
      const localRaw=localStorage.getItem(LOCAL_VAULT_KEY),local=localRaw?JSON.parse(localRaw):null;
      const rt=new Date(remote.updated_at||0).getTime(),lt=new Date(local?.updated_at||0).getTime();
      if(rt>lt){localStorage.setItem(LOCAL_VAULT_KEY,JSON.stringify(remote));toast("Data online lebih baru. Lock lalu unlock untuk memuat.");return}
    }
    const payload=await encryptVault();await remotePush(payload);localStorage.setItem(LOCAL_VAULT_KEY,JSON.stringify(payload));$("modeText").textContent="SYNCED";toast("Sync selesai.")
  }catch(e){console.error(e);toast("Sync gagal. Cek Settings.")}
}
function openSettings(){
  const s=getSettings();$("supabaseUrl").value=s.supabaseUrl||"";$("supabaseAnonKey").value=s.supabaseAnonKey||"";$("vaultId").value=s.vaultId||"";$("settingsDialog").showModal()
}

$("unlockForm").addEventListener("submit",async e=>{e.preventDefault();const p=$("masterPassword").value;if(p.length<8){toast("Master password minimal 8 karakter.");return}try{await unlock(p);$("masterPassword").value=""}catch(e){console.error(e);toast("Password salah atau vault rusak.")}});
$("toggleMaster").onclick=()=>{const i=$("masterPassword"),show=i.type==="password";i.type=show?"text":"password";$("toggleMaster").textContent=show?"Hide":"Show"};
$("lockBtn").onclick=lock;$("sideLockBtn").onclick=lock;
["heroAddBtn","panelAddBtn","quickAddBtn","emptyAddBtn"].forEach(id=>$(id).onclick=()=>openAccount());
$("closeAccountDialog").onclick=()=>$("accountDialog").close();$("cancelBtn").onclick=()=>$("accountDialog").close();
$("searchInput").oninput=render;$("statusFilter").onchange=render;$("groupFilter").onchange=render;
$("resetFilters").onclick=()=>{$("searchInput").value="";$("statusFilter").value="";$("groupFilter").value="";render()};
document.querySelectorAll(".reveal-input").forEach(btn=>btn.onclick=()=>{const input=$(btn.dataset.target),show=input.type==="password";input.type=show?"text":"password";btn.textContent=show?"Hide":"Show"});
$("accountForm").addEventListener("submit",async e=>{
  e.preventDefault();const id=$("accountId").value,now=new Date().toISOString();
  const obj={id:id||crypto.randomUUID(),username:$("username").value.trim(),password:$("password").value,cookie:$("cookie").value,status:$("status").value,group:$("group").value.trim(),notes:$("notes").value.trim(),createdAt:now,updatedAt:now};
  if(id){const i=vault.accounts.findIndex(x=>x.id===id);if(i>=0){obj.createdAt=vault.accounts[i].createdAt||now;vault.accounts[i]=obj}}else vault.accounts.unshift(obj);
  await saveLocalAndMaybeRemote();$("accountDialog").close();render();toast(id?"Account diperbarui.":"Account ditambahkan.")
});
$("deleteBtn").onclick=async()=>{const id=$("accountId").value;if(!id||!confirm("Hapus account ini?"))return;vault.accounts=vault.accounts.filter(a=>a.id!==id);await saveLocalAndMaybeRemote();$("accountDialog").close();render();toast("Account dihapus.")};
$("exportBtn").onclick=async()=>{const payload=await encryptVault();const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`silverback-vault-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url)};
$("importInput").onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{const payload=JSON.parse(await file.text());if(!payload.salt||!payload.iv||!payload.data)throw new Error("invalid");localStorage.setItem(LOCAL_VAULT_KEY,JSON.stringify(payload));lock();toast("Backup dimuat. Unlock dengan password backup.")}catch{toast("Backup tidak valid.")}e.target.value=""};
["heroSyncBtn","quickSyncBtn","navSync"].forEach(id=>$(id).onclick=doSync);
$("settingsBtn").onclick=openSettings;$("navSettings").onclick=openSettings;$("enableSyncBtn").onclick=openSettings;
$("closeSettingsDialog").onclick=()=>$("settingsDialog").close();$("cancelSettingsBtn").onclick=()=>$("settingsDialog").close();
$("settingsForm").onsubmit=e=>{e.preventDefault();saveSettings({supabaseUrl:$("supabaseUrl").value.trim(),supabaseAnonKey:$("supabaseAnonKey").value.trim(),vaultId:$("vaultId").value.trim()});$("settingsDialog").close();toast(syncConfigured()?"Online sync dikonfigurasi.":"Settings disimpan.")};
$("disconnectBtn").onclick=()=>{saveSettings({});$("settingsDialog").close();toast("Mode local-only aktif.")};
$("menuBtn").onclick=()=>$("sidebar").classList.toggle("open");
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstallPrompt=e;$("installBtn").classList.remove("hidden")});
$("installBtn").onclick=async()=>{if(!deferredInstallPrompt)return;deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;$("installBtn").classList.add("hidden")};
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.error));
updateSyncUi();render();
