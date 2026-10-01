const $ = id => document.getElementById(id);
const key = "focusStudyData_v1";

let data = JSON.parse(localStorage.getItem(key) || "null") || {
  contents: [],
  notes: [],
  sessions: [],
  totalSeconds: 0,
  todaySeconds: 0,
  lastDay: new Date().toISOString().slice(0,10)
};

let timer = { seconds: 0, running: false, interval: null };
let selectedNoteId = null;
let contentFilter = "all";

function persist(){ localStorage.setItem(key, JSON.stringify(data)); }
function pad(n){ return String(n).padStart(2,"0"); }
function formatTime(sec){ return `${pad(Math.floor(sec/3600))}:${pad(Math.floor(sec%3600/60))}:${pad(sec%60)}`; }

function rolloverDay(){
  const today = new Date().toISOString().slice(0,10);
  if(data.lastDay !== today){ data.todaySeconds = 0; data.lastDay = today; persist(); }
}
function updateClock(){
  rolloverDay();
  $("timerDisplay").textContent = formatTime(timer.seconds);
  $("sidebarTotal").textContent = formatTime(data.totalSeconds + timer.seconds);
  $("todayTime").textContent = formatTime(data.todaySeconds + timer.seconds);
  $("sessionCount").textContent = data.sessions.length;
}
function renderProgress(){
  const total = data.contents.length;
  const done = data.contents.filter(x=>x.done).length;
  const pct = total ? Math.round(done/total*100) : 0;
  $("progressPercent").textContent = pct+"%";
  $("doneCount").textContent = done;
  $("totalCount").textContent = total;
  $("contentStat").textContent = total;
  $("notesStat").textContent = data.notes.length;
  $("progressPercent").parentElement.parentElement.style.background =
    `conic-gradient(var(--primary) ${pct*3.6}deg, #eceef4 ${pct*3.6}deg)`;
}
function renderDashboard(){
  const list = data.contents.filter(x=>!x.done).slice(0,5);
  $("dashboardChecklist").innerHTML = list.length ? list.map(x=>`
    <div class="compact-item"><label class="checkline"><input type="checkbox" data-dash-check="${x.id}" ${x.done?"checked":""}><span>${escapeHtml(x.title)}</span></label></div>`).join("") :
    `<div class="muted">Nenhum conteúdo pendente. Adicione novos conteúdos na aba Conteúdos.</div>`;
  $("dashboardNotes").innerHTML = data.notes.slice().reverse().slice(0,4).map(n=>`
    <div class="note-preview"><strong>${escapeHtml(n.title || "Sem título")}</strong><div class="muted">${escapeHtml(n.body.slice(0,90))}${n.body.length>90?"…":""}</div></div>`).join("") ||
    `<div class="muted">Você ainda não tem anotações.</div>`;
  document.querySelectorAll("[data-dash-check]").forEach(el=>el.onchange=()=>toggleContent(el.dataset.dashCheck));
}
function renderContents(){
  let arr = data.contents;
  if(contentFilter==="pending") arr=arr.filter(x=>!x.done);
  if(contentFilter==="done") arr=arr.filter(x=>x.done);
  $("contentList").innerHTML = arr.length ? arr.map(x=>`
    <div class="content-item">
      <input type="checkbox" data-content="${x.id}" ${x.done?"checked":""}>
      <div class="content-info"><strong class="${x.done?"done-text":""}">${escapeHtml(x.title)}</strong><span>${escapeHtml(x.subject)}</span></div>
      <button class="remove-btn" data-remove="${x.id}" title="Excluir">✕</button>
    </div>`).join("") : `<div class="muted" style="padding:24px 0;text-align:center">Nenhum item nesta categoria.</div>`;
  document.querySelectorAll("[data-content]").forEach(el=>el.onchange=()=>toggleContent(el.dataset.content));
  document.querySelectorAll("[data-remove]").forEach(el=>el.onclick=()=>removeContent(el.dataset.remove));
}
function toggleContent(id){
  const x=data.contents.find(c=>c.id===id); if(x)x.done=!x.done;
  persist(); renderAll();
}
function removeContent(id){ data.contents=data.contents.filter(c=>c.id!==id); persist(); renderAll(); }
function addContent(){
  const title=$("contentInput").value.trim(); if(!title)return;
  data.contents.push({id:crypto.randomUUID(),title,subject:$("contentSubject").value,done:false});
  $("contentInput").value=""; persist(); renderAll();
}
function renderNotes(){
  $("notesList").innerHTML = data.notes.slice().reverse().map(n=>`
    <div class="note-row ${selectedNoteId===n.id?"active":""}" data-note="${n.id}">
      <strong>${escapeHtml(n.title||"Sem título")}</strong><span>${escapeHtml(n.subject)} · ${new Date(n.updatedAt).toLocaleDateString("pt-BR")}</span>
    </div>`).join("") || `<div class="muted">Crie sua primeira anotação.</div>`;
  document.querySelectorAll("[data-note]").forEach(el=>el.onclick=()=>selectNote(el.dataset.note));
}
function newNote(){
  selectedNoteId=null;
  $("noteTitle").value=""; $("noteSubject").value="Geral"; $("noteBody").value="";
  renderNotes();
}
function selectNote(id){
  const n=data.notes.find(x=>x.id===id); if(!n)return;
  selectedNoteId=id; $("noteTitle").value=n.title; $("noteSubject").value=n.subject; $("noteBody").value=n.body; renderNotes();
}
function saveNote(){
  const title=$("noteTitle").value.trim() || "Sem título";
  const subject=$("noteSubject").value;
  const body=$("noteBody").value;
  if(selectedNoteId){
    const n=data.notes.find(x=>x.id===selectedNoteId); Object.assign(n,{title,subject,body,updatedAt:new Date().toISOString()});
  } else {
    const n={id:crypto.randomUUID(),title,subject,body,updatedAt:new Date().toISOString()};
    data.notes.push(n); selectedNoteId=n.id;
  }
  persist(); renderAll(); selectNote(selectedNoteId);
}
function deleteNote(){
  if(!selectedNoteId)return;
  data.notes=data.notes.filter(n=>n.id!==selectedNoteId); selectedNoteId=null; persist(); newNote(); renderAll();
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}

function setSection(id){
  document.querySelectorAll(".section").forEach(s=>s.classList.toggle("active",s.id===id));
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.section===id));
  const titles={dashboard:"Olá! Vamos estudar?",conteudos:"Organize seus conteúdos",anotacoes:"Suas anotações"};
  $("pageTitle").textContent=titles[id];
}
function startPause(){
  if(timer.running){
    clearInterval(timer.interval); timer.running=false;
    $("startPause").textContent="▶ Continuar"; $("timerStatus").textContent="Pausado"; $("timerStatus").classList.remove("running");
  }else{
    timer.running=true; $("startPause").textContent="Ⅱ Pausar"; $("timerStatus").textContent="Em estudo"; $("timerStatus").classList.add("running");
    timer.interval=setInterval(()=>{timer.seconds++;updateClock();},1000);
  }
}
function finishTimer(){
  if(timer.seconds>0){
    data.totalSeconds+=timer.seconds; data.todaySeconds+=timer.seconds;
    data.sessions.push({seconds:timer.seconds,subject:$("sessionSubject").value.trim(),date:new Date().toISOString()});
  }
  clearInterval(timer.interval); timer={seconds:0,running:false};
  $("startPause").textContent="▶ Iniciar"; $("timerStatus").textContent="Parado"; $("timerStatus").classList.remove("running");
  $("sessionSubject").value=""; persist(); renderAll();
}
function resetTimer(){
  clearInterval(timer.interval); timer={seconds:0,running:false};
  $("startPause").textContent="▶ Iniciar"; $("timerStatus").textContent="Parado"; $("timerStatus").classList.remove("running"); updateClock();
}
function renderAll(){ updateClock(); renderProgress(); renderContents(); renderDashboard(); renderNotes(); }

document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>setSection(b.dataset.section));
document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>setSection(b.dataset.go));
$("startPause").onclick=startPause;
$("finishTimer").onclick=finishTimer;
$("resetTimer").onclick=resetTimer;
$("addContentBtn").onclick=()=>{$("contentForm").classList.toggle("show");$("contentInput").focus()};
$("saveContent").onclick=addContent;
$("contentInput").addEventListener("keydown",e=>{if(e.key==="Enter")addContent()});
document.querySelectorAll(".filter").forEach(b=>b.onclick=()=>{contentFilter=b.dataset.filter;document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");renderContents()});
$("newNoteBtn").onclick=newNote;
$("saveNote").onclick=saveNote;
$("deleteNote").onclick=deleteNote;
$("resetData").onclick=()=>{
  if(confirm("Isso apagará cronômetros, conteúdos e anotações. Continuar?")){
    localStorage.removeItem(key); location.reload();
  }
};

function updateDate(){
  $("currentDate").textContent=new Intl.DateTimeFormat("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date());
}
updateDate(); renderAll(); setInterval(updateDate,60000);
