// EXAUDDD Vault - ZekeHub read-only dashboard bridge
// Integration settings are stored inside the encrypted vault so they can sync across devices.
(() => {
  const LEGACY_KEY='exauddd_zekehub_script_key_v1';
  const WS_BASE='wss://backend.zekehub.com';
  const DIRECT_TOKEN_URL='https://zekehub.com/api/adoptme/ws-token';
  let ws=null, accounts=[], totalStats=null;

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const fmt=n=>{const x=Number(n);return Number.isFinite(x)?x.toLocaleString('en-US'):'—'};
  const fmtDate=v=>{if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleString('id-ID')};
  const normalizeAccount=a=>({username:a?.username||'—',bucks:a?.bucks,agePotions:a?.agePotions,tinyAgePotions:a?.tinyAgePotions,recyclerTickets:a?.recyclerTickets,totalPets:a?.totalPets,totalEggs:a?.totalEggs,lastUpdate:a?.lastUpdate,isActive:Boolean(a?.isActive??a?.active)});

  function cfg(){
    if(typeof vault==='undefined'||!vault)return {};
    vault.integrations=vault.integrations||{};
    vault.integrations.zekehub=vault.integrations.zekehub||{};
    return vault.integrations.zekehub;
  }
  async function saveCfg(next){
    if(typeof masterKey==='undefined'||!masterKey)throw new Error('Unlock vault dulu.');
    const c=cfg();Object.assign(c,next,{updatedAt:new Date().toISOString()});
    await saveLocalAndMaybeRemote();
  }
  async function migrateLegacy(){
    if(typeof masterKey==='undefined'||!masterKey)return;
    const old=localStorage.getItem(LEGACY_KEY);const c=cfg();
    if(old&&!c.scriptKey){c.scriptKey=old;localStorage.removeItem(LEGACY_KEY);await saveLocalAndMaybeRemote();}
  }

  async function gunzip(bytes){const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));return await new Response(stream).text()}
  function setStatus(text,state='idle'){const el=document.getElementById('zekeStatusText'),dot=document.getElementById('zekeStatusDot');if(el)el.textContent=text;if(dot)dot.dataset.state=state}

  function ensureSidebar(){
    const nav=document.querySelector('.nav');if(!nav||document.getElementById('navZekeHub'))return;
    const btn=document.createElement('button');btn.id='navZekeHub';btn.className='nav-item';btn.innerHTML='<span>⌁</span>ZekeHub';
    const settings=document.getElementById('navSettings');nav.insertBefore(btn,settings||null);btn.onclick=showPage;
  }

  function ensurePage(){
    if(document.getElementById('zekeHubView'))return;
    const content=document.querySelector('.content');if(!content)return;
    const section=document.createElement('section');section.id='zekeHubView';section.className='hidden';
    section.innerHTML=`<section class="hero zeke-hero"><div><div class="eyebrow">ZEKEHUB LIVE BRIDGE</div><h1>Adopt Me Account Stats</h1><p>Read-only stats + encrypted integration settings that follow your vault across devices.</p></div><div class="hero-actions"><button id="zekeRefreshBtn" class="secondary">Refresh Accounts</button><button id="zekeConnectBtn" class="primary">Connect</button></div></section>
    <section class="panel zeke-panel"><div class="panel-head"><div><div class="eyebrow">CONNECTION</div><h2>ZekeHub Integration</h2></div><div class="zeke-live"><span id="zekeStatusDot" class="small-dot"></span><strong id="zekeStatusText">Disconnected</strong></div></div>
    <div class="zeke-config-grid">
      <label>Adopt Me Script Key<div class="credential-input"><input id="zekeScriptKey" type="password" autocomplete="off" placeholder="Script Key"><button class="mini-btn zeke-show" data-target="zekeScriptKey" type="button">Show</button></div></label>
      <label>Bridge URL<input id="zekeBridgeUrl" type="url" autocomplete="off" placeholder="https://exauddd-zeke-bridge....workers.dev/token"></label>
      <label>Bridge Key<div class="credential-input"><input id="zekeBridgeKey" type="password" autocomplete="off" placeholder="Bridge Key"><button class="mini-btn zeke-show" data-target="zekeBridgeKey" type="button">Show</button></div></label>
      <div class="zeke-config-actions"><button id="zekeSaveConfig" class="primary" type="button">Save Encrypted</button><button id="zekeClearConfig" class="danger-btn" type="button">Clear</button></div>
    </div>
    <div class="notice">Script Key, Bridge URL, dan Bridge Key disimpan di dalam vault terenkripsi. Saat Supabase sync aktif, konfigurasi ini ikut ke device lain setelah login dan unlock dengan master password yang sama.</div>
    <div id="zekeTotals" class="zeke-totals"><div><span>Total Bucks</span><strong>—</strong></div><div><span>Age Potions</span><strong>—</strong></div><div><span>Tiny Potions</span><strong>—</strong></div><div><span>Recycler Tickets</span><strong>—</strong></div><div><span>Active</span><strong>—</strong></div></div>
    <div class="filters zeke-filter"><div class="search"><span>⌕</span><input id="zekeSearch" type="search" placeholder="Cari username..."></div><div id="zekeSummary" class="zeke-summary">0 accounts</div></div>
    <div class="table-wrap"><table class="zeke-table"><thead><tr><th>Username</th><th>Bucks</th><th>Pets</th><th>Eggs</th><th>Age Potions</th><th>Tiny</th><th>Tickets</th><th>Updated</th></tr></thead><tbody id="zekeRows"></tbody></table></div><div id="zekeEmpty" class="empty-state"><div class="empty-logo">⌁</div><h3>Belum ada live data</h3><p>Simpan konfigurasi lalu Connect.</p></div></section>`;
    content.appendChild(section);
    section.querySelectorAll('.zeke-show').forEach(b=>b.onclick=()=>{const i=document.getElementById(b.dataset.target);i.type=i.type==='password'?'text':'password';b.textContent=i.type==='password'?'Show':'Hide'});
    section.querySelector('#zekeSaveConfig').onclick=async()=>{try{await saveCfg({scriptKey:section.querySelector('#zekeScriptKey').value.trim(),bridgeUrl:section.querySelector('#zekeBridgeUrl').value.trim(),bridgeKey:section.querySelector('#zekeBridgeKey').value.trim()});toast('ZekeHub config tersimpan terenkripsi.')}catch(e){toast(e.message||String(e))}};
    section.querySelector('#zekeClearConfig').onclick=async()=>{try{await saveCfg({scriptKey:'',bridgeUrl:'',bridgeKey:''});fillConfig();toast('ZekeHub config dihapus.')}catch(e){toast(e.message||String(e))}};
    section.querySelector('#zekeConnectBtn').onclick=connect;section.querySelector('#zekeRefreshBtn').onclick=()=>{if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'get:accounts'}));else connect()};section.querySelector('#zekeSearch').oninput=renderRows;
  }

  function fillConfig(){const c=cfg();const a=document.getElementById('zekeScriptKey'),b=document.getElementById('zekeBridgeUrl'),k=document.getElementById('zekeBridgeKey');if(a)a.value=c.scriptKey||'';if(b)b.value=c.bridgeUrl||'';if(k)k.value=c.bridgeKey||''}
  async function showPage(){ensurePage();if(typeof masterKey==='undefined'||!masterKey){toast('Unlock vault dulu.');return}await migrateLegacy().catch(()=>{});fillConfig();document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.id==='navZekeHub'));document.getElementById('vaultView')?.classList.add('hidden');document.getElementById('zekeHubView')?.classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'})}
  function leavePage(){document.getElementById('zekeHubView')?.classList.add('hidden');if(typeof masterKey!=='undefined'&&masterKey)document.getElementById('vaultView')?.classList.remove('hidden')}
  function bindExistingNav(){document.querySelectorAll('.nav-item').forEach(btn=>{if(btn.id==='navZekeHub'||btn.dataset.zekeLeaveBound)return;btn.dataset.zekeLeaveBound='1';btn.addEventListener('click',leavePage,{capture:true})})}

  async function getToken(scriptKey,c){
    if(c.bridgeUrl){
      const endpoint=c.bridgeUrl.replace(/\/$/,'')+(c.bridgeUrl.endsWith('/token')?'':'/token');
      const headers={'Content-Type':'application/json'};if(c.bridgeKey)headers['X-Bridge-Key']=c.bridgeKey;
      const res=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify({scriptKey})});const data=await res.json().catch(()=>({}));if(!res.ok||!data.success)throw new Error(data.error||`Bridge HTTP ${res.status}`);return data;
    }
    let res;try{res=await fetch(DIRECT_TOKEN_URL,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({scriptKey})})}catch{throw new Error('Direct token request diblokir browser. Isi Bridge URL + Bridge Key.')}
    const data=await res.json().catch(()=>({}));if(!res.ok||!data.success)throw new Error(data.error||`token request failed (HTTP ${res.status})`);return data;
  }

  async function connect(){
    if(typeof masterKey==='undefined'||!masterKey)return toast('Unlock vault dulu.');
    const c=cfg();const scriptKey=(document.getElementById('zekeScriptKey')?.value||c.scriptKey||'').trim();const bridgeUrl=(document.getElementById('zekeBridgeUrl')?.value||c.bridgeUrl||'').trim();const bridgeKey=(document.getElementById('zekeBridgeKey')?.value||c.bridgeKey||'').trim();
    if(!scriptKey)return toast('Masukkan Script Key dulu.');
    await saveCfg({scriptKey,bridgeUrl,bridgeKey}).catch(()=>{});disconnect(false);setStatus('Requesting token…','wait');
    try{const {token,ts}=await getToken(scriptKey,{bridgeUrl,bridgeKey});const url=WS_BASE+'/ws?role=dashboard&token='+encodeURIComponent(token)+'&ts='+encodeURIComponent(ts)+'&key='+encodeURIComponent(scriptKey);ws=new WebSocket(url);ws.binaryType='arraybuffer';
      ws.onopen=()=>{setStatus('Authenticating…','wait');ws.send(JSON.stringify({type:'authenticate:dashboard',scriptKey}))};
      ws.onmessage=async ev=>{let raw;try{raw=typeof ev.data==='string'?ev.data:await gunzip(new Uint8Array(ev.data))}catch{raw=typeof ev.data==='string'?ev.data:''}let msg;try{msg=JSON.parse(raw)}catch{return}
        if(msg.type==='auth:success'){setStatus('Connected','ok');ws.send(JSON.stringify({type:'get:accounts'}))}
        else if(msg.type==='auth:failed'){setStatus('Auth failed','bad');toast(msg.error||'ZekeHub auth failed.')}
        else if(msg.type==='accounts:data'){accounts=Array.isArray(msg.accounts)?msg.accounts:[];totalStats=msg.totalStats||null;renderRows();renderTotals();setStatus(`Connected • ${accounts.length} accounts`,'ok')}
        else if(msg.type==='accounts:refresh'||msg.type==='bot:connected'||msg.type==='bot:disconnected'){ws.send(JSON.stringify({type:'get:accounts'}))}
      };ws.onerror=()=>setStatus('Connection error','bad');ws.onclose=e=>setStatus(`Disconnected${e.code?` (${e.code})`:''}`,'idle');
    }catch(e){console.error(e);setStatus('Connect failed','bad');toast('ZekeHub: '+(e.message||e))}
  }
  function disconnect(update=true){if(ws){try{ws.close()}catch{}ws=null}if(update)setStatus('Disconnected','idle')}
  function renderTotals(){const box=document.getElementById('zekeTotals');if(!box)return;const t=totalStats||{};const vals=[t.totalBucks,t.totalAgePotions,t.totalTinyAgePotions,t.totalRecyclerTickets,t.activeAccounts];[...box.querySelectorAll('strong')].forEach((el,i)=>el.textContent=fmt(vals[i]))}
  function renderRows(){const body=document.getElementById('zekeRows');if(!body)return;const q=(document.getElementById('zekeSearch')?.value||'').trim().toLowerCase();const rows=accounts.map(normalizeAccount).filter(a=>!q||a.username.toLowerCase().includes(q));body.innerHTML=rows.map(a=>`<tr><td>${esc(a.username)}</td><td>${fmt(a.bucks)}</td><td>${fmt(a.totalPets)}</td><td>${fmt(a.totalEggs)}</td><td>${fmt(a.agePotions)}</td><td>${fmt(a.tinyAgePotions)}</td><td>${fmt(a.recyclerTickets)}</td><td>${esc(fmtDate(a.lastUpdate))}</td></tr>`).join('');document.getElementById('zekeEmpty')?.classList.toggle('hidden',rows.length>0);const s=document.getElementById('zekeSummary');if(s)s.textContent=`${rows.length.toLocaleString('id-ID')} / ${accounts.length.toLocaleString('id-ID')} accounts`}

  if(!document.getElementById('zekeHubStyles')){const s=document.createElement('style');s.id='zekeHubStyles';s.textContent=`#zekeHubView{padding-bottom:24px}.zeke-live{display:flex;align-items:center;gap:8px}.zeke-config-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px}.zeke-config-grid label{display:grid;gap:7px;font-size:11px;font-weight:800}.zeke-config-actions{display:flex;gap:8px;align-items:end}.zeke-filter{grid-template-columns:minmax(240px,1fr) auto}.zeke-summary{display:flex;align-items:center;padding:0 8px;font-size:11px;color:#94a89a}.zeke-table{min-width:1040px}.zeke-totals{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;padding:0 16px 16px}.zeke-totals>div{border:1px solid #1b4429;border-radius:8px;padding:10px;background:#07110a}.zeke-totals span{display:block;font-size:9px;color:#7e9584;text-transform:uppercase}.zeke-totals strong{display:block;margin-top:4px;font-size:17px;color:#d7ffe1}#zekeStatusDot[data-state="ok"]{background:#39ff6e;box-shadow:0 0 12px #39ff6e}#zekeStatusDot[data-state="bad"]{background:#ff5c5c}#zekeStatusDot[data-state="wait"]{background:#ffd75c}@media(max-width:760px){.zeke-config-grid{grid-template-columns:1fr}.zeke-totals{grid-template-columns:repeat(2,1fr)}}`;document.head.appendChild(s)}

  ensureSidebar();ensurePage();bindExistingNav();document.addEventListener('DOMContentLoaded',()=>{ensureSidebar();ensurePage();bindExistingNav()});const old=window.render;if(typeof old==='function')window.render=function(){old();ensureSidebar();ensurePage();bindExistingNav();if(typeof masterKey!=='undefined'&&masterKey)fillConfig()};
})();