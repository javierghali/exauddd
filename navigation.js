// EXAUDDD Vault V3 - sidebar navigation helpers
(() => {
  function navButton(name){return [...document.querySelectorAll('.nav-item')].find(b=>b.textContent.trim().endsWith(name))}
  function setActive(btn){document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b===btn))}
  function bind(){
    const dashboard=navButton('Dashboard');
    const accounts=navButton('Accounts');
    if(dashboard&&!dashboard.dataset.navBound){
      dashboard.dataset.navBound='1';
      dashboard.addEventListener('click',()=>{setActive(dashboard);window.scrollTo({top:0,behavior:'smooth'})});
    }
    if(accounts&&!accounts.dataset.navBound){
      accounts.dataset.navBound='1';
      accounts.addEventListener('click',()=>{
        if(!masterKey){toast('Unlock vault dulu.');return}
        setActive(accounts);
        document.querySelector('.accounts-panel')?.scrollIntoView({behavior:'smooth',block:'start'});
        setTimeout(()=>document.getElementById('searchInput')?.focus({preventScroll:true}),350);
      });
    }
  }
  function loadZekeHubPanel(){
    if(document.querySelector('script[data-zekehub-panel]'))return;
    const s=document.createElement('script');s.src='zekehub-sync.js';s.dataset.zekehubPanel='1';document.body.appendChild(s);
  }
  bind();loadZekeHubPanel();
  const baseRender=render;
  render=function(){baseRender();bind()};
})();