// EXAUDDD responsive sidebar collapse control
(() => {
  const KEY='exauddd.sidebar.collapsed';
  const sidebar=document.getElementById('sidebar');
  if(!sidebar)return;
  const btn=document.createElement('button');
  btn.type='button';
  btn.className='sidebar-toggle';
  btn.setAttribute('aria-label','Tutup sidebar');
  sidebar.appendChild(btn);

  const isNarrow=()=>window.matchMedia('(max-width:1000px)').matches;
  const stored=localStorage.getItem(KEY);
  const initial=stored===null ? isNarrow() : stored==='1';

  function apply(collapsed,save=true){
    document.body.classList.toggle('sidebar-collapsed',collapsed);
    btn.textContent=collapsed?'›':'‹';
    btn.setAttribute('aria-label',collapsed?'Buka sidebar':'Tutup sidebar');
    btn.title=collapsed?'Buka sidebar':'Tutup sidebar';
    if(save)localStorage.setItem(KEY,collapsed?'1':'0');
  }
  apply(initial,false);

  btn.addEventListener('click',()=>apply(!document.body.classList.contains('sidebar-collapsed')));

  const menu=document.getElementById('menuBtn');
  if(menu){
    menu.addEventListener('click',e=>{
      if(!isNarrow())return;
      e.preventDefault();
      e.stopImmediatePropagation();
      apply(!document.body.classList.contains('sidebar-collapsed'));
    },true);
  }

  document.addEventListener('click',e=>{
    if(!isNarrow()||document.body.classList.contains('sidebar-collapsed'))return;
    if(sidebar.contains(e.target)||e.target===menu)return;
    apply(true);
  });

  let lastNarrow=isNarrow();
  window.addEventListener('resize',()=>{
    const now=isNarrow();
    if(now!==lastNarrow){
      lastNarrow=now;
      if(now)apply(true,false);
    }
  });
})();
