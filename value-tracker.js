// Silverback V3 - recent event value marker (StarPets + AMVGG)
(() => {
  function fmtMoney(v){return typeof v==='number'?`$${v.toFixed(v<1?2:2)}`:'—'}
  function fmtValue(v){return typeof v==='number'?String(v):'—'}
  function sourceCell(src,type){
    const val=type==='starpets'?fmtMoney(src?.value):fmtValue(src?.value);
    const state=src?.status||'unknown';
    const badge=state==='ok'?'Live':state==='stale'?'Last known':state==='seed'?'Seed':'Waiting';
    const link=src?.url?`<a href="${src.url}" target="_blank" rel="noopener">${val}</a>`:val;
    return `<div class="vt-source"><strong>${link}</strong><span>${badge}</span></div>`;
  }
  async function loadValues(){
    const res=await fetch(`./data/recent-values.json?t=${Date.now()}`,{cache:'no-store'});
    if(!res.ok)throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
  function ensurePanel(){
    if(document.getElementById('recentValuePanel'))return document.getElementById('recentValuePanel');
    const anchor=document.querySelector('.database-card')||document.querySelector('.main-content')||document.querySelector('main');
    if(!anchor)return null;
    const panel=document.createElement('section');panel.id='recentValuePanel';panel.className='recent-value-panel';
    panel.innerHTML=`<div class="vt-head"><div><div class="eyebrow">RECENT EVENT MARKER</div><h3>StarPets Price × AMVGG Value</h3></div><button id="refreshRecentValues" class="mini-btn" type="button">Refresh</button></div><div id="recentValueBody" class="vt-body">Loading…</div><div id="recentValueUpdated" class="vt-updated"></div>`;
    anchor.parentNode.insertBefore(panel,anchor);
    panel.querySelector('#refreshRecentValues').onclick=renderValues;
    if(!document.getElementById('valueTrackerStyles')){
      const s=document.createElement('style');s.id='valueTrackerStyles';s.textContent=`
      .recent-value-panel{margin:0 0 16px;padding:16px;border:1px solid #2a3037;border-radius:14px;background:#11161b}.vt-head{display:flex;justify-content:space-between;gap:12px;align-items:center}.vt-head h3{margin:4px 0 0;font-size:17px}.vt-week{margin-top:14px}.vt-week-title{font-size:11px;font-weight:800;letter-spacing:.08em;color:#a9b1b9;margin:0 0 8px}.vt-table{display:grid;grid-template-columns:minmax(150px,1.5fr) minmax(100px,.8fr) minmax(100px,.8fr);gap:1px;background:#2a3037;border:1px solid #2a3037;border-radius:10px;overflow:hidden}.vt-cell{background:#0d1116;padding:10px 12px;font-size:12px}.vt-cell.h{font-size:10px;font-weight:800;color:#89939d;letter-spacing:.06em}.vt-source{display:flex;align-items:center;justify-content:space-between;gap:8px}.vt-source span{font-size:9px;color:#89939d}.vt-source a{color:inherit;text-decoration:none}.vt-updated{margin-top:10px;color:#77818b;font-size:10px}@media(max-width:700px){.vt-table{grid-template-columns:1.2fr .8fr .8fr}.vt-cell{padding:8px;font-size:11px}.vt-source{display:grid;gap:2px}}
      `;document.head.appendChild(s)
    }
    return panel;
  }
  async function renderValues(){
    const panel=ensurePanel();if(!panel)return;
    const body=panel.querySelector('#recentValueBody');body.textContent='Refreshing…';
    try{
      const data=await loadValues();
      body.innerHTML=(data.weeks||[]).map(w=>`<div class="vt-week"><div class="vt-week-title">${w.label}</div><div class="vt-table"><div class="vt-cell h">PET</div><div class="vt-cell h">STARPETS</div><div class="vt-cell h">AMVGG</div>${(w.items||[]).map(i=>`<div class="vt-cell"><strong>${i.name}</strong></div><div class="vt-cell">${sourceCell(i.starpets,'starpets')}</div><div class="vt-cell">${sourceCell(i.amvgg,'amvgg')}</div>`).join('')}</div></div>`).join('');
      panel.querySelector('#recentValueUpdated').textContent=`Auto refresh source: every 6 hours • Data file updated ${new Date(data.updated_at).toLocaleString('id-ID')}`;
    }catch(e){body.textContent='Value tracker gagal dimuat. Tekan Refresh.';console.error(e)}
  }
  const oldRender=render;render=function(){oldRender();ensurePanel();renderValues()};
  ensurePanel();renderValues();
})();
