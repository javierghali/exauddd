// Silverback V3 - recent event value marker (StarPets + AMVGG)
(() => {
  function fmtMoney(v){return typeof v==='number'?`$${v.toFixed(2)}`:'—'}
  function fmtValue(v){return typeof v==='number'?String(v):'—'}
  function fmtDelta(src,type){
    if(typeof src?.delta_percent!=='number')return '<span class="vt-delta neutral">No change data</span>';
    const up=src.delta_percent>0, down=src.delta_percent<0;
    const icon=up?'↑':down?'↓':'→';
    const cls=up?'up':down?'down':'neutral';
    const prev=type==='starpets'?fmtMoney(src.previous_value):fmtValue(src.previous_value);
    const pct=`${src.delta_percent>0?'+':''}${src.delta_percent.toFixed(2)}%`;
    return `<span class="vt-delta ${cls}">${icon} ${pct} <small>from ${prev}</small></span>`;
  }
  function sourceCell(src,type){
    const val=type==='starpets'?fmtMoney(src?.value):fmtValue(src?.value);
    const state=src?.status||'unknown';
    const badge=state==='ok'?'Live':state==='stale'?'Last known':state==='snapshot'?'Snapshot':state==='seed'?'Seed':'Waiting';
    const link=src?.url?`<a href="${src.url}" target="_blank" rel="noopener">${val}</a>`:val;
    return `<div class="vt-source"><div class="vt-price-line"><strong>${link}</strong><span>${badge}</span></div>${fmtDelta(src,type)}</div>`;
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
    panel.innerHTML=`<div class="vt-head"><div><div class="eyebrow">RECENT EVENT MARKER</div><h3>StarPets Price × AMVGG Value</h3><div class="vt-sub">Current week + previous week • latest value and movement</div></div><button id="refreshRecentValues" class="mini-btn" type="button">Refresh</button></div><div id="recentValueBody" class="vt-body">Loading…</div><div id="recentValueUpdated" class="vt-updated"></div>`;
    anchor.parentNode.insertBefore(panel,anchor);
    panel.querySelector('#refreshRecentValues').onclick=renderValues;
    if(!document.getElementById('valueTrackerStyles')){
      const s=document.createElement('style');s.id='valueTrackerStyles';s.textContent=`
      .recent-value-panel{margin:0 0 16px;padding:16px;border:1px solid #2a3037;border-radius:14px;background:#11161b}.vt-head{display:flex;justify-content:space-between;gap:12px;align-items:center}.vt-head h3{margin:4px 0 0;font-size:17px}.vt-sub{font-size:10px;color:#7f8993;margin-top:4px}.vt-week{margin-top:14px}.vt-week-title{font-size:11px;font-weight:800;letter-spacing:.08em;color:#a9b1b9;margin:0 0 8px}.vt-table{display:grid;grid-template-columns:minmax(150px,1.35fr) minmax(150px,1fr) minmax(150px,1fr);gap:1px;background:#2a3037;border:1px solid #2a3037;border-radius:10px;overflow:hidden}.vt-cell{background:#0d1116;padding:10px 12px;font-size:12px}.vt-cell.h{font-size:10px;font-weight:800;color:#89939d;letter-spacing:.06em}.vt-source{display:grid;gap:5px}.vt-price-line{display:flex;align-items:center;justify-content:space-between;gap:8px}.vt-price-line>span{font-size:9px;color:#89939d}.vt-source a{color:inherit;text-decoration:none}.vt-delta{display:block;font-size:10px;font-weight:700}.vt-delta small{font-weight:400;color:#7f8993}.vt-delta.up{color:#6fcf97}.vt-delta.down{color:#eb7f86}.vt-delta.neutral{color:#7f8993;font-weight:500}.vt-updated{margin-top:10px;color:#77818b;font-size:10px}@media(max-width:700px){.vt-table{grid-template-columns:1.15fr .95fr .95fr}.vt-cell{padding:8px;font-size:11px}.vt-price-line{display:grid;gap:2px}}
      `;document.head.appendChild(s)
    }
    return panel;
  }
  async function renderValues(){
    const panel=ensurePanel();if(!panel)return;
    const body=panel.querySelector('#recentValueBody');body.textContent='Refreshing…';
    try{
      const data=await loadValues();
      body.innerHTML=(data.weeks||[]).map(w=>`<div class="vt-week"><div class="vt-week-title">${w.label}</div><div class="vt-table"><div class="vt-cell h">PET</div><div class="vt-cell h">STARPETS USD</div><div class="vt-cell h">AMVGG VALUE</div>${(w.items||[]).map(i=>`<div class="vt-cell"><strong>${i.name}</strong></div><div class="vt-cell">${sourceCell(i.starpets,'starpets')}</div><div class="vt-cell">${sourceCell(i.amvgg,'amvgg')}</div>`).join('')}</div></div>`).join('');
      panel.querySelector('#recentValueUpdated').textContent=`Auto source check: every 6 hours • Data updated ${new Date(data.updated_at).toLocaleString('id-ID')}`;
    }catch(e){body.textContent='Value tracker gagal dimuat. Tekan Refresh.';console.error(e)}
  }
  const oldRender=render;render=function(){oldRender();ensurePanel();renderValues()};
  ensurePanel();renderValues();
})();
