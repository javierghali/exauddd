// EXAUDDD - Quick Actions cleanup
(() => {
  function normalizeText(el){return String(el?.textContent||'').replace(/\s+/g,' ').trim().toLowerCase()}

  function cleanupQuickActions(){
    const quick=document.querySelector('.quick-list');
    if(!quick)return;

    // Keep exactly one Owners -> Username control, preferring the canonical ownerSplitBtn.
    const ownerButtons=[...quick.querySelectorAll('button,label')].filter(el=>normalizeText(el).includes('owners → username'));
    let keep=document.getElementById('ownerSplitBtn') || ownerButtons[0] || null;
    ownerButtons.forEach(el=>{if(el!==keep)el.remove()});

    const exportUser=[...quick.querySelectorAll('button,label')].find(el=>normalizeText(el).includes('export username'));
    const verify=document.getElementById('verifyRobloxBtn');
    const sync=document.getElementById('quickSyncBtn');

    // Preferred order: Export Username -> Owners -> Verify -> Sync.
    if(exportUser&&keep)exportUser.insertAdjacentElement('afterend',keep);
    if(keep&&verify)keep.insertAdjacentElement('afterend',verify);
    if(verify&&sync)verify.insertAdjacentElement('afterend',sync);
    else if(keep&&sync)keep.insertAdjacentElement('afterend',sync);
  }

  cleanupQuickActions();
  document.addEventListener('DOMContentLoaded',cleanupQuickActions,{once:true});
  setTimeout(cleanupQuickActions,250);
})();
