const $=id=>document.getElementById(id);
let db=null,boreCount=0,projects=[];

function init(){
  try{
    db=supabase.createClient(BOB_CONFIG.SUPABASE_URL,BOB_CONFIG.SUPABASE_PUBLISHABLE_KEY);
    $("cloudStatus").textContent="Cloud configured";
    $("cloudStatus").className="cloud online";
  }catch(e){
    $("cloudStatus").textContent="Cloud error";
    $("cloudStatus").className="cloud offline";
  }
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

async function uploadFile(bucket,path,file,label){
  if(label)$("projectStatus").textContent=label;
  const payload=await fileBytes(file);
  const opts={upsert:true,cacheControl:"3600"};
  if(file.type)opts.contentType=file.type;
  const{data,error}=await db.storage.from(bucket).upload(path,payload,opts);
  if(error)throw new Error(`${label||"Upload"} failed: ${error.message}`);
  return data?.path||path;
}

async function loadProjects(){
  const{data,error}=await db.from("projects").select("*").order("created_at",{ascending:false});
  if(error){$("projectList").textContent=error.message;return}
  projects=data||[];
  const s=$("projectSelect");
  s.innerHTML='<option value="">Choose project</option>';
  projects.forEach(p=>{const o=document.createElement("option");o.value=p.id;o.textContent=p.name;s.appendChild(o)});
  $("projectList").innerHTML=projects.map(p=>`<div class="project-item"><h3>${p.name}</h3><p>${p.contractor||""}</p>${p.dfn_pdf_path?'<span class="file-pill">DFN uploaded</span>':'<span class="file-pill">DFN missing</span>'}${p.production_template_path?'<span class="file-pill">Martin template uploaded</span>':'<span class="file-pill">Martin template missing</span>'}</div>`).join("")||"<p>No projects yet.</p>";
}

$("dfnFile").onchange=()=>{$("dfnMeta").textContent=describeFile($("dfnFile").files[0])};
$("productionTemplate").onchange=()=>{$("templateMeta").textContent=describeFile($("productionTemplate").files[0])};

$("createProject").onclick=async()=>{
  const name=$("newProjectName").value.trim(),contractor=$("contractor").value.trim(),dfn=$("dfnFile").files[0],template=$("productionTemplate").files[0];
  if(!name)return $("projectStatus").textContent="Enter a project name.";
  if(!dfn)return $("projectStatus").textContent="Select the DFN PDF first.";
  try{
    $("projectStatus").textContent="Step 1 of 4: Creating project record…";
    const{data:p,error:createError}=await db.from("projects").insert({name,contractor,status:"active"}).select().single();
    if(createError)throw new Error(`Project record failed: ${createError.message}`);

    const dfnPath=await uploadFile("project-files",`${p.id}/dfn/${safeName(dfn.name)}`,dfn,`Step 2 of 4: Uploading DFN (${dfn.size.toLocaleString()} bytes)…`);

    let templatePath=null;
    if(template){
      templatePath=await uploadFile("project-files",`${p.id}/production-template/${safeName(template.name)}`,template,`Step 3 of 4: Uploading Martin template (${template.size.toLocaleString()} bytes)…`);
    }else{
      $("projectStatus").textContent="Step 3 of 4: No Martin template selected; skipping.";
    }

    $("projectStatus").textContent="Step 4 of 4: Saving file locations…";
    const{error:updateError}=await db.from("projects").update({dfn_pdf_path:dfnPath,production_template_path:templatePath}).eq("id",p.id);
    if(updateError)throw new Error(`Project update failed: ${updateError.message}`);

    $("projectStatus").textContent="Project created. DFN and template upload complete.";
    await loadProjects();
  }catch(e){
    $("projectStatus").textContent=`Upload stopped: ${e.message}`;
  }
};

function addBore(){
  boreCount++;
  const d=document.createElement("div");d.className="bore";
  d.innerHTML=`<div class="section-head"><h3>Bore ${boreCount}</h3><button class="small danger remove" type="button">Remove</button></div><div class="bore-grid"><label>Type<select class="type"><option>Ped to Ped</option><option>Ped to Stub</option><option>Stub to Ped</option><option>Stub to Stub</option><option>Road Crossing</option><option>Other</option></select></label><label>Footage<input class="ft" inputmode="numeric"></label></div><label>Description<input class="desc"></label>`;
  d.querySelector(".remove").onclick=()=>{d.remove();checkFootage()};
  d.querySelector(".ft").oninput=checkFootage;
  $("bores").appendChild(d);checkFootage();
}
function collectBores(){return[...document.querySelectorAll(".bore")].map(b=>({type:b.querySelector(".type").value,footage:Number(b.querySelector(".ft").value||0),description:b.querySelector(".desc").value.trim()}))}
function checkFootage(){
  const t=Number($("totalFootage").value||0),s=collectBores().reduce((a,b)=>a+b.footage,0),e=$("footageCheck");
  if(!t&&!s){e.className="check neutral";e.textContent="Add bore footage to compare against the daily total."}
  else if(t===s){e.className="check ok";e.textContent=`Footage matches: ${t} ft.`}
  else{e.className="check warn";e.textContent=`Mismatch: daily total ${t} ft; bore total ${s} ft.`}
}

$("startDay").onclick=()=>{
  const p=projects.find(x=>String(x.id)===String($("projectSelect").value));
  if(!p)return $("startStatus").textContent="Choose a project first.";
  saveCurrent({projectId:p.id,projectName:p.name,assignedPages:$("assignedPages").value.trim(),startedAt:new Date().toISOString(),status:"open"});
  $("startStatus").textContent="Day started and assignment saved.";
};

async function uploadDayPhotos(key){
  const out=[];
  for(const[i,file]of[...$("dayPhotos").files].entries()){
    const payload=await fileBytes(file);
    const path=`${key}/${Date.now()}-${i}-${safeName(file.name)}`;
    const opts={upsert:false,cacheControl:"3600"};
    if(file.type)opts.contentType=file.type;
    const{data,error}=await db.storage.from("job-photos").upload(path,payload,opts);
    if(error)throw new Error(`Photo upload failed: ${error.message}`);
    out.push(data?.path||path);
  }
  return out;
}

$("saveDay").onclick=async()=>{
  const c=current(),total=Number($("totalFootage").value||0),bs=collectBores();
  if(!c.projectId)return $("saveStatus").textContent="Start the day first.";
  if(total!==bs.reduce((a,b)=>a+b.footage,0))return $("saveStatus").textContent="Fix the footage mismatch before saving.";
  try{
    $("saveStatus").textContent="Saving…";
    const photos=await uploadDayPhotos(`${new Date().toISOString().slice(0,10)}-${crypto.randomUUID()}`);
    const row={project_id:c.projectId,Project:c.projectName,assigned_pages:c.assignedPages,actual_pages:$("actualPages").value.trim(),Total_footage:total,pedestals:Number($("pedestals").value||0),notes:JSON.stringify({bores:bs,pedestal_locations:$("pedLocations").value.trim(),general_notes:$("notes").value.trim(),photo_paths:photos}),photos:photos.length,production_sheet_complete:false,contractor_package_complete:false,redlines_complete:false};
    const{data,error}=await db.from("drilling_days").insert(row).select().single();
    if(error)throw error;
    saveCurrent({...c,...row,cloudId:data.id,status:"completed"});
    $("saveStatus").textContent="Completed day saved to Bob’s cloud.";
  }catch(e){
    $("saveStatus").textContent=`Save failed: ${e.message}`;
  }
};

async function loadHistory(){
  const{data,error}=await db.from("drilling_days").select("*").order("created_at",{ascending:false}).limit(50);
  if(error)return $("historyList").textContent=error.message;
  $("historyList").innerHTML=(data||[]).map(x=>`<div class="history-item"><h3>${x.Project||"Project"}</h3><p>Assigned: ${x.assigned_pages||"—"} · Actual: ${x.actual_pages||"—"}</p><p>Footage: ${x.Total_footage||0} · Peds: ${x.pedestals||0}</p></div>`).join("")||"<p>No records yet.</p>";
}

$("testCloud").onclick=async()=>{const{error}=await db.from("projects").select("id").limit(1);$("testResult").textContent=error?error.message:"Projects cloud connection works."};
$("addBore").onclick=addBore;
$("totalFootage").oninput=checkFootage;
$("refreshProjects").onclick=loadProjects;
$("refreshHistory").onclick=loadHistory;
$("dayPhotos").onchange=()=>{const h=$("dayPhotoPreview");h.innerHTML="";[...$("dayPhotos").files].slice(0,12).forEach(f=>{const i=document.createElement("img");i.src=URL.createObjectURL(f);h.appendChild(i)})};

document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".panel").forEach(x=>x.classList.remove("active"));
  t.classList.add("active");$(t.dataset.tab).classList.add("active");
  if(t.dataset.tab==="projects")loadProjects();
  if(t.dataset.tab==="history")loadHistory();
});

init();addBore();loadProjects();
if("serviceWorker"in navigator)navigator.serviceWorker.register("service-worker.js");
