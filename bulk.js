// Silverback Vault V3 - bulk account status tools
// Supports selecting and updating up to 1,000 accounts in one operation.
(() => {
  const MAX_BULK = 1000;
  const selectedIds = new Set();
  const originalRender = render;

  function pruneSelection(){
    const existing = new Set(vault.accounts.map(a => a.id));
    for(const id of [...selectedIds]) if(!existing.has(id)) selectedIds.delete(id);
  }

  function ensureBulkUi(){
    if(document.getElementById("bulkToolbar")) return;
    const filters = document.querySelector(".accounts-panel .filters");
    if(!filters) return;

    const bar = document.createElement("div");
    bar.id = "bulkToolbar";
    bar.className = "bulk-toolbar";
    bar.innerHTML = `
      <label class="bulk-select-all">
        <input id="bulkSelectAll" type="checkbox">
        <span>Select All</span>
      </label>
      <span id="bulkCount" class="bulk-count">0 selected</span>
      <span class="bulk-limit">Max ${MAX_BULK}</span>
      <span class="bulk-spacer"></span>
      <select id="bulkStatus" aria-label="Bulk status">
        <option value="">Set Status...</option>
        <option value="Active">Active</option>
        <option value="Check">Check</option>
        <option value="Inactive">Inactive</option>
        <option value="Banned">Banned</option>
      </select>
      <button id="bulkApply" type="button" class="primary small" disabled>Apply</button>
      <button id="bulkClear" type="button" class="secondary small" disabled>Clear</button>`;
    filters.insertAdjacentElement("afterend", bar);

    const style = document.createElement("style");
    style.textContent = `
      .bulk-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 14px;margin:0 0 12px;border:1px solid #2a3037;border-radius:12px;background:#0d1115}
      .bulk-select-all{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;cursor:pointer;color:#d8dde2}
      .bulk-select-all input,.row-select,.mobile-row-select{width:18px;height:18px;accent-color:#d9dde2;cursor:pointer}
      .bulk-count{font-size:12px;font-weight:800;color:#f1f3f5}.bulk-limit{font-size:11px;color:#707983}.bulk-spacer{flex:1}
      #bulkStatus{min-width:145px}.select-cell{width:42px;text-align:center;padding-left:12px!important;padding-right:8px!important}
      .mobile-select-wrap{display:flex;align-items:center;gap:10px}.bulk-selected-row{background:rgba(255,255,255,.035)}
      @media(max-width:760px){.bulk-toolbar{align-items:stretch}.bulk-spacer{display:none}.bulk-count{margin-right:auto}#bulkStatus{flex:1;min-width:130px}}
    `;
    document.head.appendChild(style);

    $("bulkSelectAll").addEventListener("change", e => {
      const list = filtered().slice(0, MAX_BULK);
      if(e.target.checked){
        list.forEach(a => selectedIds.add(a.id));
        if(filtered().length > MAX_BULK) toast(`Dipilih maksimal ${MAX_BULK} akun dari hasil filter.`);
      }else{
        list.forEach(a => selectedIds.delete(a.id));
      }
      render();
    });

    $("bulkStatus").addEventListener("change", updateBulkControls);
    $("bulkClear").addEventListener("click", () => { selectedIds.clear(); render(); });
    $("bulkApply").addEventListener("click", applyBulkStatus);
  }

  function updateBulkControls(){
    const count = selectedIds.size;
    if($("bulkCount")) $("bulkCount").textContent = `${count} selected`;
    if($("bulkApply")) $("bulkApply").disabled = !count || !$("bulkStatus")?.value;
    if($("bulkClear")) $("bulkClear").disabled = !count;

    const visible = filtered().slice(0, MAX_BULK);
    const selectedVisible = visible.filter(a => selectedIds.has(a.id)).length;
    if($("bulkSelectAll")){
      $("bulkSelectAll").checked = visible.length > 0 && selectedVisible === visible.length;
      $("bulkSelectAll").indeterminate = selectedVisible > 0 && selectedVisible < visible.length;
    }
  }

  function toggleOne(id, checked){
    if(checked){
      if(selectedIds.size >= MAX_BULK && !selectedIds.has(id)){
        toast(`Maksimal ${MAX_BULK} akun per bulk action.`);
        render();
        return;
      }
      selectedIds.add(id);
    }else selectedIds.delete(id);
    syncCheckboxes(id, checked);
    updateBulkControls();
  }

  function syncCheckboxes(id, checked){
    document.querySelectorAll(`[data-account-select="${CSS.escape(id)}"]`).forEach(el => el.checked = checked);
  }

  function enhanceTable(list){
    const header = document.querySelector(".accounts-panel table thead tr");
    if(header && !header.querySelector(".select-head")){
      const th = document.createElement("th");
      th.className = "select-head select-cell";
      th.textContent = "✓";
      th.title = "Select accounts";
      header.prepend(th);
    }

    const rows = [...document.querySelectorAll("#accountRows tr")];
    rows.forEach((tr, i) => {
      const account = list[i];
      if(!account) return;
      const td = document.createElement("td");
      td.className = "select-cell";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "row-select";
      cb.dataset.accountSelect = account.id;
      cb.checked = selectedIds.has(account.id);
      cb.setAttribute("aria-label", `Select ${account.username || "account"}`);
      cb.addEventListener("change", e => toggleOne(account.id, e.target.checked));
      td.append(cb);
      tr.prepend(td);
      tr.classList.toggle("bulk-selected-row", cb.checked);
    });
  }

  function enhanceMobile(list){
    const cards = [...document.querySelectorAll("#mobileList .mobile-account")];
    cards.forEach((card, i) => {
      const account = list[i];
      const top = card.querySelector(".mobile-top");
      if(!account || !top) return;
      const left = top.firstElementChild;
      if(!left) return;
      const wrap = document.createElement("div");
      wrap.className = "mobile-select-wrap";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "mobile-row-select";
      cb.dataset.accountSelect = account.id;
      cb.checked = selectedIds.has(account.id);
      cb.setAttribute("aria-label", `Select ${account.username || "account"}`);
      cb.addEventListener("change", e => toggleOne(account.id, e.target.checked));
      left.replaceWith(wrap);
      wrap.append(cb, left);
      card.classList.toggle("bulk-selected-row", cb.checked);
    });
  }

  async function applyBulkStatus(){
    const status = $("bulkStatus")?.value;
    const ids = [...selectedIds].slice(0, MAX_BULK);
    if(!status || !ids.length) return;
    const valid = new Set(["Active","Check","Inactive","Banned"]);
    if(!valid.has(status)) return;

    const count = ids.length;
    if(!confirm(`Ubah status ${count} akun menjadi ${status}?`)) return;

    const wanted = new Set(ids);
    const now = new Date().toISOString();
    let changed = 0;
    vault.accounts.forEach(a => {
      if(wanted.has(a.id)){
        a.status = status;
        a.updatedAt = now;
        changed++;
      }
    });

    if(!changed){ toast("Tidak ada akun yang berubah."); return; }
    $("bulkApply").disabled = true;
    try{
      await saveLocalAndMaybeRemote();
      selectedIds.clear();
      $("bulkStatus").value = "";
      render();
      toast(`${changed} akun diubah menjadi ${status}.`);
    }catch(e){
      console.error(e);
      toast("Bulk update gagal: "+String(e.message||e).slice(0,100));
      render();
    }
  }

  render = function(){
    originalRender();
    ensureBulkUi();
    pruneSelection();
    const list = filtered();
    enhanceTable(list);
    enhanceMobile(list);
    updateBulkControls();
  };

  ensureBulkUi();
  render();
})();
