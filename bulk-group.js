// Silverback Vault V3 - bulk group assignment
// Assigns up to 1,000 selected accounts to one group and saves/syncs once.
(() => {
  const MAX_BULK = 1000;

  function cleanName(v){ return String(v||"").trim().replace(/\s+/g," ").slice(0,60); }

  function knownGroups(){
    const values = [];
    if(Array.isArray(vault?.groups)) values.push(...vault.groups);
    if(Array.isArray(vault?.accounts)) values.push(...vault.accounts.map(a=>a.group));
    values.push("Zeropoint","Highspecc","Imported");
    const map = new Map();
    values.forEach(v=>{
      const n=cleanName(v);
      if(n && !map.has(n.toLowerCase())) map.set(n.toLowerCase(),n);
    });
    return [...map.values()].sort((a,b)=>a.localeCompare(b,undefined,{sensitivity:"base"}));
  }

  function selectedAccountIds(){
    return [...new Set(
      [...document.querySelectorAll('[data-account-select]:checked')]
        .map(el=>el.dataset.accountSelect)
        .filter(Boolean)
    )].slice(0,MAX_BULK);
  }

  function ensureUi(){
    const bar=document.getElementById("bulkToolbar");
    if(!bar || document.getElementById("bulkGroup")) return;

    const select=document.createElement("select");
    select.id="bulkGroup";
    select.setAttribute("aria-label","Bulk group");
    select.innerHTML='<option value="">Set Group...</option>';

    const apply=document.createElement("button");
    apply.id="bulkApplyGroup";
    apply.type="button";
    apply.className="secondary small";
    apply.textContent="Apply Group";
    apply.disabled=true;

    const status=document.getElementById("bulkStatus");
    if(status) status.insertAdjacentElement("afterend",select);
    else bar.appendChild(select);
    select.insertAdjacentElement("afterend",apply);

    select.addEventListener("change",updateControls);
    apply.addEventListener("click",applyGroup);
    refreshOptions();
    updateControls();
  }

  function refreshOptions(){
    const select=document.getElementById("bulkGroup");
    if(!select) return;
    const current=select.value;
    select.innerHTML='<option value="">Set Group...</option>';
    knownGroups().forEach(group=>{
      const option=document.createElement("option");
      option.value=group;
      option.textContent=group;
      select.appendChild(option);
    });
    if([...select.options].some(o=>o.value===current)) select.value=current;
  }

  function updateControls(){
    const select=document.getElementById("bulkGroup");
    const apply=document.getElementById("bulkApplyGroup");
    if(!select||!apply) return;
    apply.disabled = !select.value || selectedAccountIds().length===0;
  }

  async function applyGroup(){
    const select=document.getElementById("bulkGroup");
    const target=cleanName(select?.value);
    const ids=selectedAccountIds();
    if(!target){ toast("Pilih group tujuan."); return; }
    if(!ids.length){ toast("Pilih account dulu."); return; }

    if(!confirm(`Pindahkan ${ids.length} akun ke group ${target}?`)) return;

    const wanted=new Set(ids);
    const now=new Date().toISOString();
    let changed=0;
    vault.accounts.forEach(account=>{
      if(wanted.has(account.id) && cleanName(account.group)!==target){
        account.group=target;
        account.updatedAt=now;
        changed++;
      }
    });

    if(!changed){ toast(`Semua akun yang dipilih sudah berada di group ${target}.`); return; }

    if(!Array.isArray(vault.groups)) vault.groups=[];
    if(!vault.groups.some(g=>cleanName(g).toLowerCase()===target.toLowerCase())) vault.groups.push(target);

    const btn=document.getElementById("bulkApplyGroup");
    if(btn) btn.disabled=true;
    try{
      await saveLocalAndMaybeRemote();
      if(select) select.value="";
      render();
      toast(`${changed} akun dipindahkan ke group ${target}.`);
    }catch(err){
      console.error(err);
      toast("Bulk group gagal: "+String(err.message||err).slice(0,100));
      updateControls();
    }
  }

  const previousRender=render;
  render=function(){
    previousRender();
    ensureUi();
    refreshOptions();
    updateControls();
  };

  document.addEventListener("change",e=>{
    if(e.target.matches?.('[data-account-select],#bulkSelectAll')) setTimeout(updateControls,0);
  });

  ensureUi();
})();
