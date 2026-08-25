// EXAUDDD Vault - Thousand Sunny bright theme
(() => {
  document.documentElement.classList.add('sunny-theme');
  document.title = 'EXAUDDD Vault';

  function setText(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.textContent = value;
  }

  function applyBranding() {
    setText('.brand-title', 'EXAUDDD');
    setText('.brand-sub', 'VAULT V3');
    setText('.brand-logo', '☀');
    setText('.unlock-logo', '☀');
    setText('.empty-logo', '☀');
    setText('.unlock-card .eyebrow', 'EXAUDDD VAULT');
    setText('.hero h1', 'Welcome back, Captain!');
    const footerBrand = document.querySelector('.footer strong');
    if (footerBrand) footerBrand.textContent = 'EXAUDDD VAULT V3';
    const sidebarFooter = document.querySelector('.sidebar-footer span:first-child');
    if (sidebarFooter) sidebarFooter.textContent = 'EXAUDDD Vault';

    const secure = document.querySelector('.secure-card');
    if (secure && !secure.querySelector('.sunny-quote')) {
      const quote = document.createElement('div');
      quote.className = 'sunny-quote';
      quote.innerHTML = '<strong>Set sail for the next adventure!</strong><span>— EXAUDDD Crew</span>';
      secure.appendChild(quote);
    }
  }

  const style = document.createElement('style');
  style.id = 'exaudddSunnyTheme';
  style.textContent = `
  html.sunny-theme {
    --bg:#e8f7ff; --panel:#fff9e8; --panel2:#fffdf5; --line:#d9b66f;
    --text:#17334a; --muted:#6f7f88; --silver:#ffb425; --silver2:#e57a12;
  }
  html.sunny-theme body{
    background:
      radial-gradient(circle at 14% 8%,rgba(255,255,255,.95) 0 4%,transparent 4.4%),
      radial-gradient(circle at 22% 12%,rgba(255,255,255,.8) 0 5%,transparent 5.4%),
      linear-gradient(180deg,#54c8f2 0,#bcecff 33%,#f8fbf4 67%,#f3dfae 100%);
    background-attachment:fixed;color:var(--text)
  }
  html.sunny-theme body:before{
    content:'';position:fixed;inset:0;pointer-events:none;z-index:-1;opacity:.28;
    background-image:repeating-linear-gradient(0deg,rgba(126,82,26,.06) 0 1px,transparent 1px 22px);
  }
  html.sunny-theme .sidebar{
    background:linear-gradient(180deg,rgba(255,252,235,.98),rgba(255,243,198,.96));
    border-right:2px solid #e9a62b;box-shadow:10px 0 30px rgba(76,143,176,.12)
  }
  html.sunny-theme .brand-title{color:#20394b;text-shadow:0 1px #fff}
  html.sunny-theme .brand-sub{color:#e87d12;font-weight:900}
  html.sunny-theme .brand-logo,html.sunny-theme .unlock-logo,html.sunny-theme .empty-logo{
    background:radial-gradient(circle,#ffe76a 0 34%,#f6a21a 36% 60%,#e36f13 62% 100%);
    color:#683513;border:3px solid #fff3b5;box-shadow:0 4px 0 #bf6411,0 8px 20px rgba(214,123,18,.28)
  }
  html.sunny-theme .brand-logo{font-size:24px}
  html.sunny-theme .nav-item{color:#53606a}
  html.sunny-theme .nav-item:hover{background:#fff2bd;color:#1d425a}
  html.sunny-theme .nav-item.active{
    background:linear-gradient(90deg,#f58b17,#ffc83d);border-color:#e37a12;color:#fff;
    box-shadow:0 5px 12px rgba(220,121,17,.22)
  }
  html.sunny-theme .secure-card{display:block;background:linear-gradient(180deg,#fff8d9,#ffeab0);border-color:#e7b94f;color:#5e4b26}
  html.sunny-theme .secure-card p{color:#8c7547}
  html.sunny-theme .sunny-quote{display:grid;gap:2px;margin-top:10px;padding-top:9px;border-top:1px dashed #d6a744;font-size:10px;color:#7c5d1d}
  html.sunny-theme .sunny-quote span{font-size:9px;color:#a07826}
  html.sunny-theme .sidebar-footer{color:#9a7835}
  html.sunny-theme .topbar{
    background:rgba(255,252,237,.9);border-bottom:1px solid #e1bd70;box-shadow:0 4px 18px rgba(45,122,160,.08)
  }
  html.sunny-theme .top-left{color:#5e7180}
  html.sunny-theme .status-dot{background:#22a867;box-shadow:0 0 0 3px rgba(34,168,103,.12)}
  html.sunny-theme .top-btn,html.sunny-theme .menu-btn{background:#fff8e0;color:#594a2e;border-color:#deb962}
  html.sunny-theme .top-btn.danger{background:#fff0df;color:#c64e32;border-color:#e6a17f}
  html.sunny-theme .content{position:relative}
  html.sunny-theme .hero{
    padding:21px 24px;border:1px solid #ddb35c;border-radius:17px;
    background:linear-gradient(105deg,rgba(255,249,221,.96),rgba(255,255,255,.82));
    box-shadow:0 12px 30px rgba(37,120,158,.10);position:relative;overflow:hidden
  }
  html.sunny-theme .hero:after{
    content:'☀  ⚓  ⛵';position:absolute;right:24px;bottom:-8px;font-size:45px;letter-spacing:10px;opacity:.12;transform:rotate(-4deg)
  }
  html.sunny-theme .hero h1{color:#173b53;font-size:31px}
  html.sunny-theme .hero p{color:#627886}
  html.sunny-theme .eyebrow{color:#d47712}
  html.sunny-theme .primary{color:#fff;background:linear-gradient(180deg,#ffb52c,#e87910);border-color:#cc6810;box-shadow:0 3px 0 #b65a0c}
  html.sunny-theme .secondary{color:#26516b;background:#f6fbfd;border-color:#8fc9e0}
  html.sunny-theme .danger-btn{color:#b73b32;background:#fff0e8;border-color:#e8a18b}
  html.sunny-theme .stats{gap:13px}
  html.sunny-theme .stat{border-color:rgba(255,255,255,.8);box-shadow:0 8px 20px rgba(53,118,148,.10);color:#17364c}
  html.sunny-theme .stat:nth-child(1){background:linear-gradient(145deg,#ffe88b,#ffc847)}
  html.sunny-theme .stat:nth-child(2){background:linear-gradient(145deg,#c8f3a5,#82d377)}
  html.sunny-theme .stat:nth-child(3){background:linear-gradient(145deg,#bde9ff,#56baf0)}
  html.sunny-theme .stat:nth-child(4){background:linear-gradient(145deg,#ffb8a7,#ef7666)}
  html.sunny-theme .stat:nth-child(5){background:linear-gradient(145deg,#e2c9ff,#a886e9)}
  html.sunny-theme .stat-icon{background:rgba(255,255,255,.43);border-color:rgba(255,255,255,.55);color:#224b63}
  html.sunny-theme .stat span,html.sunny-theme .stat small{color:#395c6f}
  html.sunny-theme .panel{background:rgba(255,252,239,.95);border-color:#dfbd73;box-shadow:0 10px 28px rgba(50,112,140,.09)}
  html.sunny-theme .panel-head,html.sunny-theme .filters{border-color:#e8d4a3}
  html.sunny-theme .panel-head h2,html.sunny-theme .mini-head{color:#244359}
  html.sunny-theme .search,html.sunny-theme input,html.sunny-theme select,html.sunny-theme textarea{
    background:#fffef8;color:#24465e;border-color:#d9bc78
  }
  html.sunny-theme input:focus,html.sunny-theme select:focus,html.sunny-theme textarea:focus{border-color:#e5921d;box-shadow:0 0 0 3px rgba(233,146,29,.12)}
  html.sunny-theme th{background:#fff2c8;color:#8a6728;border-color:#ead5a0}
  html.sunny-theme td{color:#324d5f;border-color:#eee0ba;background:rgba(255,255,255,.18)}
  html.sunny-theme tr:hover td{background:#fff7d8}
  html.sunny-theme .mini-btn,html.sunny-theme .quick-list button,html.sunny-theme .quick-list label{background:#fff9e5;color:#365266;border-color:#dfc384}
  html.sunny-theme .status-pill{background:#fff3c7;border-color:#ddbd6d;color:#5a4b2d}
  html.sunny-theme .table-footer,html.sunny-theme .footer{color:#8b7650;border-color:#dfca96}
  html.sunny-theme .footer strong{color:#d16d10}
  html.sunny-theme .unlock-card,html.sunny-theme .modal{background:linear-gradient(180deg,#fffdf5,#fff3cf);color:#24475e;border-color:#dfb55d;box-shadow:0 24px 70px rgba(48,103,127,.22)}
  html.sunny-theme dialog::backdrop{background:rgba(28,73,96,.55);backdrop-filter:blur(4px)}
  html.sunny-theme .notice{background:#fff7d8;color:#806d45;border-color:#e2c683}
  html.sunny-theme .toast{background:#f49a1f;color:white}
  html.sunny-theme .mobile-account{background:#fffaf0;border-color:#dfbd73}
  @media(max-width:850px){html.sunny-theme .sidebar{box-shadow:16px 0 40px rgba(20,72,98,.25)}}
  `;
  document.head.appendChild(style);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyBranding);
  } else {
    applyBranding();
  }

  const observer = new MutationObserver(() => applyBranding());
  observer.observe(document.documentElement, { childList:true, subtree:true });
})();
