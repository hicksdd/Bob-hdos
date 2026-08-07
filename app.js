const $=id=>document.getElementById(id);
const db=supabase.createClient(BOB_CONFIG.SUPABASE_URL,BOB_CONFIG.SUPABASE_PUBLISHABLE_KEY);
let projects=[],selectedProject=null;
function safeName(n){return(n||"file").replace(/[^a-zA-Z0-9._-]/g,"_")}
async function bytes(f){if(!f||!f.size)throw new Error("File is empty.");return new Uint8Array(await f.arrayBuffer())}
async function upload(path,f){const{data,error}=await db.storage.from("project-files").upload(path,await bytes(f),{upsert:true,contentType:f.type||"application/pdf"});if(error)throw error;return data?.path||path}
async function loadProjects(){
 const{data,error}=await db.from("projects").select("*").order("created_at",{ascending:false});if(error)return;
 projects=data||[];
 for(const id of["projectSelect","libraryProjectSelect"]){const s=$(id);s.innerHTML='<option value="">Choose project</option>';projects.forEach(p=>{const o=document.createElement("option");o.value=p.id;o.textContent=p.name;s.appendChild(o)})}
}
async function loadDocs(){
 if(!selectedProject)return;
 const{data:docs,error}=await db.from("project_documents").select("*").eq("project_id",selectedProject.id).order("uploaded_at",{ascending:false});
 if(error){$("documentList").textContent=error.message;return}
 const ids=(docs||[]).map(d=>d.id);let parts=[];
 if(ids.length){const r=await db.from("project_document_parts").select("*").in("project_document_id",ids).order("part_number",{ascending:true});if(r.error){$("documentList").textContent=r.error.message;return}parts=r.data||[]}
 const map={};parts.forEach(p=>(map[p.project_document_id]||(map[p.project_document_id]=[])).push(p));
 $("documentList").innerHTML=(docs||[]).map(d=>`<div class="doc"><strong>${d.document_name}</strong> ${d.revision?`· ${d.revision}`:""} ${d.is_current?"· Current":""}<div class="parts">${(map[d.id]||[]).map(p=>`Part ${p.part_number}: ${p.original_filename}`).join("<br>")||"No parts"}</div></div>`).join("")||"No DFNs yet.";
}
$("libraryProjectSelect").onchange=async()=>{selectedProject=projects.find(p=>String(p.id)===String($("libraryProjectSelect").value))||null;$("selectedProjectPanel").classList.toggle("hidden",!selectedProject);if(selectedProject)await loadDocs()};
$("dfnFiles").onchange=()=>{$("dfnMeta").textContent=[...$("dfnFiles").files].map((f,i)=>`Part ${i+1}: ${f.name}`).join(" | ")||"No files selected."};
$("uploadDfn").onclick=async()=>{
 if(!selectedProject)return $("dfnStatus").textContent="Choose a project.";
 const name=$("dfnName").value.trim(),rev=$("dfnRevision").value.trim(),files=[...$("dfnFiles").files];
 if(!name||!files.length)return $("dfnStatus").textContent="Enter DFN name and choose PDF part(s).";
 if(files.some(f=>f.size>50*1024*1024))return $("dfnStatus").textContent="Each individual part must be under 50 MB.";
 try{
  $("dfnStatus").textContent="Creating revision…";
  await db.from("project_documents").update({is_current:false}).eq("project_id",selectedProject.id).eq("document_name",name);
  const{data:doc,error}=await db.from("project_documents").insert({project_id:selectedProject.id,document_type:"dfn",document_name:name,revision:rev||null,original_filename:`${name} (${files.length} parts)`,storage_path:`${selectedProject.id}/dfns/${safeName(name)}`,file_size:files.reduce((s,f)=>s+f.size,0),mime_type:"application/pdf",is_current:true,status:"active"}).select().single();
  if(error)throw error;
  for(let i=0;i<files.length;i++){
   $("dfnStatus").textContent=`Uploading part ${i+1} of ${files.length}…`;
   const f=files[i],path=await upload(`${selectedProject.id}/dfns/${safeName(name)}/${doc.id}/part-${String(i+1).padStart(2,"0")}-${safeName(f.name)}`,f);
   const r=await db.from("project_document_parts").insert({project_document_id:doc.id,part_number:i+1,original_filename:f.name,storage_path:path,file_size:f.size,mime_type:f.type||"application/pdf"});
   if(r.error)throw r.error;
  }
  $("dfnStatus").textContent=`Uploaded as one DFN revision with ${files.length} part(s).`;await loadDocs();
 }catch(e){$("dfnStatus").textContent=`Upload failed: ${e.message}`}
};
$("startDay").onclick=()=>{$("startStatus").textContent="Day started."};
$("testCloud").onclick=async()=>{const{error}=await db.from("project_document_parts").select("id").limit(1);$("testResult").textContent=error?error.message:"Bob v5.3 split-file storage is connected."};
document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".panel").forEach(x=>x.classList.remove("active"));t.classList.add("active");$(t.dataset.tab).classList.add("active")});
loadProjects();$("cloudStatus").textContent="Cloud configured";