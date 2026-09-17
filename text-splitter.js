(()=>{
  "use strict";

  const $=(s,r=document)=>r.querySelector(s);

  function parseLine(line){
    const first=line.indexOf(":");
    if(first<0) return [line,"",""];
    const second=line.indexOf(":",first+1);
    if(second<0) return [line.slice(0,first),line.slice(first+1),""];
    return [line.slice(0,first),line.slice(first+1,second),line.slice(second+1)];
  }

  function formatLine(line,mode){
    const [c1,c2,c3]=parseLine(line);
    if(mode==="c1") return c1;
    if(mode==="c2") return c2;
    if(mode==="c3") return c3;
    if(mode==="c1c2") return `${c1}:${c2}`;
    if(mode==="c1c3") return `${c1}:${c3}`;
    if(mode==="mask") return `${c1}:x:${c3}`;
    return `${c1}:${c2}:${c3}`;
  }

  function ensureUI(){
    if($("#textSplitterDialog")) return;
    const d=document.createElement("dialog");
    d.id="textSplitterDialog";
    d.innerHTML=`<div class="modal" style="width:min(820px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto">
      <div class="modal-head"><div><div class="eyebrow">LOCAL TOOL</div><h2>Text Splitter</h2></div><button type="button" class="icon-btn" id="splitterClose">×</button></div>
      <div class="notice">Semua proses dilakukan lokal di browser dan tidak disimpan ke vault, Supabase, atau GitHub. Format: kolom1:kolom2:kolom3.</div>
      <label style="display:block;margin-top:14px">Input<textarea id="splitterInput" rows="8" placeholder="kolom1:kolom2:kolom3&#10;kolom1:kolom2:kolom3" style="width:100%;margin-top:7px"></textarea></label>
      <div style="margin-top:12px;font-weight:700">Format Options</div>
      <div id="splitterModes" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:8px">
        <button type="button" class="secondary" data-mode="c1">Kolom 1</button>
        <button type="button" class="secondary" data-mode="c2">Kolom 2</button>
        <button type="button" class="secondary" data-mode="c3">Kolom 3</button>
        <button type="button" class="secondary" data-mode="c1c2">Kolom 1:Kolom 2</button>
        <button type="button" class="secondary" data-mode="c1c3">Kolom 1:Kolom 3</button>
        <button type="button" class="primary" data-mode="mask">Kolom 1:x:Kolom 3</button>
      </div>
      <label style="display:flex;gap:8px;align-items:center;margin-top:12px"><input id="splitterDedup" type="checkbox" checked> Remove duplicate lines</label>
      <div id="splitterCount" style="margin:10px 0;opacity:.75">0 lines</div>
      <label style="display:block">Result<textarea id="splitterOutput" rows="8" readonly style="width:100%;margin-top:7px"></textarea></label>
      <div class="modal-actions" style="flex-wrap:wrap"><button type="button" class="secondary" id="splitterClear">Clear</button><span class="spacer"></span><button type="button" class="secondary" id="splitterDownload">Download TXT</button><button type="button" class="primary" id="splitterCopy">Copy Result</button></div>
    </div>`;
    document.body.appendChild(d);

    const input=$("#splitterInput"), output=$("#splitterOutput"), dedup=$("#splitterDedup"), count=$("#splitterCount");
    let mode="mask";

    const markMode=()=>{
      d.querySelectorAll("[data-mode]").forEach(b=>{
        const active=b.dataset.mode===mode;
        b.classList.toggle("primary",active);
        b.classList.toggle("secondary",!active);
      });
    };
    const run=()=>{
      let lines=input.value.replace(/\r/g,"").split("\n").map(s=>s.trim()).filter(Boolean);
      const sourceCount=lines.length;
      if(dedup.checked) lines=[...new Set(lines)];
      const out=lines.map(line=>formatLine(line,mode));
      output.value=out.join("\n");
      count.textContent=`${sourceCount} lines • ${out.length} result${dedup.checked?` • ${sourceCount-out.length} duplicate removed`:""}`;
    };

    d.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>{mode=b.dataset.mode;markMode();run()});
    input.addEventListener("input",run);
    dedup.addEventListener("change",run);
    $("#splitterClose").onclick=()=>d.close();
    $("#splitterClear").onclick=()=>{input.value="";output.value="";count.textContent="0 lines";input.focus()};
    $("#splitterCopy").onclick=async()=>{if(!output.value)return;try{await navigator.clipboard.writeText(output.value)}catch{output.select();document.execCommand("copy")}};
    $("#splitterDownload").onclick=()=>{if(!output.value)return;const url=URL.createObjectURL(new Blob([output.value],{type:"text/plain"}));const a=document.createElement("a");a.href=url;a.download="splitter-result.txt";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
    d.addEventListener("close",()=>{input.value="";output.value="";count.textContent="0 lines";mode="mask";markMode()});
    markMode();
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
