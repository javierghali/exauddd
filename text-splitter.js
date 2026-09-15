(()=>{
  "use strict";

  const $=(s,r=document)=>r.querySelector(s);
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));

  function transformLine(line){
    const first=line.indexOf(":");
    if(first<0) return line;
    const second=line.indexOf(":",first+1);
    if(second<0) return line;
    return line.slice(0,first+1)+"x"+line.slice(second);
  }

  function ensureUI(){
    if($("#textSplitterDialog")) return;
    const d=document.createElement("dialog");
    d.id="textSplitterDialog";
    d.innerHTML=`<div class="modal" style="width:min(760px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto">
      <div class="modal-head"><div><div class="eyebrow">LOCAL TOOL</div><h2>Text Splitter</h2></div><button type="button" class="icon-btn" id="splitterClose">×</button></div>
      <div class="notice">Diproses hanya di memori browser. Format generik: kolom1:kolom2:kolom3 → kolom1:x:kolom3.</div>
      <label style="display:block;margin-top:14px">Input<textarea id="splitterInput" rows="9" placeholder="kolom1:kolom2:kolom3" style="width:100%;margin-top:7px"></textarea></label>
      <label style="display:flex;gap:8px;align-items:center;margin-top:10px"><input id="splitterDedup" type="checkbox" checked> Remove duplicate lines</label>
      <div id="splitterCount" style="margin:10px 0;opacity:.75">0 lines</div>
      <label style="display:block">Result<textarea id="splitterOutput" rows="9" readonly style="width:100%;margin-top:7px"></textarea></label>
      <div class="modal-actions" style="flex-wrap:wrap"><button type="button" class="secondary" id="splitterClear">Clear</button><span class="spacer"></span><button type="button" class="secondary" id="splitterDownload">Download TXT</button><button type="button" class="primary" id="splitterCopy">Copy Result</button></div>
    </div>`;
    document.body.appendChild(d);

    const input=$("#splitterInput"), output=$("#splitterOutput"), dedup=$("#splitterDedup"), count=$("#splitterCount");
    const run=()=>{
      let lines=input.value.replace(/\r/g,"").split("\n").map(s=>s.trim()).filter(Boolean);
      const sourceCount=lines.length;
      if(dedup.checked) lines=[...new Set(lines)];
      const out=lines.map(transformLine);
      output.value=out.join("\n");
      count.textContent=`${sourceCount} lines • ${out.length} result${dedup.checked?` • ${sourceCount-out.length} duplicate removed`:""}`;
    };
    input.addEventListener("input",run); dedup.addEventListener("change",run);
    $("#splitterClose").onclick=()=>d.close();
    $("#splitterClear").onclick=()=>{input.value="";output.value="";count.textContent="0 lines";input.focus()};
    $("#splitterCopy").onclick=async()=>{if(!output.value)return;try{await navigator.clipboard.writeText(output.value)}catch{output.select();document.execCommand("copy")}};
    $("#splitterDownload").onclick=()=>{if(!output.value)return;const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([output.value],{type:"text/plain"}));a.download="splitter-result.txt";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
    d.addEventListener("close",()=>{input.value="";output.value="";count.textContent="0 lines"});
  }

  function installNav(){
    const nav=$("#sidebar .nav"), settings=$("#navSettings");
    if(!nav||!settings||$("#navTextSplitter")) return;
    const b=document.createElement("button");
    b.id="navTextSplitter";b.className="nav-item";b.innerHTML="<span>✂</span>Splitter";
    b.onclick=()=>{ensureUI();const d=$("#textSplitterDialog");d.showModal();setTimeout(()=>$("#splitterInput")?.focus(),0)};
    nav.insertBefore(b,settings);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",installNav); else installNav();
})();
