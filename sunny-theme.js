// EXAUDDD Vault - Thousand Sunny bright theme (safe)
(() => {
  document.documentElement.classList.add('sunny-theme');
  document.title = 'EXAUDDD Vault';

  function setText(selector, value) {
    const el = document.querySelector(selector);
    if (el && el.textContent !== value) el.textContent = value;
  }

  function applyBranding() {
    setText('.brand-title', 'EXAUDDD');
    setText('.brand-sub', 'VAULT V3');
    setText('.brand-logo', '☀');
    setText('.unlock-logo', '☀');
    setText('.empty-logo', '☀');
    setText('.unlock-card .eyebrow', 'EXAUDDD VAULT');
    setText('.hero h1', 'Welcome back, Captain!');
    setText('.footer strong', 'EXAUDDD VAULT V3');
    setText('.sidebar-footer span:first-child', 'EXAUDDD Vault');
  }

  if (!document.getElementById('exaudddSunnyTheme')) {
    const style = document.createElement('style');
    style.id = 'exaudddSunnyTheme';
    style.textContent = `
      html.sunny-theme{--bg:#e8f7ff;--panel:#fff9e8;--panel2:#fffdf5;--line:#d9b66f;--text:#17334a;--muted:#6f7f88;--silver:#ffb425;--silver2:#e57a12}
      html.sunny-theme body{background:linear-gradient(180deg,#54c8f2 0,#bcecff 34%,#f8fbf4 68%,#f3dfae 100%);background-attachment:fixed;color:var(--text)}
      html.sunny-theme .sidebar{background:linear-gradient(180deg,#fffceb,#fff3c6);border-right:2px solid #e9a62b;box-shadow:10px 0 30px rgba(76,143,176,.12)}
      html.sunny-theme .brand-title{color:#20394b}.sunny-theme .brand-sub{color:#e87d12;font-weight:900}
      html.sunny-theme .brand-logo,html.sunny-theme .unlock-logo,html.sunny-theme .empty-logo{background:radial-gradient(circle,#ffe76a 0 34%,#f6a21a 36% 60%,#e36f13 62% 100%);color:#683513;border:3px solid #fff3b5;box-shadow:0 4px 0 #bf6411}
      html.sunny-theme .nav-item{color:#53606a}html.sunny-theme .nav-item:hover{background:#fff2bd;color:#1d425a}
      html.sunny-theme .nav-item.active{background:linear-gradient(90deg,#f58b17,#ffc83d);border-color:#e37a12;color:#fff}
      html.sunny-theme .topbar{background:rgba(255,252,237,.95);border-bottom:1px solid #e1bd70}
      html.sunny-theme .top-left{color:#5e7180}html.sunny-theme .status-dot{background:#22a867}
      html.sunny-theme .top-btn,html.sunny-theme .menu-btn{background:#fff8e0;color:#594a2e;border-color:#deb962}
      html.sunny-theme .hero,html.sunny-theme .panel,html.sunny-theme .unlock-card,html.sunny-theme .modal{background:rgba(255,252,239,.96);border-color:#dfbd73;color:#24475e}
      html.sunny-theme .hero h1{color:#173b53}html.sunny-theme .hero p{color:#627886}html.sunny-theme .eyebrow{color:#d47712}
      html.sunny-theme .primary{color:#fff;background:linear-gradient(180deg,#ffb52c,#e87910);border-color:#cc6810}
      html.sunny-theme .secondary{color:#26516b;background:#f6fbfd;border-color:#8fc9e0}
      html.sunny-theme input,html.sunny-theme select,html.sunny-theme textarea{background:#fffef8;color:#24465e;border-color:#d9bc78}
      html.sunny-theme th{background:#fff2c8;color:#8a6728}html.sunny-theme td{color:#324d5f}
      html.sunny-theme .stat:nth-child(1){background:linear-gradient(145deg,#ffe88b,#ffc847)}
      html.sunny-theme .stat:nth-child(2){background:linear-gradient(145deg,#c8f3a5,#82d377)}
      html.sunny-theme .stat:nth-child(3){background:linear-gradient(145deg,#bde9ff,#56baf0)}
      html.sunny-theme .stat:nth-child(4){background:linear-gradient(145deg,#ffb8a7,#ef7666)}
      html.sunny-theme .stat:nth-child(5){background:linear-gradient(145deg,#e2c9ff,#a886e9)}
      html.sunny-theme dialog::backdrop{background:rgba(28,73,96,.55)}
      html.sunny-theme .secure-card{background:#fff8d9;border-color:#e7b94f;color:#5e4b26}
    `;
    document.head.appendChild(style);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyBranding, { once: true });
  } else {
    applyBranding();
  }
})();
