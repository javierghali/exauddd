// EXAUDDD Vault - ZekeHub read-only dashboard bridge
// Based on the user-provided ZekeHub API docs. Stores Script Key only in this browser.
(() => {
  const KEY_STORE='exauddd_zekehub_script_key_v1';
  const WS_BASE='wss://backend.zekehub.com';
  const TOKEN_URL='https://zekehub.com/api/adoptme/ws-token';
  let ws=null, accounts=[], connected=false;

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const fmt=n=>{const x=Number(n);return Number.isFinite(x)?x.toLocaleString('en-US'):'—'};
  const pick=(obj,names)=>{for(const n of names){if(obj&&obj[n]!==undefined&&obj[n]!==null)return obj[n]}return undefined};
  const deepPick=(obj,names)=>{
    const direct=pick(obj,names);if(direct!==undefined)return direct;
    for(const v of Object.values(obj||{})){if(v&&typeof v==='object'&&!Array.isArray(v)){const r=pick(v,names);if(r!==undefined)return r}}
    return undefined;
  };
  const normalizeAccount=a=>({
    username: deepPick(a,['username','name','userName'])||'—',
    bucks: deepPick(a,['bucks','cash','money','currency','cash_balance']),
    potions: deepPick(a,['potions','potionCount','potion_count','ageUpPotions','age_up_potions']),
    tickets: deepPick(a,['tickets','ticketCount','ticket_count','releaseTickets','release_tickets','releaserTickets']),
    updated: deepPick(a,['updatedAt','updated_at','lastUpdate','last_update','timestamp']),
    raw:a
  });

  async function gunzip(bytes){
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return await new Response(stream).text();
  }

  function setStatus(text,state='idle'){
    const el=document.getElementById('zekeStatusText'),dot=document.getElementById('zekeStatusDot');
    if(el)el.textContent=text;if(dot)dot.dataset.state=state;
  }

  function ensureSidebar(){
    const nav=document.querySelector('.nav');if(!nav||document.getElementById('navZekeHub'))return;
    const btn=document.createElement('button');btn.id='navZekeHub';btn.className='nav-item';btn.innerHTML='<span>⌁</span>ZekeHub';
    const settings=document.getElementById('navSettings');nav.insertBefore(btn,settings||null);
    btn.onclick=()=>showPage();
  }

  function ensurePage(){
    if(document.getElementById('zekeHubView'))return;
    const content=document.querySelector('.content');if(!content)return;
    const section=document.createElement('section');section.id='zekeHubView';section.className='hidden';
    section.innerHTML=`
      <section class="hero zeke-hero"><div><div class="eyebrow">ZEKEHUB LIVE BRIDGE</div><h1>Adopt Me Account Stats</h1><p>Read-only view untuk Bucks, Potions, Tickets, dan last update dari dashboard stream.</p></div><div class="hero-actions"><button id="zekeRefreshBtn" class="secondary">Refresh Accounts</button><button id="zekeConnectBtn" class="primary">Connect</button></div></section>
      <section class="panel zeke-panel"><div class="panel-head"><div><div class="eyebrow">CONNECTION</div><h2>ZekeHub API</h2></div><div class="zeke-live"><span id="zekeStatusDot" class="small-dot"></span><strong id="zekeStatusText">Disconnected</strong></div></div>
      <div class="zeke-config"><label>Adopt Me Script Key<div class="credential-input"><input id="zekeScriptKey" type="password" autocomplete="off" placeholder="Paste script key di perangkat ini"><button id="zekeShowKey" class="mini-btn" type="button">Show</button></div></label><div class="zeke-config-actions"><button id="zekeSaveKey" class="secondary" type="button">Save Local</button><button id="zekeForgetKey" class="danger-btn" type="button">Forget Key</button></div></div>
      <div class="notice">Script Key hanya disimpan di browser ini, tidak ditulis ke repository. Koneksi mengikuti API docs ZekeHub yang kamu berikan dan hanya meminta data akun.</div>
      <div class="filters zeke-filter"><div class="search"><span>⌕</span><input id="zekeSearch" type="search" placeholder="Cari username..."></div><div id="zekeSummary" class="zeke-summary">0 accounts</div></div>
      <div class="table-wrap"><table class="zeke-table"><thead><tr><th>Username</th><th>Bucks</th><th>Potions</th><th>Tickets</th><th>Updated</th></tr></thead><tbody id="zekeRows"></tbody></table></div>
      <div id="zekeEmpty" class="empty-state"><div class="empty-logo">⌁</div><h3>Belum ada live data</h3><p>Masukkan Script Key lalu Connect.</p></div></section>`;
    content.appendChild(section);

    const input=section.querySelector('#zekeScriptKey');input.value=localStorage.getItem(KEY_STORE)||'';
    section.querySelector('#zekeShowKey').onclick=()=>{input.type=input.type==='password'?'text':'password';section.querySelector('#zekeShowKey').textContent=input.type==='password'?'Show':'Hide'};
    section.querySelector('#zekeSaveKey').onclick=()=>{const v=input.value.trim();if(!v)return toast('Script Key kosong.');localStorage.setItem(KEY_STORE,v);toast('Script Key disimpan lokal.')};
    section.querySelector('#zekeForgetKey').onclick=()=>{localStorage.removeItem(KEY_STORE);input.value='';disconnect();toast('Script Key lokal dihapus.')};
    section.querySelector('#zekeConnectBtn').onclick=connect;
    section.querySelector('#zekeRefreshBtn').onclick=()=>{if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'get:accounts'}));else connect()};
    section.querySelector('#zekeSearch').oninput=renderRows;
  }

  function showPage(){
    ensurePage();
    document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.id==='navZekeHub'));
    document.getElementById('vaultView')?.classList.add('hidden');
    document.getElementById('zekeHubView')?.classList.remove('hidden');
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function leavePage(){document.getElementById('zekeHubView')?.classList.add('hidden');if(masterKey)document.getElementById('vaultView')?.classList.remove('hidden')}

  function bindExistingNav(){
    document.querySelectorAll('.nav-item').forEach(btn=>{if(btn.id==='navZekeHub'||btn.dataset.zekeLeaveBound)return;btn.dataset.zekeLeaveBound='1';btn.addEventListener('click',leavePage,{capture:true})});
  }

  async function getToken(scriptKey){
    const res=await fetch(TOKEN_URL,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({scriptKey})});
    const data=await res.json().catch(()=>({}));
    if(!res.ok||!data.success)throw new Error(data.error||`token request failed (HTTP ${res.status})`);
    return data;
  }

  async function connect(){
    ensurePage();const input=document.getElementById('zekeScriptKey');const scriptKey=(input?.value||localStorage.getItem(KEY_STORE)||'').trim();
    if(!scriptKey)return toast('Masukkan Adopt Me Script Key dulu.');
    localStorage.setItem(KEY_STORE,scriptKey);disconnect(false);setStatus('Requesting token…','wait');
    try{
      const {token,ts}=await getToken(scriptKey);
      const url=WS_BASE+'/ws?role=dashboard&token='+encodeURIComponent(token)+'&ts='+encodeURIComponent(ts)+'&key='+encodeURIComponent(scriptKey);
      ws=new WebSocket(url);ws.binaryType='arraybuffer';
      ws.onopen=()=>{setStatus('Authenticating…','wait');ws.send(JSON.stringify({type:'authenticate:dashboard',scriptKey}))};
      ws.onmessage=async ev=>{
        let raw;
        try{raw=typeof ev.data==='string'?ev.data:await gunzip(new Uint8Array(ev.data));}catch{raw=typeof ev.data==='string'?ev.data:''}
        let msg;try{msg=JSON.parse(raw)}catch{return}
        if(msg.type==='auth:success'){connected=true;setStatus('Connected','ok');ws.send(JSON.stringify({type:'get:accounts'}));}
        else if(msg.type==='auth:failed'){connected=false;setStatus('Auth failed','bad');toast(msg.error||'ZekeHub auth failed.');}
        else if(msg.type==='accounts:data'){accounts=Array.isArray(msg.accounts)?msg.accounts:[];renderRows();setStatus(`Connected • ${accounts.length} accounts`,'ok');}
        else if(msg.type==='accounts:refresh'){ws.send(JSON.stringify({type:'get:accounts'}));}
        else if(msg.type==='bot:connected'||msg.type==='bot:disconnected'){ws.send(JSON.stringify({type:'get:accounts'}));}
      };
      ws.onerror=()=>{setStatus('Connection error','bad')};
      ws.onclose=e=>{connected=false;setStatus(`Disconnected${e.code?` (${e.code})`:''}`,'idle')};
    }catch(e){console.error(e);setStatus('Connect failed','bad');toast('ZekeHub: '+(e.message||e));}
  }

  function disconnect(update=true){if(ws){try{ws.close()}catch{}ws=null}connected=false;if(update)setStatus('Disconnected','idle')}

  function renderRows(){
    const body=document.getElementById('zekeRows');if(!body)return;
    const q=(document.getElementById('zekeSearch')?.value||'').trim().toLowerCase();
    const rows=accounts.map(normalizeAccount).filter(a=>!q||String(a.username).toLowerCase().includes(q));
    body.innerHTML=rows.map(a=>`<tr><td>${esc(a.username)}</td><td>${fmt(a.bucks)}</td><td>${fmt(a.potions)}</td><td>${fmt(a.tickets)}</td><td>${esc(a.updated?new Date(a.updated).toLocaleString('id-ID'):'—')}</td></tr>`).join('');
    const empty=document.getElementById('zekeEmpty');if(empty)empty.classList.toggle('hidden',rows.length>0);
    const sum=document.getElementById('zekeSummary');if(sum)sum.textContent=`${rows.length.toLocaleString('id-ID')} / ${accounts.length.toLocaleString('id-ID')} accounts`;
  }

  if(!document.getElementById('zekeHubStyles')){const s=document.createElement('style');s.id='zekeHubStyles';s.textContent=`#zekeHubView{padding-bottom:24px}.zeke-panel{overflow:hidden}.zeke-live{display:flex;align-items:center;gap:8px}.zeke-config{display:grid;grid-template-columns:minmax(260px,1fr) auto;gap:12px;align-items:end;padding:16px}.zeke-config label{display:grid;gap:7px;font-size:11px;font-weight:800}.zeke-config-actions{display:flex;gap:8px}.zeke-filter{grid-template-columns:minmax(240px,1fr) auto}.zeke-summary{display:flex;align-items:center;padding:0 8px;font-size:11px;color:#94a89a}.zeke-table{min-width:720px}#zekeStatusDot[data-state="ok"]{background:#39ff6e;box-shadow:0 0 12px #39ff6e}#zekeStatusDot[data-state="bad"]{background:#ff5c5c}#zekeStatusDot[data-state="wait"]{background:#ffd75c}@media(max-width:640px){.zeke-config{grid-template-columns:1fr}.zeke-config-actions{width:100%}.zeke-config-actions button{flex:1}}`;document.head.appendChild(s)}

  ensureSidebar();ensurePage();bindExistingNav();
  document.addEventListener('DOMContentLoaded',()=>{ensureSidebar();ensurePage();bindExistingNav()});
  const old=window.render;if(typeof old==='function')window.render=function(){old();ensureSidebar();ensurePage();bindExistingNav()};
})();