// Silverback Vault V3 - custom status bulk bridge
// Handles bulk application for statuses created through status.js.
(() => {
  function bind(){
    const btn=document.getElementById("bulkApply");
    if(!btn||btn.dataset.customStatusBound)return;
    btn.dataset.customStatusBound="1";
    btn.addEventListener("click",async e=>{
      const select=document.getElementById("bulkStatus");
      const status=String(select?.value||"").trim();
      const defaults=new Set(["Active","Facelock","Inactive","Banned"]);
      if(!status||defaults.has(status))return;

      e.preventDefault();e.stopImmediatePropagation();
      const ids=new Set([...document.querySelectorAll('[data-account-select]:checked')].map(el=>el.dataset.accountSelect).filter(Boolean));
      if(!ids.size){toast("Pilih account dulu.");return}
      if(ids.size>1000){toast("Maksimal 1000 account per bulk action.");return}
      if(!confirm(`Ubah status ${ids.size} akun menjadi ${status}?`))return;

      const now=new Date().toISOString();let changed=0;
      vault.accounts.forEach(a=>{if(ids.has(a.id)){a.status=status;a.updatedAt=now;changed++}});
      if(!changed){toast("Tidak ada akun yang berubah.");return}
      try{
        await saveLocalAndMaybeRemote();
        if(select)select.value="";
        render();toast(`${changed} akun diubah menjadi ${status}.`);
      }catch(err){console.error(err);toast("Bulk update gagal.")}
    },true);
  }

  const originalRender=render;
  render=function(){originalRender();bind()};
  bind();
})();
