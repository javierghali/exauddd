// Silverback Vault V3 - bulk delete selected accounts
(() => {
  const MAX_BULK_DELETE = 1000;

  function ensureDeleteButton(){
    const toolbar=document.getElementById("bulkToolbar");
    if(!toolbar||document.getElementById("bulkDelete"))return;
    const clear=document.getElementById("bulkClear");
    const btn=document.createElement("button");
    btn.id="bulkDelete";
    btn.type="button";
    btn.className="danger-btn small";
    btn.textContent="Delete Selected";
    btn.disabled=true;
    if(clear?.parentElement)clear.insertAdjacentElement("afterend",btn);else toolbar.appendChild(btn);
    btn.addEventListener("click",deleteSelected);
    updateDeleteButton();
  }

  function selectedIds(){
    return [...new Set([...document.querySelectorAll('[data-account-select]:checked')]
      .map(el=>el.dataset.accountSelect).filter(Boolean))].slice(0,MAX_BULK_DELETE);
  }

  function updateDeleteButton(){
    const btn=document.getElementById("bulkDelete");
    if(!btn)return;
    const count=selectedIds().length;
    btn.disabled=count===0;
    btn.textContent=count?`Delete Selected (${count})`:"Delete Selected";
  }

  async function deleteSelected(){
    const ids=selectedIds();
    if(!ids.length){toast("Pilih akun yang ingin dihapus.");return}
    const wanted=new Set(ids);
    const count=vault.accounts.filter(a=>wanted.has(a.id)).length;
    if(!count){toast("Akun terpilih tidak ditemukan.");return}
    if(!confirm(`Hapus permanen ${count} akun terpilih dari vault? Tindakan ini tidak dapat dibatalkan.`))return;

    const before=vault.accounts.length;
    vault.accounts=vault.accounts.filter(a=>!wanted.has(a.id));
    const removed=before-vault.accounts.length;
    try{
      await saveLocalAndMaybeRemote();
      render();
      toast(`${removed} akun berhasil dihapus.`);
    }catch(err){
      console.error(err);
      toast("Bulk delete gagal: "+String(err.message||err).slice(0,100));
    }
  }

  document.addEventListener("change",e=>{
    if(e.target.matches?.('[data-account-select],#bulkSelectAll'))setTimeout(updateDeleteButton,0);
  });
  document.addEventListener("click",e=>{
    if(e.target.id==="bulkClear")setTimeout(updateDeleteButton,0);
  });

  const baseRender=render;
  render=function(){baseRender();ensureDeleteButton();setTimeout(updateDeleteButton,0)};
  ensureDeleteButton();
})();
