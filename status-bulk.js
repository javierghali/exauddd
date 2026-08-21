// Silverback Vault V3 - custom status bulk bridge + UI extensions
(() => {
  function loadModule(src,id){
    if(document.getElementById(id))return;
    const s=document.createElement('script');s.src=src;s.id=id;document.body.appendChild(s);
  }

  function cleanupBackupUi(){
    const backup=[...document.querySelectorAll('.nav-item')].find(b=>b.textContent.trim().endsWith('Backup'));
    if(backup)backup.remove();
    const exportBtn=document.getElementById('exportBtn');
    if(exportBtn)exportBtn.closest('button')?.remove();
    const importInput=document.getElementById('importInput');
    const importLabel=importInput?.closest('label');
    const span=importLabel?.querySelector('span');
    if(span)span.textContent='Import TXT';
  }

  function bind(){
    const btn=document.getElementById('bulkApply');
    if(!btn||btn.dataset.customStatusBound)return;
    btn.dataset.customStatusBound='1';
    btn.addEventListener('click',async e=>{
      const select=document.getElementById('bulkStatus');
      const status=String(select?.value||'').trim();
      const defaults=new Set(['Active','Facelock','Inactive','Banned']);
      if(!status||defaults.has(status))return;

      e.preventDefault();e.stopImmediatePropagation();
      const ids=new Set([...document.querySelectorAll('[data-account-select]:checked')].map(el=>el.dataset.accountSelect).filter(Boolean));
      if(!ids.size){toast('Pilih account dulu.');return}
      if(ids.size>1000){toast('Maksimal 1000 account per bulk action.');return}
      if(!confirm(`Ubah status ${ids.size} akun menjadi ${status}?`))return;

      const now=new Date().toISOString();let changed=0;
      vault.accounts.forEach(a=>{if(ids.has(a.id)){a.status=status;a.updatedAt=now;changed++}});
      if(!changed){toast('Tidak ada akun yang berubah.');return}
      try{
        await saveLocalAndMaybeRemote();
        if(select)select.value='';
        render();toast(`${changed} akun diubah menjadi ${status}.`);
      }catch(err){console.error(err);toast('Bulk update gagal.')}
    },true);
  }

  cleanupBackupUi();
  loadModule('./bulk-delete.js','bulkDeleteModule');
  loadModule('./navigation.js','navigationModule');
  loadModule('./bulk-group.js','bulkGroupModule');

  const originalRender=render;
  render=function(){originalRender();bind();cleanupBackupUi()};
  bind();
})();
