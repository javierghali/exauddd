(()=>{
"use strict";
const $=(s,r=document)=>r.querySelector(s);
function ensureUI(){
 if($("#chunkSplitterDialog"))return;
 const d=document.createElement("dialog");d.id="chunkSplitterDialog";
 d.innerHTML=`<div class="modal"><div class="modal-head"><div><div class="eyebrow">LOCAL TOOL</div><h2>Pemecah per Bagian</h2></div><button type="button" class="icon-btn" id="chunkClose">×</button></div>
 <div class="notice">Tempel daftar data, pilih jumlah data per bagian, lalu pilih bagian yang ingin diambil. Isi baris tidak diubah.</div>
 <label style="display:block;margin-top:16px">Input<textarea id="chunkInput" rows="10" style="width:100%;margin-top:8px" placeholder="1 baris = 1 data"></textarea></label>
 <div class="form-grid" style="margin-top:14px"><label>Jumlah per bagian<select id="chunkSize"><option>10</option><option>20</option><option>25</option><option>50</option><option>100</option></select></label><label>Pilih bagian<select id="chunkPart"><option value="all">Semua data</option></select></label></div>
 <div id="chunkCount" style="margin:12px 0;opacity:.75">0 data</div>
 <label style="display:block">Hasil<textarea id="chunkOutput" rows="10" readonly style="width:100%;margin-top:8px"></textarea></label>
 <div class="modal-actions"><button type="button" class="secondary" id="chunkClear">Clear</button><span class="spacer"></span><button type="button" class="secondary" id="chunkDownload">Download TXT</button><button type="button" class="primary" id="chunkCopy">Copy Result</button></div></div>`;
 document.body.appendChild(d);
 const input=$("#chunkInput"),size=$("#chunkSize"),part=$("#chunkPart"),output=$("#chunkOutput"),count=$("#chunkCount");
 const run=()=>{const lines=input.value.replace(/\r/g,"").split("\n").map(x=>x.trim()).filter(Boolean),n=Math.max(1,Number(size.value)||10),parts=Math.ceil(lines.length/n),prev=part.value;part.innerHTML=`<option value="all">Semua data (${lines.length})</option>`;for(let i=0;i<parts;i++){const a=i*n,b=Math.min(a+n,lines.length),o=document.createElement("option");o.value=String(i);o.textContent=`Bagian ${i+1} — ${a+1}-${b}`;part.appendChild(o)}if([...part.options].some(o=>o.value===prev))part.value=prev;let selected=lines;if(part.value!=="all"){const i=Number(part.value);selected=lines.slice(i*n,(i+1)*n)}output.value=selected.join("\n");count.textContent=`${lines.length} data • ${selected.length} dipilih • ${part.options[part.selectedIndex]?.textContent||""}`};
 input.addEventListener("input",run);size.addEventListener("change",()=>{part.value="all";run()});part.addEventListener("change",run);
 $("#chunkClose").onclick=()=>d.close();$("#chunkClear").onclick=()=>{input.value="";run();input.focus()};
 $("#chunkCopy").onclick=async()=>{if(!output.value)return;try{await navigator.clipboard.writeText(output.value)}catch{output.select();document.execCommand("copy")}};
 $("#chunkDownload").onclick=()=>{if(!output.value)return;const u=URL.createObjectURL(new Blob([output.value],{type:"text/plain"})),a=document.createElement("a");a.href=u;a.download="pemecah-bagian.txt";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
}
function install(){const splitter=$("#navTextSplitter");if(!splitter||$("#navChunkSplitter"))return;const b=document.createElement("button");b.id="navChunkSplitter";b.className="nav-item";b.innerHTML="<span>⑩</span>Pemecah per Bagian";b.onclick=()=>{ensureUI();$("#chunkSplitterDialog").showModal();setTimeout(()=>$("#chunkInput")?.focus(),0)};splitter.insertAdjacentElement("afterend",b)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(install,0));else setTimeout(install,0);
})();