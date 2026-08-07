const $=id=>document.getElementById(id);
let db=null,boreCount=0,projects=[],selectedProject=null;

function init(){
  try{
    db=supabase.createClient(BOB_CONFIG.SUPABASE_URL,BOB_CONFIG.SUPABASE_PUBLISHABLE_KEY);
    $("cloudStatus").textContent="Cloud configured";$("cloudStatus").className="cloud online";
  }catch(e){$("cloudStatus").textContent="Cloud error";$("cloudStatus").className="cloud offline"}
}
function safeName(n){return(n||"file").replace(/[^a-zA-Z0-9._-]/g,"_")}
function current(){return JSON.parse(localStorage.getItem("bobCurrentDay")||"{}")}
function saveCurrent(x){localStorage.setItem("bobCurrentDay",JSON.stringify(x))}
function describeFile(f){return f?`${f.name} · ${f.size.toLocaleString()} bytes · ${f.type||"unknown type"}`:"No file selected."}
async function fileBytes(file){
  if(!file)throw new Error("No file selected.");
  if(!(file instanceof Blob))throw new Error("Selected item is not a valid file.");
  if(!file.size)throw new Error(`${file.name||"File"} is empty.`);
  const buf=await file.arrayBuffer();
  if(!buf||!buf.byteLength)throw new Error(`${file.name||"File"} could not be read on this iPad.`);
  return new Uint8Array(buf);
}
async function uploadFile(bucket,path,file){
  const payload=await fileBytes(file);
  const opts={upsert:true,cacheControl:"3600"};
  if(file.type)opts.contentType=file.type;
  const{data,error}=await db.storage.from(bucket).upload(path,payload,opts);
  if(error)throw error;
  return data?.path||path;
}
async function loadProjects(){
  const{data,error}=await db.from("projects").select("*").order("created_at",{ascending:false});
  if(error){$("projectList")&&($("projectList").textContent=error.message);return}
  projects=data||[];
  for(const id of ["projectSelect","libraryProjectSelect"]){
    const s=$(id);if(!s)continue;s.innerHTML='<option value="">Choose project</option>';
    projects.forEach(p=>{const o=document.createElement("option");o.value=p.id;o.textContent=p.name;s.appendChild(o)});
  }
}
async function loadDocuments(){
  if(!selectedProject)return;
  const{data,error}=await db.from("project_documents").select("*").eq("project_id",selectedProject.id).order("uploaded_at",{ascending:false});
  if(error){$("documentList").textContent=error.message;return}
  $("documentList").innerHTML=(data||[]).map(d=>`<div class="doc-item">
    <div><strong>${d.document_name}</strong> ${d.revision?`· ${d.revision}`:""} ${d.is_current?'<span class="badge current">Current</span>':'<span class="badge">Archived</span>'}</div>
    <div class="file-meta">${d.original_filename} · ${Number(d.file_size||0).toLocaleString()} bytes</div>
    <div class="doc-actions">${d.is_current?"":`<button class="small secondary" onclick="makeCurrent('${d.id}')">Make current</button>`}<button class="small danger" onclick="archiveDoc('${d.id}')">Archive</button></div>
  </div>`).join("")||"<p>No DFNs uploaded yet.</p>";
}
window.makeCurrent=async id=>{
  if(!selectedProject)return;
  const{data:target,error:e1}=await db.from("project_documents").select("*").eq("id",id).single();if(e1)return alert(e1.message);
  await db.from("project_documents").update({is_current:false}).eq("project_id",selectedProject.id).eq("document_name",target.document_name);
  const{error:e2}=await db.from("project_documents").update({is_current:true}).eq("id",id);if(e2)return alert(e2.message);
  loadDocuments();
};
window.archiveDoc=async id=>{
  if(!confirm("Archive this DFN revision? The file stays in Bob's history."))return;
  const{error}=await db.from("project_documents").update({is_current:false,status:"archived"}).eq("id",id);
  if(error)return alert(error.message);loadDocuments();
};

$("createProject").onclick=async()=>{
  const name=$("newProjectName").value.trim(),contractor=$("contractor").value.trim();
  if(!name)return $("projectStatus").textContent="Enter a project name.";
  const{data,error}=await db.from("projects").insert({name,contractor,status:"active"}).select().single();
  $("projectStatus").textContent=error?`Create failed: ${error.message}`:`Project ${data.name} created.`;
  await loadProjects();
};

$("libraryProjectSelect").onchange=async()=>{
  selectedProject=projects.find(p=>String(p.id)===String($("libraryProjectSelect").value))||null;
  $("selectedProjectPanel").classList.toggle("hidden",!selectedProject);
  if(!selectedProject)return;
  $("selectedProjectSummary").innerHTML=`<strong>${selectedProject.name}</strong><br>${selectedProject.contractor||""}`;
  await loadDocuments();
};

$("dfnFile").onchange=()=>{$("dfnMeta").textContent=describeFile($("dfnFile").files[0])};
$("productionTemplate").onchange=()=>{$("templateMeta").textContent=describeFile($("productionTemplate").files[0])};

$("uploadDfn").onclick=async()=>{
  if(!selectedProject)return $("dfnStatus").textContent="Choose a project first.";
  const file=$("dfnFile").files[0],name=$("dfnName").value.trim(),revision=$("dfnRevision").value.trim();
  if(!name)return $("dfnStatus").textContent="Enter a DFN name.";
  if(!file)return $("dfnStatus").textContent="Choose the DFN PDF.";
  try{
    $("dfnStatus").textContent=`Reading ${file.name}…`;
    const path=`${selectedProject.id}/dfns/${safeName(name)}/${Date.now()}-${safeName(revision||"current")}-${safeName(file.name)}`;
    $("dfnStatus").textContent=`Uploading ${file.size.toLocaleString()} bytes…`;
    const storedPath=await uploadFile("project-files",path,file);

    await db.from("project_documents").update({is_current:false})
      .eq("project_id",selectedProject.id).eq("document_type","dfn").eq("document_name",name);

    const{error}=await db.from("project_documents").insert({
      project_id:selectedProject.id,document_type:"dfn",document_name:name,revision:revision||null,
      original_filename:file.name,storage_path:storedPath,file_size:file.size,mime_type:file.type||"application/pdf",
      is_current:true,status:"active"
    });
    if(error)throw error;
    $("dfnStatus").textContent=`${name}${revision?` ${revision}`:""} uploaded and marked Current.`;
    $("dfnFile").value="";$("dfnMeta").textContent="No DFN selected.";
    await loadDocuments();
  }catch(e){
    $("dfnStatus").textContent=`Upload failed: ${e.message}`;
  }
};

$("uploadTemplate").onclick=async()=>{
  if(!selectedProject)return $("templateStatus").textContent="Choose a project first.";
  const file=$("productionTemplate").files[0];
  if(!file)return $("templateStatus").textContent="Choose Martin's template file.";
  try{
    $("templateStatus").textContent=`Uploading ${file.name}…`;
    const path=`${selectedProject.id}/production-template/${Date.now()}-${safeName(file.name)}`;
    const storedPath=await uploadFile("project-files",path,file);
    const{error}=await db.from("projects").update({production_template_path:storedPath}).eq("id",selectedProject.id);
    if(error)throw error;
    $("templateStatus").textContent="Martin production-sheet template saved.";
  }catch(e){$("templateStatus").textContent=`Template upload failed: ${e.message}`}
};

$("refreshDocs").onclick=loadDocuments;

function addBore(){
  boreCount++;const d=document.createElement("div");d.className="bore";
  d.innerHTML=`<div class="section-head"><h3>Bore ${boreCount}</h3><button class="small danger remove" type="button">Remove</button></div><div class="bore-grid"><label>Type<select class="type"><option>Ped to Ped</option><option>Ped to Stub</option><option>Stub to Ped</option><option>Stub to Stub</option><option>Road Crossing</option><option>Other</option></select></label><label>Footage<input class="ft" inputmode="numeric"></label></div><label>Description<input class="desc"></label>`;
  d.querySelector(".remove").onclick=()=>{d.remove();checkFootage()};d.querySelector(".ft").oninput=checkFootage;$("bores").appendChild(d);checkFootage();
}
function collectBores(){return[...document.querySelectorAll(".bore")].map(b=>({type:b.querySelector(".type").value,footage:Number(b.querySelector(".ft").value||0),description:b.querySelector(".desc").value.trim()}))}
function checkFootage(){const t=Number($("totalFootage").value||0),s=collectBores().reduce((a,b)=>a+b.footage,0),e=$("footageCheck");if(!t&&!s){e.className="check neutral";e.textContent="Add bore footage to compare against the daily total."}else if(t===s){e.className="check ok";e.textContent=`Footage matches: ${t} ft.`}else{e.className="check warn";e.textContent=`Mismatch: daily total ${t} ft; bore total ${s} ft.`}}
$("startDay").onclick=()=>{const p=projects.find(x=>String(x.id)===String($("projectSelect").value));if(!p)return $("startStatus").textContent="Choose a project first.";saveCurrent({projectId:p.id,projectName:p.name,assignedPages:$("assignedPages").value.trim(),startedAt:new Date().toISOString(),status:"open"});$("startStatus").textContent="Day started and assignment saved."};

async function uploadDayPhotos(key){
  const out=[];for(const[i,file]of[...$("dayPhotos").files].entries()){
    const path=`${key}/${Date.now()}-${i}-${safeName(file.name)}`;
    const{data,error}=await db.storage.from("job-photos").upload(path,await fileBytes(file),{upsert:false,contentType:file.type||undefined});
    if(error)throw error;out.push(data?.path||path);
  }return out;
}
$("saveDay").onclick=async()=>{
  const c=current(),total=Number($("totalFootage").value||0),bs=collectBores();
  if(!c.projectId)return $("saveStatus").textContent="Start the day first.";
  if(total!==bs.reduce((a,b)=>a+b.footage,0))return $("saveStatus").textContent="Fix the footage mismatch before saving.";
  try{
    $("saveStatus").textContent="Saving…";
    const photos=await uploadDayPhotos(`${new Date().toISOString().slice(0,10)}-${crypto.randomUUID()}`);
    const row={project_id:c.projectId,Project:c.projectName,assigned_pages:c.assignedPages,actual_pages:$("actualPages").value.trim(),Total_footage:total,pedestals:Number($("pedestals").value||0),notes:JSON.stringify({bores:bs,pedestal_locations:$("pedLocations").value.trim(),general_notes:$("notes").value.trim(),photo_paths:photos}),photos:photos.length,production_sheet_complete:false,contractor_package_complete:false,redlines_complete:false};
    const{data,error}=await db.from("drilling_days").insert(row).select().single();if(error)throw error;
    saveCurrent({...c,...row,cloudId:data.id,status:"completed"});$("saveStatus").textContent="Completed day saved to Bob’s cloud.";
  }catch(e){$("saveStatus").textContent=`Save failed: ${e.message}`}
};
async function loadHistory(){const{data,error}=await db.from("drilling_days").select("*").order("created_at",{ascending:false}).limit(50);if(error)return $("historyList").textContent=error.message;$("historyList").innerHTML=(data||[]).map(x=>`<div class="history-item"><h3>${x.Project||"Project"}</h3><p>Assigned: ${x.assigned_pages||"—"} · Actual: ${x.actual_pages||"—"}</p><p>Footage: ${x.Total_footage||0} · Peds: ${x.pedestals||0}</p></div>`).join("")||"<p>No records yet.</p>"}
$("testCloud").onclick=async()=>{const{error}=await db.from("project_documents").select("id").limit(1);$("testResult").textContent=error?error.message:"Bob v5.2 project document library is connected."};
$("addBore").onclick=addBore;$("totalFootage").oninput=checkFootage;$("refreshProjects").onclick=loadProjects;$("refreshHistory").onclick=loadHistory;
$("dayPhotos").onchange=()=>{const h=$("dayPhotoPreview");h.innerHTML="";[...$("dayPhotos").files].slice(0,12).forEach(f=>{const i=document.createElement("img");i.src=URL.createObjectURL(f);h.appendChild(i)})};
document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".panel").forEach(x=>x.classList.remove("active"));t.classList.add("active");$(t.dataset.tab).classList.add("active");if(t.dataset.tab==="projects")loadProjects();if(t.dataset.tab==="history")loadHistory()});
init();addBore();loadProjects();if("serviceWorker"in navigator)navigator.serviceWorker.register("service-worker.js");
