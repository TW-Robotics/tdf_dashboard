(function(){
const L=window.Lab, {esc}=L, ART=window.LAB_ART;
let ROBOTS=[], byId={}, fleet={models:[],instances:[]}, config={}, liveOk=false, loaded=false;
let filter="all", query="", polling=null;
const selected={};
const $=selector=>document.querySelector(selector);
const devicesFor=id=>fleet.instances.filter(device=>device.modelId===id);
function selectedDevice(model, devices=devicesFor(model.id)){
  const device=devices.find(item=>item.id===selected[model.id])||devices[0];
  if(device)selected[model.id]=device.id;
  return device;
}
function aggregate(model){
  const devices=devicesFor(model.id), free=devices.filter(device=>L.state(device)==="free").length;
  const color=!devices.length||devices.some(device=>L.state(device)==="unknown")?"neutral"
    :free===devices.length?"free":free>0?"use":"occ";
  return `<span class="pill ${color}">${free} / ${devices.length} free</span>`;
}
function counts(){
  $("#cFleet").textContent=loaded?ROBOTS.length:"";
  $("#cFree").textContent=loaded?fleet.instances.filter(device=>L.state(device)==="free").length+" free":"";
}
function connection(){
  $("#liveBadge").classList.toggle("off",!liveOk);
  $("#liveText").textContent=liveOk?"Live status":loaded?"Status may be outdated":"Connecting…";
  const note=$("#connectionNote");
  note.hidden=liveOk;
  note.textContent=loaded?"Server not reachable. Showing the last known status; bookings are unavailable until the connection returns.":"Loading the shared inventory. A server connection is required to view current availability.";
}
function route(){
  counts();
  if(!loaded){$("#view").innerHTML='<p class="note-bar">Waiting for the lab server…</p>';return}
  const hash=(location.hash||"#fleet").slice(1);
  const view=hash==="status"?"status":hash.startsWith("doc-")&&byId[hash.slice(4)]?"doc":"fleet";
  document.querySelectorAll(".tab").forEach(tab=>tab.setAttribute("aria-selected",String(tab.dataset.view===(view==="doc"?"fleet":view))));
  if(view==="status")renderStatus();else if(view==="doc")renderDoc(hash.slice(4));else renderFleet();
}
function go(hash){if(location.hash==="#"+hash)route();else location.hash=hash}
document.querySelectorAll(".tab").forEach(tab=>tab.onclick=()=>go(tab.dataset.view));
window.addEventListener("hashchange",()=>{route();window.scrollTo(0,0)});
function renderFleet(){
  const q=query.toLowerCase();
  const models=ROBOTS.filter(model=>!q||[model.name,model.maker,model.type,...devicesFor(model.id).flatMap(device=>[device.inventoryId,device.location])].join(" ").toLowerCase().includes(q));
  $("#view").innerHTML=`<div class="page-head"><div><h1>Robots in the lab</h1><p>Explore ${ROBOTS.length} models and ${fleet.instances.length} individual devices. Select a model for its setup guide and device details.</p></div>
    <label class="search"><span aria-hidden="true">⌕</span><input id="q" type="search" placeholder="Search model, device ID, maker" value="${esc(query)}" aria-label="Search robots"></label></div>
    <div class="grid">${models.map(model=>`<button class="tile" data-doc="${esc(model.id)}" aria-label="Open setup docs for ${esc(model.name)}">
      <div class="tile-art"><img src="${esc(model.image||ART[model.art])}" alt="${esc(model.name)}" loading="lazy"></div>
      <div class="tile-body"><span class="maker">${esc(model.maker)}</span><h3>${esc(model.name)}</h3>
      <div class="specs">${[model.axes?model.axes+"-axis":model.type,model.payload,model.reach].filter(value=>value&&!/^(PAYLOAD|REACH)$/.test(value)).map(value=>`<span class="chip">${esc(value)}</span>`).join("")}</div>
      <div class="tile-foot">${aggregate(model)}<span class="doclink">Setup docs →</span></div></div></button>`).join("")||"<p>No matching robot models.</p>"}</div>`;
  document.querySelectorAll("[data-doc]").forEach(button=>button.onclick=()=>go("doc-"+button.dataset.doc));
  const input=$("#q");
  input.oninput=event=>{query=event.target.value;const position=input.selectionStart;renderFleet();const next=$("#q");next.focus();next.setSelectionRange(position,position)};
}
function devicePicker(model, devices){
  const device=selectedDevice(model,devices);
  if(!device)return '<p class="meta">No active devices registered.</p>';
  return devices.length>1?`<label class="device-picker">Device ID<select data-device="${esc(model.id)}" aria-label="Device for ${esc(model.name)}">${devices.map(item=>L.option(item.id,`${item.inventoryId} — ${L.labels[L.state(item)]}`,device.id)).join("")}</select></label>`:`<p class="inventory-id">${esc(device.inventoryId)}</p>`;
}
function deviceDetails(device){
  if(!device)return "";
  const status=device.status;
  if(device.migrationPending)return '<p class="note-bar">The admin needs to match a previous booking to the correct device.</p>';
  return `<div class="device-state">${L.pill(device)}<span>${esc(device.location)}</span></div>
    ${status.usedByName?`<p class="who">Used by <strong>${esc(status.usedByName)}</strong></p>`:""}
    ${status.responsibleName?`<p class="meta">Responsible: ${esc(status.responsibleName)}</p>`:""}
    ${status.legacyPerson?`<p class="meta">Previous assignment: ${esc(status.legacyPerson)} · awaiting review</p>`:""}
    ${status.note?`<p class="meta">${esc(status.note)}</p>`:""}
    ${status.date?`<p class="meta">Until ${esc(L.date(status.date))}</p>`:""}
    ${status.since?`<p class="meta">In this status since ${esc(L.ago(status.since))}</p>`:""}`;
}
function bookingButton(device){
  if(!device||!config.publicEdit)return "";
  const available=liveOk&&!device.migrationPending&&device.status.state!=="occ";
  return `<button class="btn ${device.status.state==="free"?"primary":""}" data-book="${esc(device.id)}" ${available?"":"disabled"}>${device.status.state==="free"?"Book device":device.status.state==="use"?"Release device":"Managed by lab admin"}</button>`;
}
function renderStatus(){
  const totals={free:0,use:0,occ:0,unknown:0};
  fleet.instances.forEach(device=>totals[L.state(device)]++);
  const models=ROBOTS.filter(model=>devicesFor(model.id).some(device=>filter==="all"||L.state(device)===filter));
  $("#view").innerHTML=`<div class="page-head"><div><h1>Availability</h1><p>${config.publicEdit?"Choose a device ID to book or release that individual robot.":"Select a device ID to view its availability. The lab admin manages bookings."}</p></div></div>
    <div class="summary ${totals.unknown?"with-unknown":""}">${["free","use","occ",...(totals.unknown?["unknown"]:[])].map(key=>`<button class="sum ${key}" data-filter="${key}" aria-pressed="${filter===key}"><span>${L.labels[key]}</span><b>${totals[key]}</b></button>`).join("")}</div>
    <div class="legend"><span>Counts refer to individual devices.</span>${filter!=="all"?'<button class="btn" id="clearFilter">Show all</button>':""}</div>
    <div class="board">${models.map(model=>{
      const devices=devicesFor(model.id).filter(device=>filter==="all"||L.state(device)===filter),device=selectedDevice(model,devices);
      return `<article class="st ${L.state(device)} device-card"><div class="row"><span class="maker">${esc(model.maker)}</span>${aggregate(model)}</div>
        <h3>${esc(model.name)}</h3>${devicePicker(model,devices)}${deviceDetails(device)}${bookingButton(device)}<a href="#doc-${esc(model.id)}" class="doclink">Setup guide →</a></article>`;
    }).join("")||"<p>No devices match this filter.</p>"}</div>`;
  document.querySelectorAll("[data-filter]").forEach(button=>button.onclick=()=>{filter=filter===button.dataset.filter?"all":button.dataset.filter;renderStatus()});
  if($("#clearFilter"))$("#clearFilter").onclick=()=>{filter="all";renderStatus()};
  wireDevices();
}
function devicePanel(model){
  const devices=devicesFor(model.id),device=selectedDevice(model,devices);
  return `<div class="doc-device-panel">${aggregate(model)}${devicePicker(model,devices)}${deviceDetails(device)}
    ${device?`<p class="meta">Connection: ${esc(device.ip||"Not recorded")}</p>${device.connectionNotes?`<p class="meta">${esc(device.connectionNotes)}</p>`:""}`:""}
    ${bookingButton(device)}<a href="#status" class="doclink">All availability →</a></div>`;
}
function wireDevices(){
  document.querySelectorAll("[data-device]").forEach(input=>input.onchange=()=>{
    selected[input.dataset.device]=input.value;
    if(location.hash.startsWith("#doc-")){const model=byId[input.dataset.device];$("#deviceStatus").innerHTML=devicePanel(model);wireDevices()}else renderStatus();
  });
  document.querySelectorAll("[data-book]").forEach(button=>button.onclick=()=>{
    if(!liveOk)return;
    const device=fleet.instances.find(item=>item.id===button.dataset.book);
    L.openUsage(device,byId[device.modelId],{staff:config.responsiblePeople,
      save:(id,payload)=>L.request(`/api/instances/${encodeURIComponent(id)}/booking`,{method:"POST",body:JSON.stringify(payload)}),
      onSaved:()=>poll(true),onConflict:()=>poll(true),onClose:()=>{if(location.hash.startsWith("#doc-")&&$("#deviceStatus")&&byId[device.modelId]){$("#deviceStatus").innerHTML=devicePanel(byId[device.modelId]);wireDevices()}else route()}});
  });
}

/* ---------- Markdown-based docs (robots with docFile) ---------- */
const mdCache={};
const slug=t=>t.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"s";
function hiLines(text,lang){
  const c=/^(python|py|bash|sh|shell|ini|conf)$/.test(lang);
  return text.replace(/\n$/,"").split("\n").map(l=>{const e=esc(l);return c&&/^\s*(#|;)/.test(l)?`<span class="tok-c">${e}</span>`:e}).join("\n");
}
async function renderMdDoc(r){
  const id=r.id,i=ROBOTS.indexOf(r),prev=ROBOTS[i-1],next=ROBOTS[i+1];
  const file=r.docFile||("docs/"+id+".md");
  $("#view").innerHTML=`<div class="docs">
   <aside><div class="proj"><b>Lab Setup Docs</b><span>Digital Factory · v2026.11</span></div>
     <div class="toc-cap">Robots</div>
     ${ROBOTS.map(x=>`<a href="#doc-${x.id}" class="${x.id===id?"cur":""}">${esc(x.name)}</a>${x.id===id?'<div id="mdToc"></div>':""}`).join("")}</aside>
   <article><div class="crumbs"><span><a href="#fleet">Robots</a> » ${esc(r.maker)} » ${esc(r.name)}</span><span>Setup guide</span></div>
     <div class="prose" id="mdBody"><h1>${esc(r.name)} setup</h1><p class="doc-status">Loading documentation…</p></div></article></div>`;
  let md=mdCache[file];
  if(md==null){
    try{const x=await fetch(file,{cache:"no-cache"});if(!x.ok)throw 0;md=mdCache[file]=await x.text()}
    catch(_){md=null}
  }
  if(location.hash!=="#doc-"+id)return;
  const body=$("#mdBody");
  if(md==null){body.innerHTML=`<h1>${esc(r.name)} setup</h1><div class="adm warning"><div class="t">Warning</div><div class="b"><p>The guide <code>${esc(file)}</code> could not be loaded. Open the dashboard through the web server rather than as a local file.</p></div></div>`;return}
  const tmp=document.createElement("div");
  tmp.innerHTML=window.marked?window.marked.parse(md):`<pre>${esc(md)}</pre>`;
  tmp.querySelectorAll("hr").forEach(h=>h.remove());
  // headings that start with "!!!" become a tip box
  tmp.querySelectorAll("h1,h2,h3,h4").forEach(h=>{if(/^\s*!{2,}/.test(h.textContent)){
    const d=document.createElement("div");d.className="adm note";
    d.innerHTML=`<div class="t">Tip</div><div class="b"><p>${esc(h.textContent.replace(/^\s*!+\s*/,""))}</p></div>`;h.replaceWith(d)}});
  // blockquotes -> note / warning admonitions
  tmp.querySelectorAll("blockquote").forEach(q=>{
    const txt=q.textContent.trim(),warn=/^(warning|caution|danger)\b/i.test(txt);
    const strong=q.querySelector("p > strong:first-child");
    if(strong&&/^(note|warning|caution|tip|danger):?$/i.test(strong.textContent.trim())){const n=strong.nextSibling;strong.remove();if(n&&n.nodeType===3)n.textContent=n.textContent.replace(/^\s*:?\s*/,"")}
    const d=document.createElement("div");d.className="adm "+(warn?"warning":"note");
    d.innerHTML=`<div class="t">${warn?"Warning":"Note"}</div><div class="b"></div>`;
    d.querySelector(".b").append(...q.childNodes);q.replaceWith(d)});
  // code blocks
  tmp.querySelectorAll("pre > code").forEach(c=>{
    const lang=((c.className.match(/language-([\w-]+)/)||[])[1]||"text").toLowerCase();
    const box=document.createElement("div");box.className="hlbox";
    box.innerHTML=`<span class="lang">${esc(lang)}</span><button class="copy" type="button">Copy</button><pre>${hiLines(c.textContent,lang)}</pre>`;
    c.parentElement.replaceWith(box)});
  // tables
  tmp.querySelectorAll("table").forEach(t=>{const w=document.createElement("div");w.className="tbl";t.replaceWith(w);w.append(t)});
  // "*Expected output: ...*" lines read as result hints
  tmp.querySelectorAll("p > em:only-child").forEach(e=>{if(/^expected/i.test(e.textContent))e.parentElement.classList.add("expect")});
  // headings: ids, pilcrows, TOC
  const toc=[];const used={};
  tmp.querySelectorAll("h2,h3").forEach(h=>{let s=slug(h.textContent);while(used[s])s+="-x";used[s]=1;h.id="sec-"+s;
    if(h.tagName==="H2")h.insertAdjacentHTML("beforeend",`<a class="hl" href="#doc-${id}" data-sec="sec-${s}">¶</a>`);
    toc.push([h.tagName,h.id,h.textContent.replace(/¶$/,"")])});
  // title + status row
  const h1=tmp.querySelector("h1");
  const status=document.createElement("div");status.className="doc-status";
  status.id="deviceStatus"; status.innerHTML=devicePanel(r);
  if(h1){h1.after(status)}else{tmp.prepend(status);tmp.insertAdjacentHTML("afterbegin",`<h1>${esc(r.name)} setup</h1>`)}
  body.innerHTML="";body.append(...tmp.childNodes);
  body.insertAdjacentHTML("beforeend",`<div class="pager">${prev?`<button type="button" data-go="doc-${prev.id}">← ${esc(prev.name)}</button>`:"<span></span>"}${next?`<button type="button" data-go="doc-${next.id}">${esc(next.name)} →</button>`:"<span></span>"}</div>`);
  $("#mdToc").innerHTML=toc.map(([t,a,x])=>`<a class="sub${t==="H3"?" sub2":""}" href="#doc-${id}" data-sec="${a}">${esc(x)}</a>`).join("");
  wireDoc(); wireDevices();
}
function wireDoc(){
  document.querySelectorAll("[data-sec]").forEach(a=>a.onclick=e=>{e.preventDefault();const t=document.getElementById(a.dataset.sec);if(t)t.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion:reduce)").matches?"auto":"smooth"})});
  document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));
  document.querySelectorAll(".copy").forEach(b=>b.onclick=()=>{const pre=b.parentElement.querySelector("pre");const txt=pre.innerText;
    const done=()=>{b.textContent="Copied";setTimeout(()=>b.textContent="Copy",1400)};
    const sel=()=>{const rg=document.createRange();rg.selectNodeContents(pre);const s=getSelection();s.removeAllRanges();s.addRange(rg)};
    try{navigator.clipboard.writeText(txt).then(done,sel)}catch(_){sel()}});
}

/* ---------- docs: every robot has a Markdown guide in docs/<id>.md ---------- */
function renderDoc(id){return renderMdDoc(byId[id])}


function redraw(changed=true,catalogChanged=false){
  connection();counts();
  if(!changed)return;
  if($("#dlgHost").innerHTML||document.activeElement?.id==="q")return;
  const doc=location.hash.startsWith("#doc-")?byId[location.hash.slice(5)]:null;
  if(doc&&$("#deviceStatus")&&!catalogChanged){$("#deviceStatus").innerHTML=devicePanel(doc);wireDevices()}else route();
}
async function poll(force=false){
  if(polling){await polling;if(force)return poll();return}
  polling=(async()=>{
    let changed=false,catalogChanged=false;
    try{
      const [next,nextConfig]=await Promise.all([L.request("api/fleet"),L.request("api/config")]);
      if(!Array.isArray(next.models)||!Array.isArray(next.instances))throw new Error("Invalid inventory response");
      changed=!liveOk||!loaded||next.revision!==fleet.revision||nextConfig.publicEdit!==config.publicEdit;
      catalogChanged=JSON.stringify(next.models.map(model=>[model.id,model.version]))!==JSON.stringify(fleet.models.map(model=>[model.id,model.version]));
      fleet=next;config=nextConfig;ROBOTS=fleet.models;byId=Object.fromEntries(ROBOTS.map(model=>[model.id,model]));
      loaded=true;liveOk=true;
      try{sessionStorage.setItem("lab-fleet-snapshot",JSON.stringify(fleet))}catch(_){}
    }catch(_){changed=liveOk;liveOk=false}
    redraw(changed,catalogChanged);
  })().finally(()=>{polling=null});
  return polling;
}
try{
  const cached=JSON.parse(sessionStorage.getItem("lab-fleet-snapshot")||"null");
  if(cached&&Array.isArray(cached.models)&&Array.isArray(cached.instances)){
    fleet=cached;ROBOTS=fleet.models;byId=Object.fromEntries(ROBOTS.map(model=>[model.id,model]));loaded=true;
  }
}catch(_){}
connection();route();poll();
setInterval(poll,5000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)poll()});
})();
