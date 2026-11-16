(function(){
  const L=window.Lab,{esc}=L,$=selector=>document.querySelector(selector);
  let token="",data=null,online=false,refreshing=null,query="";
  const titles={usage:"Robot usage",models:"Robot models",instances:"Individual devices",people:"People register",imports:"Imported assignments"};
  const view=()=>Object.hasOwn(titles,location.hash.slice(1))?location.hash.slice(1):"usage";
  const api=(path,options={})=>L.request(path,{...options,headers:{"X-Lab-Token":token,...(options.headers||{})}});
  const modelFor=id=>data.models.find(model=>model.id===id);
  try{token=sessionStorage.getItem("lab-admin-token")||""}catch(_){}
  function toast(message,error=false){const host=$("#toast");host.textContent=message;host.classList.toggle("err",error);clearTimeout(toast.timeout);toast.timeout=setTimeout(()=>host.textContent="",6000)}
  function showLogin(message=""){
    $("#panel").hidden=true;$("#logout").hidden=true;$("#login").hidden=false;
    $("#loginErr").hidden=!message;$("#loginErr").textContent=message;$("#tokenIn").focus();
  }
  async function tryLogin(value){
    token=value;
    try{
      await api("/api/admin/login",{method:"POST"});
      try{sessionStorage.setItem("lab-admin-token",token)}catch(_){}
      $("#login").hidden=true;$("#panel").hidden=false;$("#logout").hidden=$("#devBanner").hidden===false;
      await refresh(true);
    }catch(error){showLogin(error.message)}
  }
  $("#loginForm").onsubmit=event=>{event.preventDefault();tryLogin($("#tokenIn").value.trim())};
  $("#logout").onclick=()=>{
    try{sessionStorage.removeItem("lab-admin-token")}catch(_){}
    token="";data=null;$("#tokenIn").value="";$("#adminView").innerHTML="";showLogin();
  };
  async function refresh(force=false){
    if(refreshing){await refreshing;if(force)return refresh();return}
    refreshing=(async()=>{
      let changed=false;
      try{const next=await api("/api/admin/snapshot");changed=!online||!data||next.revision!==data.revision;data=next;online=true}
      catch(error){changed=online;online=false;if(error.status===403){showLogin("Please sign in again.");return}toast(error.message,true)}
      $("#adminConnection").hidden=online;
      if(changed&&!$("#dlgHost").innerHTML)render();
    })().finally(()=>{refreshing=null});
    return refreshing;
  }
  function table(head,rows){return `<div class="admin-table-wrap"><table class="admin-table"><thead><tr>${head.map(value=>`<th>${esc(value)}</th>`).join("")}</tr></thead><tbody>${rows||`<tr><td colspan="${head.length}">No matching records.</td></tr>`}</tbody></table></div>`}
  function editButton(kind,id,label="Edit"){return `<button type="button" class="btn" data-edit="${kind}" data-id="${esc(id)}" ${online?"":"disabled"}>${esc(label)}</button>`}
  function matches(...values){return !query||values.join(" ").toLowerCase().includes(query.toLowerCase())}
  function usageHTML(){
    const totals={free:0,use:0,occ:0,unknown:0};
    data.instances.filter(device=>device.active&&modelFor(device.modelId).active).forEach(device=>totals[L.state(device)]++);
    const summary=`<div class="summary ${totals.unknown?"with-unknown":""}">${["free","use","occ",...(totals.unknown?["unknown"]:[])].map(key=>`<div class="sum ${key}"><span>${L.labels[key]}</span><b>${totals[key]}</b></div>`).join("")}</div>`;
    const devices=data.instances.filter(device=>device.active&&modelFor(device.modelId).active&&matches(device.inventoryId,modelFor(device.modelId).name,device.status.usedByName,device.status.responsibleName));
    return summary+table(["Device / model","Status","Student / user","Responsible","Until","Note / reason",""],devices.map(device=>{
      const status=device.status;
      return `<tr><td class="rname"><b>${esc(device.inventoryId)}</b><span>${esc(modelFor(device.modelId).name)}</span></td><td>${L.pill(device)}${status.needsReview?'<span class="review-label">Check imported name</span>':""}</td>
        <td>${esc(status.usedByName||status.legacyPerson||"—")}</td><td>${esc(status.responsibleName||"—")}</td><td>${esc(L.date(status.date)||"—")}</td><td>${esc(status.note||"—")}</td>
        <td>${device.migrationPending?'<a href="#imports">Match old booking →</a>':editButton("usage",device.id)}</td></tr>`;
    }).join(""));
  }
  function modelsHTML(){return table(["Model","ID","Devices","State",""],data.models.filter(model=>matches(model.name,model.maker,model.id)).map(model=>`<tr><td class="rname"><b>${esc(model.name)}</b><span>${esc(model.maker)}</span></td><td>${esc(model.id)}</td><td>${data.instances.filter(device=>device.modelId===model.id&&device.active).length} active</td><td>${model.active?"Active":"Inactive"}</td><td>${editButton("models",model.id)}</td></tr>`).join(""))}
  function devicesHTML(){return table(["Inventory ID","Model","Location","Connection","State",""],data.instances.filter(device=>matches(device.inventoryId,modelFor(device.modelId).name,device.location,device.ip)).map(device=>`<tr><td><b>${esc(device.inventoryId)}</b></td><td>${esc(modelFor(device.modelId).name)}</td><td>${esc(device.location||"—")}</td><td>${esc(device.ip||"Not recorded")}</td><td>${device.active?L.pill(device):"Inactive"}</td><td>${editButton("instances",device.id)}</td></tr>`).join(""))}
  function peopleHTML(){return table(["Name","Role","State",""],data.people.filter(person=>matches(person.name,person.role)).map(person=>`<tr><td>${esc(person.name)}${data.people.filter(other=>other.name===person.name).length>1?`<span class="record-reference">Reference ${esc(person.id.slice(0,6))}</span>`:""}</td><td>${person.role==="student"?"Student":"Staff"}</td><td>${person.active?"Active":"Inactive"}</td><td>${editButton("people",person.id)}</td></tr>`).join(""))}
  function importsHTML(){
    if(!data.migrationIssues.length)return '<div class="empty-state"><p>No assignments need matching.</p></div>';
    return `<p class="note-bar">Previous model-level bookings are preserved here. Select the device actually used, or archive an obsolete entry with an explanation.</p>`+table(["Previous model","Assignment","Reason",""],data.migrationIssues.map(issue=>`<tr><td>${esc(issue.modelId)}</td><td><pre class="legacy-entry">${esc(JSON.stringify(issue.data,null,2))}</pre></td><td>${esc(issue.reason)}</td><td>${editButton("imports",issue.id,"Resolve")}</td></tr>`).join(""));
  }
  function render(){
    if(!data)return;
    const current=view(),focused=document.activeElement?.id,position=focused==="adminQuery"?$("#adminQuery").selectionStart:null;
    document.querySelectorAll("[data-view]").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.view===current)));
    $("#importCount").textContent=data.migrationIssues.length?`(${data.migrationIssues.length})`:"";
    $("#adminView").innerHTML=`<div class="page-head"><div><h1>${titles[current]}</h1><p>${current==="usage"?"Book individual devices and keep students separate from responsible staff.":current==="instances"?"Use the inventory ID on the physical robot to identify it.":current==="people"?"Register students and staff. Existing assignments keep their person references.":current==="models"?"Shared specifications and setup guides for each model.":"Match preserved bookings from the previous inventory."}</p></div>
      <div class="head-actions">${["models","instances","people"].includes(current)?`<button class="btn primary" type="button" id="addRecord" ${online?"":"disabled"}>${{models:"Add model",instances:"Add device",people:"Register person"}[current]}</button>`:""}${current==="usage"?`<button class="btn" id="resetAll" type="button" ${online?"":"disabled"}>Set all to Free</button>`:""}</div></div>
      ${current!=="imports"?`<label class="search admin-search">Search<input id="adminQuery" type="search" value="${esc(query)}" placeholder="Filter records" aria-label="Search records"></label>`:""}
      ${{usage:usageHTML,models:modelsHTML,instances:devicesHTML,people:peopleHTML,imports:importsHTML}[current]()}`;
    if($("#adminQuery"))$("#adminQuery").oninput=event=>{query=event.target.value;render()};
    if(focused==="adminQuery"&&$("#adminQuery")){$("#adminQuery").focus();$("#adminQuery").setSelectionRange(position,position)}
    if($("#addRecord"))$("#addRecord").onclick=()=>editRecord(current);
    if($("#resetAll"))$("#resetAll").onclick=resetAll;
    document.querySelectorAll("[data-edit]").forEach(button=>button.onclick=()=>editRecord(button.dataset.edit,button.dataset.id));
  }
  document.querySelectorAll("[data-view]").forEach(button=>button.onclick=()=>{query="";if(location.hash==="#"+button.dataset.view)render();else location.hash=button.dataset.view});
  window.addEventListener("hashchange",()=>{query="";render()});
  const activeSelect=record=>L.select("active","State",L.option("true","Active",String(record.active??true))+L.option("false","Inactive",String(record.active??true)));
  async function saved(){await refresh(true);toast("Changes saved.")}
  function editRecord(kind,id){
    if(!online)return;
    if(kind==="usage"){
      const device=data.instances.find(item=>item.id===id);
      L.openUsage(device,modelFor(device.modelId),{admin:true,people:data.people,
        save:(deviceId,payload)=>api(`/api/status/${deviceId}`,{method:"PUT",body:JSON.stringify(payload)}),
        onSaved:saved,onConflict:()=>refresh(true),onClose:render});
      return;
    }
    if(kind==="imports"){resolveImport(Number(id));return}
    const record=data[kind].find(item=>item.id===id)||{};
    let fields="";
    if(kind==="people"){
      fields=L.field("name","Full name",record.name,'maxlength="120" required autocomplete="name"')+
        L.select("role","Role",L.option("student","Student",record.role||"student")+L.option("staff","Staff",record.role||"student"))+activeSelect(record);
    }else if(kind==="instances"){
      fields=L.field("inventoryId","Inventory ID",record.inventoryId,'maxlength="40" pattern="[A-Za-z0-9][A-Za-z0-9_-]*" required')+
        L.select("modelId","Model",data.models.filter(model=>model.active||model.id===record.modelId).map(model=>L.option(model.id,model.name,record.modelId)).join(""),'required')+
        L.field("location","Location",record.location,'maxlength="80"')+L.field("ip","IP address / connection",record.ip,'maxlength="120"')+
        L.field("connectionNotes","Connection notes",record.connectionNotes,'maxlength="400"')+activeSelect(record);
    }else{
      fields=(!id?L.field("id","Model ID", "",'maxlength="40" pattern="[a-z][a-z0-9_]*" required'):"")+
        [["name","Model name"],["maker","Manufacturer"],["type","Type"],["payload","Payload"],["reach","Reach / speed"],["repeat","Repeatability"],["ctrl","Controller"],["sw","Software"],["sdk","SDK / interfaces"]].map(([key,label])=>L.field(key,label,record[key],`maxlength="240" ${["name","maker"].includes(key)?"required":""}`)).join("")+
        L.field("axes","Axes",record.axes||0,'type="number" min="0" max="200" required')+
        L.select("docFile","Setup guide",L.option("","Select a guide…",record.docFile)+data.resources.docs.map(path=>L.option(path,path.replace("docs/",""),record.docFile)).join(""),'required')+
        L.select("image","Image",L.option("","Select an image…",record.image)+data.resources.images.map(path=>L.option(path,path.split("/").pop(),record.image)).join(""),'required')+activeSelect(record);
    }
    const form=L.modal(id?"Edit record":{people:"Register person",models:"Add model",instances:"Add device"}[kind],record.inventoryId||record.name||"",fields,async values=>{
      const payload={...values,active:values.active==="true",...(id?{version:record.version}:{})};
      if(kind==="models"){payload.axes=Number(values.axes);payload.art=record.art||""}
      await api(`/api/admin/${kind}${id?"/"+encodeURIComponent(id):""}`,{method:id?"PUT":"POST",body:JSON.stringify(payload)});
      await saved();
    },{onConflict:()=>refresh(true),onClose:render});
    form.classList.add("registry-form");
    if(kind==="instances"&&!id){
      const suggest=()=>{if(form.elements.inventoryId.value)return;const prefix=form.elements.modelId.value.toUpperCase()+"-";let number=1;while(data.instances.some(device=>device.inventoryId===prefix+String(number).padStart(3,"0")))number++;form.elements.inventoryId.value=prefix+String(number).padStart(3,"0")};
      form.elements.modelId.onchange=()=>{form.elements.inventoryId.value="";suggest()};suggest();
    }
  }
  function resetAll(){
    const revision=data.revision,count=data.instances.filter(device=>device.status.state!=="free").length;
    L.modal("Release all devices",`This clears ${count} assignments, including maintenance blocks. Device and people registers are retained.`,"",async()=>{
      await api("/api/admin/reset",{method:"POST",body:JSON.stringify({revision})});await saved();
    },{saveLabel:"Set all to Free",onConflict:()=>refresh(true),onClose:render});
  }
  function resolveImport(id){
    const issue=data.migrationIssues.find(item=>item.id===id),known=data.models.some(model=>model.id===issue.modelId);
    const candidates=data.instances.filter(device=>device.active&&device.status.state==="free"&&(!known||device.modelId===issue.modelId));
    const valid=issue.data&&["use","occ"].includes(issue.data.state);
    const fields=`<pre class="legacy-entry">${esc(JSON.stringify(issue.data,null,2))}</pre>`+
      (valid?L.select("instanceId","Device actually used",L.option("","Archive this entry instead","")+candidates.map(device=>L.option(device.id,device.inventoryId,"")).join("")):"")+
      L.field("resolution","Explanation (required when archiving)","",'maxlength="240"');
    L.modal("Resolve imported assignment",issue.modelId,fields,async values=>{
      const device=candidates.find(item=>item.id===values.instanceId);
      await api(`/api/admin/migration/${id}/resolve`,{method:"POST",body:JSON.stringify({...values,...(device?{version:device.status.version,instanceVersion:device.version}:{})})});
      await saved();
    },{onConflict:()=>refresh(true),onClose:render});
  }
  setInterval(()=>{if(!$("#panel").hidden)refresh()},10000);
  L.request("/api/config").then(config=>{
    $("#devBanner").hidden=!config.devMode;
    if(config.devMode)tryLogin("");else if(token)tryLogin(token);else showLogin();
  }).catch(error=>showLogin(error.message));
})();
