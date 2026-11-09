(function(){
const ROBOTS=window.LAB_ROBOTS, ART=window.LAB_ART;
const STATES={free:{label:"Free",cls:"free"},use:{label:"Busy",cls:"use"},occ:{label:"Occupied",cls:"occ"}};
const status={}; // id -> {state, person, note, since}
let col=null, liveOk=false, filter="all", query="", canEdit=true;
const byId=Object.fromEntries(ROBOTS.map(r=>[r.id,r]));
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const st=id=>status[id]||{state:"free"};
function ago(t){if(!t)return"";const m=Math.round((Date.now()-t)/60000);if(m<1)return"just now";if(m<60)return m+" min ago";const h=Math.round(m/60);if(h<24)return h+" h ago";return Math.round(h/24)+" d ago"}
function pill(id){const s=st(id),d=STATES[s.state]||STATES.free;return `<span class="pill ${d.cls}"><i></i>${d.label}</span>`}

/* ---------- routing ---------- */
function route(){
  const h=(location.hash||"#fleet").slice(1);
  let v="fleet",doc=null;
  if(h==="status")v="status";
  else if(h.startsWith("doc-")&&byId[h.slice(4)]){v="doc";doc=h.slice(4)}
  document.querySelectorAll(".tab").forEach(t=>t.setAttribute("aria-selected",String(t.dataset.view===(v==="doc"?"fleet":v))));
  if(v==="fleet")renderFleet();else if(v==="status")renderStatus();else renderDoc(doc);
  counts();
}
function go(h){if(location.hash==="#"+h)route();else location.hash=h}
document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>go(t.dataset.view));
window.addEventListener("hashchange",()=>{route();window.scrollTo(0,0)});
function counts(){
  $("#cFleet").textContent=ROBOTS.length;
  $("#cFree").textContent=ROBOTS.filter(r=>st(r.id).state==="free").length+" free";
}

/* ---------- fleet ---------- */
function renderFleet(){
  const q=query.toLowerCase();
  const list=ROBOTS.filter(r=>!q||(r.name+r.maker+r.type+r.cell).toLowerCase().includes(q));
  $("#view").innerHTML=`
   <div class="page-head">
     <div><h1>Robots in the lab</h1><p>Select a robot to open its setup documentation: power-up, network, software connection and shutdown.</p></div>
     <label class="search"><span aria-hidden="true">⌕</span><input id="q" type="search" placeholder="Search robot, maker, cell" value="${esc(query)}" aria-label="Search robots"></label>
   </div>
   <div class="grid">${list.map(r=>`
     <button class="tile" data-doc="${r.id}" aria-label="Open setup docs for ${esc(r.name)}">
       <div class="tile-art"><span class="cell">${r.cell}</span><img src="${ART[r.art]}" alt="${r.name}" loading="lazy"></div>
       <div class="tile-body">
         <span class="maker">${esc(r.maker)}</span>
         <h3>${esc(r.name)}</h3>
         <div class="specs"><span class="chip">${r.axes?r.axes+"-axis":r.art==="tb"?"ROS":"AMR"}</span><span class="chip">${r.payload}</span><span class="chip">${r.reach}</span></div>
         <div class="tile-foot">${pill(r.id)}<span class="doclink">Setup docs →</span></div>
       </div>
     </button>`).join("")||`<p>No robot matches “${esc(query)}”.</p>`}
   </div>`;
  document.querySelectorAll("[data-doc]").forEach(b=>b.onclick=()=>go("doc-"+b.dataset.doc));
  const qi=$("#q");qi.oninput=e=>{query=e.target.value;const pos=qi.selectionStart;renderFleet();const n=$("#q");n.focus();n.setSelectionRange(pos,pos)};
}

/* ---------- status board ---------- */
function renderStatus(){
  const n={free:0,use:0,occ:0};ROBOTS.forEach(r=>n[st(r.id).state]++);
  const list=ROBOTS.filter(r=>filter==="all"||st(r.id).state===filter);
  $("#view").innerHTML=`
   <div class="page-head">
     <div><h1>Availability</h1><p>${canEdit?"Tap a robot to book it, release it, or mark it out of service. Changes are visible to everyone with this page open.":"Live status of every robot. Bookings are managed by the lab admin – ask them to reserve a robot for you."}</p></div>
   </div>
   <div class="summary">
     ${["free","use","occ"].map(k=>`<button class="sum ${k}" data-f="${k}" aria-pressed="${filter===k}"><span>${k==="free"?"Free":k==="use"?"Busy (in use by a person)":"Occupied / out of service"}</span><b>${n[k]}</b></button>`).join("")}
   </div>
   <div class="legend"><span class="pill free"><i></i>Free – ready to book</span><span class="pill use"><i></i>Busy – using by a named person</span><span class="pill occ"><i></i>Occupied – maintenance, course or blocked</span>${filter!=="all"?`<button class="btn" id="clr">Show all</button>`:""}</div>
   ${liveOk?"":`<p class="note-bar" id="offNote">Server not reachable: changes are saved in this browser only.</p>`}
   <div class="board">${list.map(r=>{const s=st(r.id),d=STATES[s.state];
     const who=s.state==="use"?`Using by <strong>${esc(s.person||"Unknown")}</strong>`:s.state==="occ"?esc(s.note||"Occupied"):"Available";
     return `<button class="st ${d.cls}${canEdit?"":" ro"}" data-id="${r.id}" ${canEdit?"":`aria-disabled="true" tabindex="-1"`}>
       <div class="row"><span class="cellid">${r.cell}</span>${pill(r.id)}</div>
       <h3>${esc(r.name)}</h3>
       <div class="who">${who}</div>
       ${s.state!=="free"&&s.note&&s.state==="use"?`<div class="meta">${esc(s.note)}</div>`:""}
       <div class="meta">${s.since?"Since "+ago(s.since):r.maker}</div>
     </button>`}).join("")}</div>`;
  document.querySelectorAll("[data-f]").forEach(b=>b.onclick=()=>{filter=filter===b.dataset.f?"all":b.dataset.f;renderStatus()});
  const c=$("#clr");if(c)c.onclick=()=>{filter="all";renderStatus()};
  if(canEdit)document.querySelectorAll(".st").forEach(b=>b.onclick=()=>openDlg(b.dataset.id));
}

function openDlg(id){
  const r=byId[id],cur=st(id);let pick=cur.state;
  const host=$("#dlgHost");
  host.innerHTML=`<div class="scrim" id="scrim"><form class="dlg" id="dlg" role="dialog" aria-modal="true" aria-labelledby="dlgT">
    <h2 id="dlgT">${esc(r.name)}</h2><p class="sub">${esc(r.maker)} · ${r.cell}</p>
    <div class="choices">${Object.entries(STATES).map(([k,v])=>`<button type="button" class="choice ${v.cls}" data-k="${k}" aria-pressed="${pick===k}">${v.label}</button>`).join("")}</div>
    <label class="field" id="pf">Person using the robot<input id="person" maxlength="60" placeholder="e.g. Person ABC" value="${esc(cur.state==="use"?cur.person:"")}"></label>
    <label class="field" id="nf"><span id="nl">Note</span><input id="note" maxlength="80" placeholder="" value="${esc(cur.state!=="free"?cur.note||"":"")}"></label>
    <label class="field" id="tf" hidden>Lab token<input id="token" type="password" autocomplete="off"></label>
    <p class="err" id="err" hidden></p>
    <div class="actions"><button type="button" class="btn" id="cancel">Cancel</button><button class="btn primary" id="save">Save</button></div>
  </form></div>`;
  const sync=()=>{document.querySelectorAll(".choice").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.k===pick)));
    $("#pf").hidden=pick!=="use";$("#nf").hidden=pick==="free";
    $("#nl").textContent=pick==="occ"?"Reason":"Project or note (optional)";
    $("#note").placeholder=pick==="occ"?"e.g. Maintenance, Lecture RO3 until 16:00":"e.g. Pick-and-place thesis";};
  sync();
  document.querySelectorAll(".choice").forEach(b=>b.onclick=()=>{pick=b.dataset.k;sync();if(pick==="use")$("#person").focus()});
  const close=()=>{host.innerHTML=""};
  $("#cancel").onclick=close;
  $("#scrim").onclick=e=>{if(e.target.id==="scrim")close()};
  document.addEventListener("keydown",function k(e){if(e.key==="Escape"){close();document.removeEventListener("keydown",k)}});
  $("#dlg").onsubmit=async e=>{e.preventDefault();
    const person=$("#person").value.trim(),note=$("#note").value.trim(),err=$("#err");
    if(pick==="use"&&!person){err.textContent="Enter the name of the person using the robot.";err.hidden=false;return}
    const body={state:pick,person:pick==="use"?person:"",note:pick==="free"?"":note,since:pick==="free"?0:Date.now()};
    const same=cur.state===body.state&&(cur.person||"")===body.person&&(cur.note||"")===body.note;
    if(same){close();return}
    const tk=$("#token").value.trim();if(tk){try{localStorage.setItem("lab-token",tk)}catch(_){}}
    $("#save").disabled=true;$("#save").textContent="Saving…";
    try{await window.LAB_SAVE(id,body);close()}
    catch(x){$("#save").disabled=false;$("#save").textContent="Save";
      if(x&&x.code==="permission_denied")$("#tf").hidden=false;
      err.textContent=x&&x.code==="permission_denied"?"This lab requires a token to change the status. Enter it and save again.":"The status could not be saved. Check your connection and try again.";err.hidden=false}
  };
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
  let md=mdCache[id];
  if(md==null){
    try{const x=await fetch(file,{cache:"no-cache"});if(!x.ok)throw 0;md=mdCache[id]=await x.text()}
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
  status.innerHTML=`${pill(id)}<span>${r.cell}</span><span>IP ${esc(r.ip)}</span><a href="#status" style="color:var(--brand)">Book this robot →</a>`;
  if(h1){h1.after(status)}else{tmp.prepend(status);tmp.insertAdjacentHTML("afterbegin",`<h1>${esc(r.name)} setup</h1>`)}
  body.innerHTML="";body.append(...tmp.childNodes);
  body.insertAdjacentHTML("beforeend",`<div class="pager">${prev?`<button type="button" data-go="doc-${prev.id}">← ${esc(prev.name)}</button>`:"<span></span>"}${next?`<button type="button" data-go="doc-${next.id}">${esc(next.name)} →</button>`:"<span></span>"}</div>`);
  $("#mdToc").innerHTML=toc.map(([t,a,x])=>`<a class="sub${t==="H3"?" sub2":""}" href="#doc-${id}" data-sec="${a}">${esc(x)}</a>`).join("");
  wireDoc();
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

/* ---------- shared status: backend API, with localStorage fallback ---------- */
const API="api/status";
function setLive(state){const b=$("#liveBadge"),t=$("#liveText");
  b.classList.toggle("off",state!=="ok");
  t.textContent={ok:"Live status",local:"Local only",slow:"Server unreachable"}[state]||"Connecting…"}
function apply(obj){
  for(const k in status)delete status[k];
  for(const [id,v] of Object.entries(obj||{}))if(byId[id])status[id]=v;
  const onDoc=(location.hash||"").startsWith("#doc-"), typing=document.activeElement&&document.activeElement.id==="q";
  if($("#dlgHost").innerHTML||typing)counts();
  else if(onDoc){const ds=document.querySelector(".doc-status .pill");if(ds)ds.outerHTML=pill(location.hash.slice(5));counts()}
  else route();
}
function loadLocal(){try{return JSON.parse(localStorage.getItem("lab-status")||"{}")}catch(_){return{}}}
function saveLocal(){try{localStorage.setItem("lab-status",JSON.stringify(status))}catch(_){}}
let lastJSON="";
async function poll(){
  try{
    const r=await fetch(API,{cache:"no-store"});
    if(!r.ok)throw new Error(r.status);
    const txt=await r.text();
    if(!col){col=true;liveOk=true}
    setLive("ok");
    if(txt!==lastJSON){lastJSON=txt;apply(JSON.parse(txt))}
  }catch(e){
    if(col){setLive("slow")}else{setLive("local");apply(loadLocal())}
  }
}
/* save hook used by the dialog */
window.LAB_SAVE=async(id,body)=>{
  if(col){
    const r=await fetch(API+"/"+encodeURIComponent(id),{method:"PUT",headers:{"Content-Type":"application/json","X-Lab-Token":(()=>{try{return localStorage.getItem("lab-token")||""}catch(_){return""}})()},body:JSON.stringify(body)});
    if(!r.ok)throw {code:r.status===403?"permission_denied":"error"};
    await poll();
  }else{status[id]=body;saveLocal();route()}
};
fetch("api/config",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(c=>{if(c){canEdit=!!c.publicEdit;if(location.hash==="#status")route()}}).catch(()=>{});
route();
poll();
setInterval(poll,5000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)poll()});
})();
