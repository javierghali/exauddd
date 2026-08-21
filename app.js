const LOCAL_VAULT_KEY="accountVaultV2.payload";
const SETTINGS_KEY="accountVaultV2.settings";
const AUTH_KEY="accountVaultV3.auth";
const enc=new TextEncoder(),dec=new TextDecoder();
let vault={accounts:[]},masterKey=null,currentSalt=null,deferredInstallPrompt=null;
const $=id=>document.getElementById(id);

function ensureAuthUi(){
  if(!$("authTopText")){
    const mode=$("modeText");
    if(mode){
      const sep=document.createElement("span");sep.className="auth-inline-sep";sep.textContent=" • ";
      const auth=document.createElement("span");auth.id="authTopText";auth.textContent="NOT SIGNED IN";
      mode.after(sep,auth);
    }
  }
  if(!$("authBox")){
    const form=$("settingsForm");
    const actions=form?.querySelector(".modal-actions");
    if(form&&actions){
      const box=document.createElement("section");
      box.id="authBox";
      box.innerHTML=`
        <div class="auth-box-title">Supabase Account</div>
        <div id="authSignedOut">
          <label class="auth-label">Email<input id="authEmail" type="email" autocomplete="email" placeholder="Email user Supabase"></label>
          <label class="auth-label">Password<input id="authPassword" type="password" autocomplete="current-password" placeholder="Password user Supabase"></label>
          <button id="signInBtn" type="button" class="primary full">Sign In</button>
        </div>
        <div id="authSignedIn" class="hidden">
          <div class="auth-signed-row">
            <div><div class="eyebrow">SIGNED IN</div><strong id="signedInEmail">—</strong></div>
            <button id="signOutBtn" type="button" class="secondary">Sign Out</button>
          </div>
        </div>`;
      form.insertBefore(box,actions);
      const style=document.createElement("style");
      style.textContent=`
        #authBox{margin-top:14px;padding:14px;border:1px solid #30363d;border-radius:12px;background:#0f1317}
        .auth-box-title{font-size:12px;font-weight:800;margin-bottom:11px;letter-spacing:.04em}
        .auth-label{display:grid;gap:6px;color:#c2c8ce;font-size:11px;font-weight:700;margin-bottom:10px}
        .auth-label input{width:100%}
        .auth-signed-row{display:flex;justify-content:space-between;align-items:center;gap:12px}
        #authTopText{color:#929ba4}.auth-inline-sep{color:#505862}`;
      document.head.appendChild(style);
    }
  }
}

function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2200)}
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
function getAuth(){try{return JSON.parse(sessionStorage.getItem(AUTH_KEY))||null}catch{return null}}
function saveAuth(a){if(a)sessionStorage.setItem(AUTH_KEY,JSON.stringify(a));else sessionStorage.removeItem(AUTH_KEY);updateAuthUi()}
function syncConfigured(){const s=getSettings();return Boolean(s.supabaseUrl&&s.supabaseAnonKey&&s.vaultId)}
function isSignedIn(){const a=getAuth();return Boolean(a?.access_token&&a?.user?.id)}
function normalizeAuth(data){return {...data,expires_at:Date.now()+Number(data.expires_in||3600)*1000}}

function updateAuthUi(){
  ensureAuthUi();
  const a=getAuth(),signed=Boolean(a?.access_token&&a?.user);
  if($("authTopText"))$("authTopText").textContent=signed?"SIGNED IN":"NOT SIGNED IN";
  if($("authSignedOut"))$("authSignedOut").classList.toggle("hidden",signed);
  if($("authSignedIn"))$("authSignedIn").classList.toggle("hidden",!signed);
  if(signed&&$("signedInEmail"))$("signedInEmail").textContent=a.user.email||a.user.id;
  updateSyncUi()
}
function updateSyncUi(){
  const configured=syncConfigured(),signed=isSignedIn();
  if(configured&&signed){
    $("modeText").textContent="ONLINE READY";
    $("syncStatusText").textContent="Authenticated";
    $("syncDescription").textContent="Supabase Auth + RLS aktif. Sync hanya untuk user yang sedang login."
  }else if(configured){
    $("modeText").textContent="AUTH REQUIRED";
    $("syncStatusText").textContent="Sign In Required";
    $("syncDescription").textContent="Supabase sudah dikonfigurasi. Buka Settings lalu Sign In."
  }else{
    $("modeText").textContent="LOCAL MODE";
    $("syncStatusText").textContent="Local Only";
    $("syncDescription").textContent="Data hanya tersimpan di perangkat ini."
  }
}

async function authRequest(path,options={}){
  const s=getSettings();
  if(!s.supabaseUrl||!s.supabaseAnonKey)throw new Error("Supabase URL/key belum disimpan");
  const url=s.supabaseUrl.replace(/\/$/,"")+"/auth/v1/"+path;
  const headers={apikey:s.supabaseAnonKey,"Content-Type":"application/json"};
  const a=getAuth();if(options.auth&&a?.access_token)headers.Authorization="Bearer "+a.access_token;
  const res=await fetch(url,{method:options.method||"POST",headers,body:options.body?JSON.stringify(options.body):undefined});
  const text=await res.text();let data={};
  try{data=text?JSON.parse(text):{}}catch{data={message:text}}
  if(!res.ok)throw new Error(data.msg||data.message||data.error_description||("HTTP "+res.status));
  return data
}
async function signIn(email,password){
  const data=await authRequest("token?grant_type=password",{body:{email,password}});
  saveAuth(normalizeAuth(data));return data
}
async function refreshAuth(){
  const a=getAuth();if(!a?.refresh_token)throw new Error("Session berakhir. Login ulang.");
  const data=await authRequest("token?grant_type=refresh_token",{body:{refresh_token:a.refresh_token}});
  saveAuth(normalizeAuth(data));return getAuth()
}
async function ensureValidAuth(){
  const a=getAuth();if(!a?.access_token)throw new Error("Belum login Supabase");
  if(!a.expires_at||a.expires_at-Date.now()<60000)return refreshAuth();
  return a
}
async function signOut(){
  try{await authRequest("logout",{auth:true,body:{}})}catch(e){console.warn(e)}
  saveAuth(null)
}

async function supabaseRequest(path,options={}){
  const s=getSettings();if(!syncConfigured())throw new Error("Sync belum dikonfigurasi");
  const a=await ensureValidAuth();
  const url=s.supabaseUrl.replace(/\/$/,"")+"/rest/v1/"+path;
  const headers={apikey:s.supabaseAnonKey,Authorization:"Bearer "+a.access_token,"Content-Type":"application/json",Prefer:options.prefer||""};
  let res=await fetch(url,{method:options.method||"GET",headers,body:options.body?JSON.stringify(options.body):undefined});
  if(res.status===401&&!options.retried){
    const fresh=await refreshAuth();headers.Authorization="Bearer "+fresh.access_token;
    res=await fetch(url,{method:options.method||"GET",headers,body:options.body?JSON.stringify(options.body):undefined})
  }
  const txt=await res.text();if(!res.ok)throw new Error(txt||("HTTP "+res.status));return txt?JSON.parse(txt):null
}
async function remotePull(){
  const s=getSettings();
  const rows=await supabaseRequest(`vaults?vault_id=eq.${encodeURIComponent(s.vaultId)}&select=payload,updated_at&limit=1`);
  if(!rows?.length)return null;
  const p=rows[0].payload;if(rows[0].updated_at&&!p.updated_at)p.updated_at=rows[0].updated_at;return p
}
async function remotePush(payload){
  const s=getSettings(),a=await ensureValidAuth();
  return supabaseRequest("vaults?on_conflict=user_id,vault_id",{
    method:"POST",prefer:"resolution=merge-duplicates,return=minimal",
    body:{user_id:a.user.id,vault_id:s.vaultId,payload,updated_at:new Date().toISOString()}
  })
}
async function saveLocalAndMaybeRemote(){
  const payload=await encryptVault();localStorage.setItem(LOCAL_VAULT_KEY,JSON.stringify(payload));
  if(syncConfigured()&&isSignedIn()){
    try{await remotePush(payload);$("modeText").textContent="SYNCED"}
    catch(e){console.error(e);$("modeText").textContent="LOCAL CHANGES";toast("Tersimpan lokal. Sync online gagal.")}
  }
}
async function unlock(password){
  let payload=null;
  if(syncConfigured()&&isSignedIn()){try{payload=await remotePull();if(payload)localStorage.setItem(LOCAL_VAULT_KEY,JSON.stringify(payload))}catch(e){console.warn(e)}}
  if(!payload){const raw=localStorage.getItem(LOCAL_VAULT_KEY);if(raw)payload=JSON.parse(raw)}
  if(!payload){currentSalt=crypto.getRandomValues(new Uint8Array(16));masterKey=await deriveKey(password,currentSalt);vault={accounts:[]};await saveLocalAndMaybeRemote()}
  else{const r=await decryptPayload(payload,password);masterKey=r.key;currentSalt=r.salt;vault=r.vault||{accounts:[]};if(!Array.isArray(vault.accounts))vault.accounts=[]}
  $("unlockView").classList.add("hidden");$("vaultView").classList.remove("hidden");$("lockBtn").disabled=false;render();toast("Vault terbuka.")
}
function lock(){masterKey=null;currentSalt=null;vault={accounts:[]};$("vaultView").classList.add("hidden");$("unlockView").classList.remove("hidden");$("lockBtn").disabled=true;$("masterPassword").value="";render()}
function mask(v){return v?"••••••••••":"—"}
function formatDate(v){try{return new Date(v).toLocaleString("id-ID",{dateStyle:"medium",timeStyle:"short"})}catch{return ""}}
function filtered(){
  const q=$("searchInput").value.trim().toLowerCase(),st=$("statusFilter").value,g=$("groupFilter").value;
  return vault.accounts.filter(a=>{const blob=[a.username,a.group,a.notes,a.status].join(" ").toLowerCase();return(!q||blob.includes(q))&&(!st||a.status===st)&&(!g||a.group===g)})
}
function updateStats(){
  $("statTotal").textContent=vault.accounts.length;$("statActive").textContent=vault.accounts.filter(a=>a.status==="Active").length;$("statCheck").textContent=vault.accounts.filter(a=>a.status==="Check").length;$("statInactive").textContent=vault.accounts.filter(a=>["Inactive","Banned"].includes(a.status)).length;
  const groups=[...new Set(vault.accounts.map(a=>a.group).filter(Boolean))];$("statGroups").textContent=groups.length;
  const gf=$("groupFilter"),current=gf.value;gf.innerHTML='<option value="">Semua Group</option>';groups.sort().forEach(g=>{const o=document.createElement("option");o.value=g;o.textContent=g;gf.append(o)});gf.value=current
}
function revealNode(value){
  const wrap=document.createElement("div");wrap.className="credential-row";const span=document.createElement("span");span.className="credential-value";span.textContent=mask(value);
  let shown=false;const btn=document.createElement("button");btn.type="button";btn.className="mini-btn";btn.textContent="Show";btn.onclick=()=>{shown=!shown;span.textContent=shown?(value||"—"):mask(value);btn.textContent=shown?"Hide":"Show"};wrap.append(span,btn);return wrap
}
function render(){
  if(!$("accountRows"))return;updateStats();updateAuthUi();
  const list=filtered();$("emptyState").classList.toggle("hidden",list.length>0);$("showingText").textContent=`Showing ${list.length} of ${vault.accounts.length} accounts`;
  const tbody=$("accountRows");tbody.innerHTML="";
  list.forEach(a=>{
    const tr=document.createElement("tr"),user=document.createElement("td");user.textContent=a.username||"—";
    const pass=document.createElement("td");pass.append(revealNode(a.password));const cookie=document.createElement("td");cookie.append(revealNode(a.cookie));
    const st=document.createElement("td"),pill=document.createElement("span");pill.className="status-pill";pill.textContent=a.status||"Check";st.append(pill);
    const group=document.createElement("td");group.textContent=a.group||"—";const notes=document.createElement("td");notes.textContent=a.notes||"—";const upd=document.createElement("td");upd.textContent=formatDate(a.updatedAt||a.createdAt);
    const act=document.createElement("td"),edit=document.createElement("button");edit.className="mini-btn";edit.textContent="Edit";edit.onclick=()=>openAccount(a);act.append(edit);tr.append(user,pass,cookie,st,group,notes,upd,act);tbody.append(tr)
  });
  const mobile=$("mobileList");mobile.innerHTML="";
  list.forEach(a=>{
    const card=document.createElement("article");card.className="mobile-account";const top=document.createElement("div");top.className="mobile-top";const left=document.createElement("div"),u=document.createElement("strong");u.textContent=a.username||"—";
    const meta=document.createElement("div");meta.className="mobile-meta";meta.textContent=`${a.status||"Check"} • ${a.group||"No group"}`;left.append(u,meta);const edit=document.createElement("button");edit.className="mini-btn";edit.textContent="Edit";edit.onclick=()=>openAccount(a);top.append(left,edit);card.append(top);
    [["Password",a.password],["Cookie",a.cookie],["Notes",a.notes||"—"]].forEach(([label,val])=>{const row=document.createElement("div");row.className="mobile-line";const l=document.createElement("strong");l.textContent=label;const v=document.createElement("div");if(label==="Password"||label==="Cookie")v.append(revealNode(val));else v.textContent=val;row.append(l,v);card.append(row)});mobile.append(card)
  })
}
function openAccount(a=null){
  $("accountForm").reset();$("accountId").value=a?.id||"";$("username").value=a?.username||"";$("password").value=a?.password||"";$("cookie").value=a?.cookie||"";$("status").value=a?.status||"Active";$("group").value=a?.group||"";$("notes").value=a?.notes||"";$("dialogTitle").textContent=a?"Edit Account":"Add Account";$("deleteBtn").classList.toggle("hidden",!a);["password","cookie"].forEach(id=>$(id).type="password");document.querySelectorAll(".reveal-input").forEach(b=>b.textContent="Show");$("accountDialog").showModal()
}
async function doSync(){
  if(!syncConfigured()){openSettings();toast("Atur Supabase dulu.");return}
  if(!isSignedIn()){openSettings();toast("Login Supabase dulu.");return}
  if(!masterKey){toast("Unlock vault dulu.");return}
  try{
    const remote=await remotePull();
    if(remote){const localRaw=localStorage.getItem(LOCAL_VAULT_KEY),local=localRaw?JSON.parse(localRaw):null;const rt=new Date(remote.updated_at||0).getTime(),lt=new Date(local?.updated_at||0).getTime();if(rt>lt){localStorage.setItem(LOCAL_VAULT_KEY,JSON.stringify(remote));toast("Data online lebih baru. Lock lalu unlock untuk memuat.");return}}
    const payload=await encryptVault();await remotePush(payload);localStorage.setItem(LOCAL_VAULT_KEY,JSON.stringify(payload));$("modeText").textContent="SYNCED";toast("Sync selesai.")
  }catch(e){console.error(e);toast("Sync gagal: "+String(e.message||e).slice(0,120))}
}
function openSettings(){const s=getSettings();$("supabaseUrl").value=s.supabaseUrl||"";$("supabaseAnonKey").value=s.supabaseAnonKey||"";$("vaultId").value=s.vaultId||"";$("settingsDialog").showModal();updateAuthUi()}

$("unlockForm").addEventListener("submit",async e=>{e.preventDefault();const p=$("masterPassword").value;if(p.length<8){toast("Master password minimal 8 karakter.");return}try{await unlock(p);$("masterPassword").value=""}catch(e){console.error(e);toast("Password salah atau vault rusak.")}});
$("toggleMaster").onclick=()=>{const i=$("masterPassword"),show=i.type==="password";i.type=show?"text":"password";$("toggleMaster").textContent=show?"Hide":"Show"};
$("lockBtn").onclick=lock;$("sideLockBtn").onclick=lock;
["heroAddBtn","panelAddBtn","quickAddBtn","emptyAddBtn"].forEach(id=>$(id).onclick=()=>openAccount());
$("closeAccountDialog").onclick=()=>$("accountDialog").close();$("cancelBtn").onclick=()=>$("accountDialog").close();
$("searchInput").oninput=render;$("statusFilter").onchange=render;$("groupFilter").onchange=render;$("resetFilters").onclick=()=>{$("searchInput").value="";$("statusFilter").value="";$("groupFilter").value="";render()};
document.querySelectorAll(".reveal-input").forEach(btn=>btn.onclick=()=>{const input=$(btn.dataset.target),show=input.type==="password";input.type=show?"text":"password";btn.textContent=show?"Hide":"Show"});
$("accountForm").addEventListener("submit",async e=>{e.preventDefault();const id=$("accountId").value,now=new Date().toISOString();const obj={id:id||crypto.randomUUID(),username:$("username").value.trim(),password:$("password").value,cookie:$("cookie").value,status:$("status").value,group:$("group").value.trim(),notes:$("notes").value.trim(),createdAt:now,updatedAt:now};if(id){const i=vault.accounts.findIndex(x=>x.id===id);if(i>=0){obj.createdAt=vault.accounts[i].createdAt||now;vault.accounts[i]=obj}}else vault.accounts.unshift(obj);await saveLocalAndMaybeRemote();$("accountDialog").close();render();toast(id?"Account diperbarui.":"Account ditambahkan.")});
$("deleteBtn").onclick=async()=>{const id=$("accountId").value;if(!id||!confirm("Hapus account ini?"))return;vault.accounts=vault.accounts.filter(a=>a.id!==id);await saveLocalAndMaybeRemote();$("accountDialog").close();render();toast("Account dihapus.")};
$("exportBtn").onclick=async()=>{const payload=await encryptVault();const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`silverback-vault-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url)};
$("importInput").onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{const payload=JSON.parse(await file.text());if(!payload.salt||!payload.iv||!payload.data)throw new Error("invalid");localStorage.setItem(LOCAL_VAULT_KEY,JSON.stringify(payload));lock();toast("Backup dimuat. Unlock dengan password backup.")}catch{toast("Backup tidak valid.")}e.target.value=""};
["heroSyncBtn","quickSyncBtn","navSync"].forEach(id=>$(id).onclick=doSync);
$("settingsBtn").onclick=openSettings;$("navSettings").onclick=openSettings;$("enableSyncBtn").onclick=openSettings;
$("closeSettingsDialog").onclick=()=>$("settingsDialog").close();$("cancelSettingsBtn").onclick=()=>$("settingsDialog").close();
$("settingsForm").onsubmit=e=>{e.preventDefault();saveSettings({supabaseUrl:$("supabaseUrl").value.trim(),supabaseAnonKey:$("supabaseAnonKey").value.trim(),vaultId:$("vaultId").value.trim()});$("settingsDialog").close();toast(syncConfigured()?"Online sync dikonfigurasi.":"Settings disimpan.")};
$("disconnectBtn").onclick=()=>{saveSettings({});saveAuth(null);$("settingsDialog").close();toast("Mode local-only aktif.")};

ensureAuthUi();
$("signInBtn").onclick=async()=>{const email=$("authEmail").value.trim(),password=$("authPassword").value;if(!syncConfigured()){toast("Save Supabase URL/key dulu.");return}if(!email||!password){toast("Isi email dan password Supabase.");return}try{await signIn(email,password);$("authPassword").value="";toast("Login berhasil.");updateAuthUi()}catch(e){console.error(e);toast("Login gagal: "+String(e.message||e).slice(0,120))}};
$("signOutBtn").onclick=async()=>{await signOut();toast("Sign out selesai.");updateAuthUi()};
$("menuBtn").onclick=()=>$("sidebar").classList.toggle("open");
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstallPrompt=e;$("installBtn").classList.remove("hidden")});
$("installBtn").onclick=async()=>{if(!deferredInstallPrompt)return;deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;$("installBtn").classList.add("hidden")};
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.error));
updateAuthUi();render();
