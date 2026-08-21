// Silverback Vault V3 - group manager
// Adds persistent groups, default groups, rename/delete, and account/group suggestions.
(() => {
  const DEFAULT_GROUPS=["Zeropoint","Highspecc"];
  const baseRender=render;

  function cleanName(v){return String(v||"").trim().replace(/\s+/g," ").slice(0,60)}
  function allKnownGroups(){
    const managed=Array.isArray(vault.groups)?vault.groups:[];
    const used=vault.accounts.map(a=>cleanName(a.group)).filter(Boolean);
    const map=new Map();
    [...DEFAULT_GROUPS,...managed,...used].forEach(g=>{const n=cleanName(g);if(n&&!map.has(n.toLowerCase()))map.set(n.toLowerCase(),n)});
    return [...map.values()].sort((a,b)=>a.localeCompare(b,undefined,{sensitivity:"base"}));
  }
  function ensureGroups(){
    if(!Array.isArray(vault.groups))vault.groups=[];
    let changed=false;
    for(const g of DEFAULT_GROUPS){
      if(!vault.groups.some(x=>cleanName(x).toLowerCase()===g.toLowerCase())){vault.groups.push(g);changed=true}
    }
    // Preserve existing groups already used by accounts.
    for(const a of vault.accounts){
      const g=cleanName(a.group);
      if(g&&!vault.groups.some(x=>cleanName(x).toLowerCase()===g.toLowerCase())){vault.groups.push(g);changed=true}
    }
    return changed;
  }

  function ensureGroupInputList(){
    const input=$("group");if(!input)return;
    let dl=$("groupOptions");
    if(!dl){dl=document.createElement("datalist");dl.id="groupOptions";document.body.appendChild(dl);input.setAttribute("list","groupOptions")}
    dl.innerHTML="";
    allKnownGroups().forEach(g=>{const o=document.createElement("option");o.value=g;dl.appendChild(o)});
  }

  function enhanceFilterAndStat(){
    const groups=allKnownGroups();
    const gf=$("groupFilter");
    if(gf){
      const current=gf.value;
      gf.innerHTML='<option value="">Semua Group</option>';
      groups.forEach(g=>{const o=document.createElement("option");o.value=g;o.textContent=g;gf.appendChild(o)});
      if(groups.includes(current))gf.value=current;
    }
    if($("statGroups"))$("statGroups").textContent=groups.length;
  }

  function ensureDialog(){
    if($("groupsDialog"))return;
    const dialog=document.createElement("dialog");dialog.id="groupsDialog";
    dialog.innerHTML=`<div class="modal group-modal">
      <div class="modal-head"><div><div class="eyebrow">GROUPS</div><h2>Manage Groups</h2></div><button id="closeGroupsDialog" type="button" class="icon-btn">×</button></div>
      <div class="notice">Kelompokkan akun agar lebih mudah difilter dan dikelola. Zeropoint dan Highspecc sudah disiapkan sebagai group awal.</div>
      <div class="group-add-row"><input id="newGroupName" autocomplete="off" maxlength="60" placeholder="Nama group baru"><button id="addGroupBtn" type="button" class="primary">+ Add Group</button></div>
      <div id="groupManagerList" class="group-manager-list"></div>
      <div class="modal-actions"><span class="spacer"></span><button id="doneGroupsBtn" type="button" class="primary">Done</button></div>
    </div>`;
    document.body.appendChild(dialog);
    const style=document.createElement("style");style.textContent=`
      .group-modal{width:min(620px,calc(100vw - 24px))}.group-add-row{display:flex;gap:10px;margin:14px 0}.group-add-row input{flex:1}
      .group-manager-list{display:grid;gap:8px;max-height:52vh;overflow:auto}.group-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:8px;padding:11px 12px;border:1px solid #2c3239;border-radius:10px;background:#0d1115}
      .group-main{min-width:0}.group-main strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.group-main small{color:#77818b}.group-actions{display:flex;gap:6px}.group-empty{padding:20px;text-align:center;color:#7f8993}
      @media(max-width:620px){.group-add-row{display:grid}.group-row{grid-template-columns:minmax(0,1fr) auto}.group-actions{grid-column:1/-1}.group-actions button{flex:1}}
    `;document.head.appendChild(style);
    $("closeGroupsDialog").onclick=()=>dialog.close();$("doneGroupsBtn").onclick=()=>dialog.close();
    $("addGroupBtn").onclick=addGroup;$("newGroupName").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addGroup()}});
  }

  async function addGroup(){
    const input=$("newGroupName"),name=cleanName(input?.value);
    if(!name){toast("Masukkan nama group.");return}
    ensureGroups();
    if(allKnownGroups().some(g=>g.toLowerCase()===name.toLowerCase())){toast("Group sudah ada.");return}
    vault.groups.push(name);input.value="";
    await saveLocalAndMaybeRemote();render();renderManager();toast(`Group ${name} ditambahkan.`)
  }

  async function renameGroup(oldName){
    const next=cleanName(prompt("Nama group baru:",oldName));if(!next||next===oldName)return;
    if(allKnownGroups().some(g=>g.toLowerCase()===next.toLowerCase()&&g.toLowerCase()!==oldName.toLowerCase())){toast("Nama group sudah digunakan.");return}
    ensureGroups();
    vault.groups=vault.groups.map(g=>cleanName(g).toLowerCase()===oldName.toLowerCase()?next:g);
    vault.accounts.forEach(a=>{if(cleanName(a.group).toLowerCase()===oldName.toLowerCase()){a.group=next;a.updatedAt=new Date().toISOString()}});
    await saveLocalAndMaybeRemote();render();renderManager();toast("Group diubah.")
  }

  async function deleteGroup(name){
    const count=vault.accounts.filter(a=>cleanName(a.group).toLowerCase()===name.toLowerCase()).length;
    const msg=count?`Hapus group ${name}? ${count} akun di group ini akan dikosongkan group-nya.`:`Hapus group ${name}?`;
    if(!confirm(msg))return;
    ensureGroups();vault.groups=vault.groups.filter(g=>cleanName(g).toLowerCase()!==name.toLowerCase());
    if(count){vault.accounts.forEach(a=>{if(cleanName(a.group).toLowerCase()===name.toLowerCase()){a.group="";a.updatedAt=new Date().toISOString()}})}
    await saveLocalAndMaybeRemote();render();renderManager();toast("Group dihapus.")
  }

  function renderManager(){
    ensureDialog();const list=$("groupManagerList");if(!list)return;list.innerHTML="";
    const groups=allKnownGroups();
    if(!groups.length){list.innerHTML='<div class="group-empty">Belum ada group.</div>';return}
    groups.forEach(name=>{
      const count=vault.accounts.filter(a=>cleanName(a.group).toLowerCase()===name.toLowerCase()).length;
      const row=document.createElement("div");row.className="group-row";
      const main=document.createElement("div");main.className="group-main";const strong=document.createElement("strong");strong.textContent=name;const small=document.createElement("small");small.textContent=`${count} account${count===1?"":"s"}`;main.append(strong,small);
      const actions=document.createElement("div");actions.className="group-actions";
      const rename=document.createElement("button");rename.type="button";rename.className="secondary small";rename.textContent="Rename";rename.onclick=()=>renameGroup(name);
      const del=document.createElement("button");del.type="button";del.className="danger-btn small";del.textContent="Delete";del.onclick=()=>deleteGroup(name);
      actions.append(rename,del);row.append(main,actions);list.appendChild(row)
    })
  }

  function openGroups(){
    if(!masterKey){toast("Unlock vault dulu.");return}
    ensureGroups();ensureDialog();renderManager();$("groupsDialog").showModal()
  }

  function bindNav(){
    const btn=[...document.querySelectorAll(".nav-item")].find(b=>b.textContent.trim().endsWith("Groups"));
    if(btn&&!btn.dataset.groupBound){btn.dataset.groupBound="1";btn.addEventListener("click",openGroups)}
  }

  render=function(){
    baseRender();
    if(masterKey){
      const changed=ensureGroups();
      ensureGroupInputList();enhanceFilterAndStat();bindNav();
      if(changed)saveLocalAndMaybeRemote().catch(console.error)
    }else bindNav();
  };

  bindNav();ensureDialog();render();
})();
