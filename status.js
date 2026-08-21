// Silverback Vault V3 - custom account status manager
// Adds persistent custom statuses and keeps filters/forms/bulk controls in sync.
(() => {
  const DEFAULT_STATUSES=["Active","Facelock","Inactive","Banned","Dead"];
  const baseRender=render;
  let savePending=false;

  function cleanName(v){return String(v||"").trim().replace(/\s+/g," ").slice(0,40)}
  function isDefault(name){return DEFAULT_STATUSES.some(s=>s.toLowerCase()===cleanName(name).toLowerCase())}

  function allKnownStatuses(){
    const managed=Array.isArray(vault.statuses)?vault.statuses:[];
    const used=Array.isArray(vault.accounts)?vault.accounts.map(a=>cleanName(a.status)).filter(Boolean):[];
    const map=new Map();
    [...DEFAULT_STATUSES,...managed,...used].forEach(s=>{
      const n=cleanName(s);
      if(n&&!map.has(n.toLowerCase()))map.set(n.toLowerCase(),n);
    });
    const priority=new Map(DEFAULT_STATUSES.map((s,i)=>[s.toLowerCase(),i]));
    return [...map.values()].sort((a,b)=>{
      const ai=priority.has(a.toLowerCase())?priority.get(a.toLowerCase()):999;
      const bi=priority.has(b.toLowerCase())?priority.get(b.toLowerCase()):999;
      return ai!==bi?ai-bi:a.localeCompare(b,undefined,{sensitivity:"base"});
    });
  }

  function ensureStatuses(){
    if(!Array.isArray(vault.statuses))vault.statuses=[];
    let changed=false;
    for(const s of DEFAULT_STATUSES){
      if(!vault.statuses.some(x=>cleanName(x).toLowerCase()===s.toLowerCase())){
        vault.statuses.push(s);changed=true;
      }
    }
    for(const a of (vault.accounts||[])){
      const s=cleanName(a.status);
      if(s&&!vault.statuses.some(x=>cleanName(x).toLowerCase()===s.toLowerCase())){
        vault.statuses.push(s);changed=true;
      }
    }
    return changed;
  }

  function fillSelect(select,firstLabel){
    if(!select)return;
    const current=select.value;
    select.innerHTML="";
    if(firstLabel!==null){
      const first=document.createElement("option");first.value="";first.textContent=firstLabel;select.appendChild(first);
    }
    allKnownStatuses().forEach(s=>{const o=document.createElement("option");o.value=s;o.textContent=s;select.appendChild(o)});
    if([...select.options].some(o=>o.value===current))select.value=current;
  }

  function refreshControls(){
    fillSelect($("statusFilter"),"Semua Status");
    fillSelect($("status"),null);
    fillSelect($("bulkStatus"),"Set Status...");
  }

  function ensureManageButton(){
    if($("manageStatusesBtn"))return;
    const reset=$("resetFilters");
    if(!reset)return;
    const btn=document.createElement("button");
    btn.id="manageStatusesBtn";btn.type="button";btn.className="secondary small";btn.textContent="+ Status";
    btn.onclick=openManager;
    reset.insertAdjacentElement("afterend",btn);
  }

  function ensureDialog(){
    if($("statusesDialog"))return;
    const dialog=document.createElement("dialog");dialog.id="statusesDialog";
    dialog.innerHTML=`<div class="modal status-modal">
      <div class="modal-head"><div><div class="eyebrow">ACCOUNT STATUS</div><h2>Manage Statuses</h2></div><button id="closeStatusesDialog" type="button" class="icon-btn">×</button></div>
      <div class="notice">Status bawaan: Active, Facelock, Inactive, Banned, dan Dead. Tambahkan status lain sesuai kebutuhan.</div>
      <div class="status-add-row"><input id="newStatusName" autocomplete="off" maxlength="40" placeholder="Contoh: Locked, Review, Pending"><button id="addStatusBtn" type="button" class="primary">+ Add Status</button></div>
      <div id="statusManagerList" class="status-manager-list"></div>
      <div class="modal-actions"><span class="spacer"></span><button id="doneStatusesBtn" type="button" class="primary">Done</button></div>
    </div>`;
    document.body.appendChild(dialog);
    const style=document.createElement("style");
    style.textContent=`
      .status-modal{width:min(650px,calc(100vw - 24px))}.status-add-row{display:flex;gap:10px;margin:14px 0}.status-add-row input{flex:1}
      .status-manager-list{display:grid;gap:8px;max-height:52vh;overflow:auto}.status-manager-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;padding:11px 12px;border:1px solid #2c3239;border-radius:10px;background:#0d1115}
      .status-manager-main{min-width:0}.status-manager-main strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.status-manager-main small{color:#77818b}.status-manager-actions{display:flex;gap:6px}.status-default-tag{display:inline-block;margin-left:8px;padding:2px 6px;border:1px solid #353c44;border-radius:999px;font-size:9px;color:#909aa4}
      @media(max-width:620px){.status-add-row{display:grid}.status-manager-row{grid-template-columns:1fr}.status-manager-actions button{flex:1}}
    `;
    document.head.appendChild(style);
    $("closeStatusesDialog").onclick=()=>dialog.close();
    $("doneStatusesBtn").onclick=()=>dialog.close();
    $("addStatusBtn").onclick=addStatus;
    $("newStatusName").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addStatus()}});
  }

  async function addStatus(){
    const input=$("newStatusName"),name=cleanName(input?.value);
    if(!name){toast("Masukkan nama status.");return}
    ensureStatuses();
    if(allKnownStatuses().some(s=>s.toLowerCase()===name.toLowerCase())){toast("Status sudah ada.");return}
    vault.statuses.push(name);input.value="";
    await saveLocalAndMaybeRemote();render();renderManager();toast(`Status ${name} ditambahkan.`)
  }

  async function renameStatus(oldName){
    if(isDefault(oldName)){toast("Status bawaan tidak dapat di-rename.");return}
    const next=cleanName(prompt("Nama status baru:",oldName));if(!next||next===oldName)return;
    if(allKnownStatuses().some(s=>s.toLowerCase()===next.toLowerCase()&&s.toLowerCase()!==oldName.toLowerCase())){toast("Nama status sudah digunakan.");return}
    ensureStatuses();
    vault.statuses=vault.statuses.map(s=>cleanName(s).toLowerCase()===oldName.toLowerCase()?next:s);
    const now=new Date().toISOString();
    vault.accounts.forEach(a=>{if(cleanName(a.status).toLowerCase()===oldName.toLowerCase()){a.status=next;a.updatedAt=now}});
    await saveLocalAndMaybeRemote();render();renderManager();toast("Status diubah.")
  }

  async function deleteStatus(name){
    if(isDefault(name)){toast("Status bawaan tidak dapat dihapus.");return}
    const count=vault.accounts.filter(a=>cleanName(a.status).toLowerCase()===name.toLowerCase()).length;
    const msg=count?`Hapus status ${name}? ${count} akun akan dipindahkan ke Active.`:`Hapus status ${name}?`;
    if(!confirm(msg))return;
    ensureStatuses();
    vault.statuses=vault.statuses.filter(s=>cleanName(s).toLowerCase()!==name.toLowerCase());
    const now=new Date().toISOString();
    if(count)vault.accounts.forEach(a=>{if(cleanName(a.status).toLowerCase()===name.toLowerCase()){a.status="Active";a.updatedAt=now}});
    await saveLocalAndMaybeRemote();render();renderManager();toast("Status dihapus.")
  }

  function renderManager(){
    ensureDialog();const list=$("statusManagerList");if(!list)return;list.innerHTML="";
    allKnownStatuses().forEach(name=>{
      const count=vault.accounts.filter(a=>cleanName(a.status).toLowerCase()===name.toLowerCase()).length;
      const row=document.createElement("div");row.className="status-manager-row";
      const main=document.createElement("div");main.className="status-manager-main";
      const strong=document.createElement("strong");strong.textContent=name;
      if(isDefault(name)){const tag=document.createElement("span");tag.className="status-default-tag";tag.textContent="DEFAULT";strong.appendChild(tag)}
      const small=document.createElement("small");small.textContent=`${count} account${count===1?"":"s"}`;main.append(strong,small);
      const actions=document.createElement("div");actions.className="status-manager-actions";
      if(!isDefault(name)){
        const rename=document.createElement("button");rename.type="button";rename.className="secondary small";rename.textContent="Rename";rename.onclick=()=>renameStatus(name);
        const del=document.createElement("button");del.type="button";del.className="danger-btn small";del.textContent="Delete";del.onclick=()=>deleteStatus(name);
        actions.append(rename,del);
      }
      row.append(main,actions);list.appendChild(row);
    })
  }

  function openManager(){
    if(!masterKey){toast("Unlock vault dulu.");return}
    ensureStatuses();ensureDialog();renderManager();$("statusesDialog").showModal()
  }

  window.getSilverbackStatuses=allKnownStatuses;

  render=function(){
    baseRender();
    ensureManageButton();ensureDialog();
    if(masterKey){
      const changed=ensureStatuses();refreshControls();
      if(changed&&!savePending){
        savePending=true;Promise.resolve(saveLocalAndMaybeRemote()).catch(console.error).finally(()=>{savePending=false});
      }
    }
  };

  ensureManageButton();ensureDialog();render();
})();
