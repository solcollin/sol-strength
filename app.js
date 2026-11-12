/* SOL STRENGTH · offline-first, zero dependencies, zero analytics. */
'use strict';
const APP = 'SOL STRENGTH', DB_NAME = 'sol-strength-v1', STORE = 'records', KEY = 'sol-strength-state-v1', SCHEMA = 3;
const LIFTS = [
  {id:'bench-press',name:'Bench Press'}, {id:'deadlift',name:'Deadlift'},
  {id:'overhead-press',name:'Overhead Press'}, {id:'squat',name:'Squat'}
];
const LIFT_IDS = new Set(LIFTS.map(x=>x.id));
const ex = (id,name,sets,min,max,more={}) => ({id,name,sets,min,max,type:'reps',...more});
const PLANS = [
  {name:'Chest & Arms',exercises:[ex('bench-press','Bench Press',3,5,8),ex('incline-press','Incline Press',3,8,12),ex('chest-flies','Chest Flies',3,12,15),ex('lateral-raises','Lateral Raises',4,15,20),ex('tricep-pressdowns','Tricep Pressdowns',3,10,15),ex('bicep-curls','Bicep Curls',3,10,15)]},
  {name:'Legs & Back',exercises:[ex('deadlift','Deadlift',3,5,8),ex('lat-pulldown','Lat Pulldown',3,8,12),ex('seated-leg-curl','Seated Leg Curl',4,10,15),ex('shrugs','Shrugs',3,10,15),ex('calf-raises','Calf Raises',4,12,15),ex('bicep-curls','Bicep Curls',3,10,15)]},
  {name:'Recovery',exercises:[]},
  {name:'Shoulders, Chest & Arms',exercises:[ex('overhead-press','Overhead Press',3,5,8),ex('machine-chest-press','Machine Chest Press',2,8,12),ex('cable-chest-flies','Cable Chest Flies',2,12,15),ex('lateral-raises','Lateral Raises',4,15,20),ex('reverse-pec-deck','Reverse Pec Deck',4,12,15,{note:'Rear delts'}),ex('tricep-pressdowns','Tricep Pressdowns',3,10,15),ex('bicep-curls','Bicep Curls',3,10,15)]},
  {name:'Quad-Focused Legs',exercises:[ex('squat','Squat',3,5,8),ex('romanian-deadlift','Romanian Deadlift',2,8,12),ex('dead-hangs','Dead Hangs',2,60,60,{type:'time'}),ex('leg-press','Leg Press',3,8,12),ex('leg-extension','Leg Extension',3,12,15),ex('calf-raises','Calf Raises',4,12,15)]},
  {name:'Back & Arms',exercises:[ex('heavy-lat-pulldown','Heavy Lat Pulldown',3,8,10),ex('seated-cable-row','Seated Cable Row',3,10,12),ex('cable-pullover','Cable Pullover',3,12,15),ex('ez-bar-curls','EZ Bar Curls',3,10,12),ex('hammer-curls','Hammer Curls',3,10,12)]},
  {name:'Recovery',exercises:[]}
];
const EXERCISES = new Map(PLANS.flatMap(p=>p.exercises).map(e=>[e.id,e]));
const PLAN_OPTIONS = [0,1,3,4,5];
const WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
// JS weekday indices: Sunday=0. These are the user's preferred starting assignments.
const DEFAULT_SCHEDULE = {'0':0,'1':1,'2':null,'3':3,'4':4,'5':5,'6':null};
const DEFAULT_TEMPLATE = [
  [{pct:65,reps:5,amrap:false},{pct:75,reps:5,amrap:false},{pct:85,reps:5,amrap:true}],
  [{pct:70,reps:3,amrap:false},{pct:80,reps:3,amrap:false},{pct:90,reps:3,amrap:true}],
  [{pct:75,reps:5,amrap:false},{pct:85,reps:3,amrap:false},{pct:95,reps:1,amrap:true}]
];
const $ = sel => document.querySelector(sel);
const copy = value => JSON.parse(JSON.stringify(value));
const safe = value => String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const num = (value,fallback=null) => value==='' || value==null || !Number.isFinite(Number(value)) ? fallback : Number(value);
const clamp = (n,min,max)=>Math.min(max,Math.max(min,n));
const format = n => n==null || !Number.isFinite(n) ? '—' : Number(n.toFixed(2)).toLocaleString('en-US',{maximumFractionDigits:2});
function toISO(date){return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');}
const todayISO = ()=>toISO(new Date());
const fromISO = s=>new Date(s+'T12:00:00');
function validDate(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(fromISO(s).getTime())&&toISO(fromISO(s))===s;}
function addDays(s,n){const d=fromISO(s);d.setDate(d.getDate()+n);return toISO(d);}
function between(a,b){const utc=s=>{const [y,m,d]=s.split('-').map(Number);return Date.UTC(y,m-1,d);};return Math.round((utc(b)-utc(a))/86400000);}
function prettyDate(s,long=false){return fromISO(s).toLocaleDateString('en-US',long?{weekday:'long',month:'long',day:'numeric',year:'numeric'}:{weekday:'short',month:'short',day:'numeric'});}
function roundLoad(n,inc){return Math.max(0,Math.round((n+Number.EPSILON)/inc)*inc);}
function estimated1RM(w,r){return w>0&&r>=1&&r<=12 ? w*(1+r/30):null;}
const emptyMaxes=()=>Object.fromEntries(LIFTS.map(l=>[l.id,null]));
function blankState(){return {schemaVersion:SCHEMA,updatedAt:new Date().toISOString(),settings:{setupComplete:false,startDate:'2026-11-22',schedule:copy(DEFAULT_SCHEDULE),oneRepMaxes:emptyMaxes(),unit:'lb',increment:5,restSeconds:120,autoRest:false,template:copy(DEFAULT_TEMPLATE)},tmByCycle:{},sessions:{}};}
function normalize(raw){
  if(!raw||typeof raw!=='object'||![1,2,3].includes(raw.schemaVersion)||!raw.settings||!raw.sessions||!raw.tmByCycle||typeof raw.sessions!=='object'||typeof raw.tmByCycle!=='object')throw Error('Not a valid SOL STRENGTH backup.');
  const out=blankState(),s=raw.settings;
  out.settings.setupComplete=s.setupComplete===true;
  // Unstarted older installations used Nov 19; shift only the untouched default to Sunday Nov 22.
  out.settings.startDate=raw.schemaVersion<3&&!Object.keys(raw.sessions).length&&(!s.startDate||s.startDate==='2026-11-19')?'2026-11-22':(validDate(s.startDate)?s.startDate:out.settings.startDate);
  out.settings.unit=s.unit==='kg'?'kg':'lb';
  out.settings.increment=clamp(num(s.increment,out.settings.unit==='kg'?2.5:5),.25,100);
  out.settings.restSeconds=clamp(Math.round(num(s.restSeconds,120)),15,900);
  out.settings.autoRest=Boolean(s.autoRest);
  const schedule=s.schedule&&typeof s.schedule==='object'?s.schedule:DEFAULT_SCHEDULE;
  out.settings.schedule=Object.fromEntries(WEEKDAYS.map((_,i)=>[i,PLAN_OPTIONS.includes(Number(schedule[i]))&&schedule[i]!=null?Number(schedule[i]):null]));
  for(const l of LIFTS){const v=num(s.oneRepMaxes?.[l.id]);out.settings.oneRepMaxes[l.id]=v>0&&v<=100000?v:null;}
  if(Array.isArray(s.template)&&s.template.length===3&&s.template.every(w=>Array.isArray(w)&&w.length===3))out.settings.template=s.template.map(w=>w.map(t=>({pct:clamp(Math.round(num(t.pct,65)),1,150),reps:clamp(Math.round(num(t.reps,5)),1,30),amrap:Boolean(t.amrap)})));
  for(const [k,v] of Object.entries(raw.tmByCycle).slice(0,200)){const c=Number(k);if(!Number.isInteger(c)||c<1||c>10000||!v||typeof v!=='object')continue;out.tmByCycle[c]=Object.fromEntries(LIFTS.map(l=>{const n=num(v[l.id]);return [l.id,n>0&&n<=100000?n:null];}));}
  // Prior versions allowed starting without maxes. Require all four before entering 5/3/1.
  if(out.settings.setupComplete&&LIFTS.some(l=>!(out.settings.oneRepMaxes[l.id]>0)&&!(out.tmByCycle[1]?.[l.id]>0)))out.settings.setupComplete=false;
  for(const [date,session] of Object.entries(raw.sessions).slice(0,12000)){
    if(!validDate(date)||!session||!Array.isArray(session.exercises))continue;
    out.sessions[date]={date,dayNumber:clamp(Math.round(num(session.dayNumber,1)),1,7),phase:session.phase==='531'?'531':'legacy',cycle:clamp(Math.round(num(session.cycle,0)),0,10000),week:clamp(Math.round(num(session.week,1)),0,10000),exercises:session.exercises.slice(0,50).filter(e=>e&&EXERCISES.has(e.id)&&Array.isArray(e.sets)).map(e=>({id:e.id,name:EXERCISES.get(e.id).name,type:EXERCISES.get(e.id).type,sets:e.sets.slice(0,15).filter(Boolean).map(t=>({weight:num(t.weight)>=0?num(t.weight):null,reps:num(t.reps)>=0?num(t.reps):null,seconds:num(t.seconds)>=0?num(t.seconds):null,done:Boolean(t.done),target:typeof t.target==='string'?t.target.slice(0,70):'',pct:num(t.pct),targetWeight:num(t.targetWeight)}))})),notes:typeof session.notes==='string'?session.notes.slice(0,20000):'',completed:Boolean(session.completed),completedAt:typeof session.completedAt==='string'?session.completedAt:null,updatedAt:typeof session.updatedAt==='string'?session.updatedAt:null};
  }
  out.updatedAt=typeof raw.updatedAt==='string'&&!Number.isNaN(Date.parse(raw.updatedAt))?raw.updatedAt:new Date().toISOString();return out;
}
let state=blankState(),db=null,queue=Promise.resolve(),pending=null,toastDelay=null,tab='today',selectedDate=todayISO(),wizardStep=0,wizardSchedule=copy(DEFAULT_SCHEDULE),wizardDate='2026-11-22',editSchedule=false,scheduleDraft=null,cycleEditor=1,weekOffset=0;
let timer={running:false,deadline:0,remaining:0,finished:false};
function showWarning(message){$('#storage-warning').hidden=false;$('#storage-warning').textContent=message;}
function openDB(){return new Promise((resolve,reject)=>{if(!('indexedDB'in window))return reject(Error('IndexedDB unavailable'));const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(Error('Database blocked'));});}
function readDB(){return new Promise((resolve,reject)=>{const req=db.transaction(STORE,'readonly').objectStore(STORE).get('state');req.onsuccess=()=>resolve(req.result??null);req.onerror=()=>reject(req.error);});}
function writeDB(data){return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(data,'state');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
async function loadState(){let stored=null,local=null;try{db=await openDB();stored=await readDB();}catch(e){console.warn('DB unavailable',e);db=null;}try{local=localStorage.getItem(KEY);}catch(e){console.warn('Local fallback unavailable',e);}
  const candidates=[];for(const value of [stored,local])try{if(value)candidates.push(normalize(JSON.parse(value)));}catch(e){console.warn('Skipped corrupt data',e);}
  if(candidates.length)state=candidates.sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt))[0];else if(stored||local)showWarning('Saved data could not be opened. Restore a JSON backup if you have one.');
  wizardSchedule=copy(state.settings.schedule);wizardDate=state.settings.startDate;
  const legacySetup = [stored,local].some(value=>{try{const x=JSON.parse(value);return x?.settings?.setupComplete===true;}catch{return false;}});
  if(!state.settings.setupComplete&&legacySetup)wizardStep=2;
  cycleEditor=Math.max(1,scheduleFor(todayISO()).cycle);
}
function save(){clearTimeout(pending);pending=null;const json=JSON.stringify(state);let localOK=false;try{localStorage.setItem(KEY,json);localOK=true;}catch(e){console.warn('Local fallback write failed',e);}
  if(!db){if(!localOK)showWarning('Device storage unavailable. Export a backup now.');return Promise.resolve(localOK);}
  queue=queue.catch(()=>false).then(()=>writeDB(json).then(()=>true).catch(e=>{console.warn('Database write failed',e);if(!localOK)showWarning('Could not save data. Export a backup.');return false;}));return queue;}
function changed(debounce=false){state.updatedAt=new Date().toISOString();if(debounce){clearTimeout(pending);pending=setTimeout(save,180);}else save();}
function scheduleFor(date){
  const idx=between(state.settings.startDate,date),weekday=fromISO(date).getDay(),programIndex=state.settings.schedule[weekday];
  const plan=programIndex==null?null:PLANS[programIndex];
  const common={dayIndex:idx,weekday,programIndex,dayNumber:programIndex==null?(weekday===2?3:7):programIndex+1,isTraining:!!plan?.exercises.length};
  if(idx<0)return {...common,beforeStart:true,phase:'531',week:0,cycle:0};
  return {...common,beforeStart:false,phase:'531',cycle:Math.floor(idx/21)+1,week:Math.floor(idx/7)%3+1};
}
function getTrainingMaxes(cycle){
  const keys=Object.keys(state.tmByCycle).map(Number).filter(k=>k<=cycle).sort((a,b)=>b-a);
  return Object.fromEntries(LIFTS.map(l=>{
    const latest=keys.map(k=>state.tmByCycle[k]?.[l.id]).find(n=>n>0);
    return [l.id,latest??(state.settings.oneRepMaxes[l.id]>0?state.settings.oneRepMaxes[l.id]*0.9:null)];
  }));
}
function previousExercise(id,beforeDate){const dates=Object.keys(state.sessions).filter(d=>d<beforeDate).sort().reverse();for(const date of dates){const item=state.sessions[date].exercises.find(e=>e.id===id&&e.sets.some(s=>s.done));if(item)return {...item,date};}return null;}
function makeSets(def,s,date){
  if(LIFT_IDS.has(def.id)){
    const tm=getTrainingMaxes(s.cycle)[def.id];return state.settings.template[s.week-1].map(t=>{const w=tm?roundLoad(tm*t.pct/100,state.settings.increment):null;return {weight:w,reps:null,seconds:null,done:false,target:`${t.reps}${t.amrap?'+':''}`,pct:t.pct,targetWeight:w};});
  }
  const last=previousExercise(def.id,date);const w=last?.sets.find(x=>x.done&&x.weight>0)?.weight??null;
  return Array.from({length:def.sets},()=>({weight:def.type==='time'?null:w,reps:null,seconds:null,done:false,target:def.type==='time'?`${def.min}s`:`${def.min}–${def.max}`,pct:null,targetWeight:null}));
}
function createSession(date){const s=scheduleFor(date);if(s.beforeStart)throw Error('Program has not started.');const plan=s.programIndex==null?null:PLANS[s.programIndex];return {date,dayNumber:s.dayNumber,phase:s.phase,cycle:s.cycle,week:s.week,exercises:(plan?.exercises??[]).map(def=>({id:def.id,name:def.name,type:def.type,sets:makeSets(def,s,date)})),notes:'',completed:false,completedAt:null,updatedAt:new Date().toISOString()};}
function getSession(date){return state.sessions[date]??createSession(date);}
function writableSession(date){if(!state.sessions[date])state.sessions[date]=createSession(date);state.sessions[date].updatedAt=new Date().toISOString();return state.sessions[date];}
function allSets(){return Object.values(state.sessions).flatMap(s=>s.exercises.flatMap(e=>e.sets.filter(t=>t.done).map(t=>({...t,exId:e.id,name:e.name,date:s.date,phase:s.phase}))));}
function counted(s){return s.exercises.reduce((n,e)=>n+e.sets.filter(t=>t.done).length,0);}
function total(s){return s.exercises.reduce((n,e)=>n+e.sets.length,0);}
function labelForSession(s){return PLANS[s.dayNumber-1]?.name??'Recovery';}
const inputNumber=(v,attr='')=>`<input class="num-input" type="number" inputmode="decimal" step="any" min="0" value="${v==null?'':safe(v)}" ${attr}>`;
function toast(message){const node=$('#toast');node.textContent=message;node.classList.add('visible');clearTimeout(toastDelay);toastDelay=setTimeout(()=>node.classList.remove('visible'),3200);}
function render(){
  $('#tabbar').hidden=!state.settings.setupComplete;
  if(!state.settings.setupComplete){$('#screen').innerHTML=renderWizard();}
  else{$('#screen').innerHTML=({today:renderWorkout,history:renderHistory,settings:renderSettings})[tab]();}
  document.querySelectorAll('#tabbar .tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  $('#connection').textContent=navigator.onLine?'ON DEVICE':'OFFLINE';renderTimer();
}
function goTo(next,date=null){tab=next;if(date)selectedDate=date;render();window.scrollTo(0,0);}
function planSelect(weekday,val){return `<select aria-label="${WEEKDAYS[weekday]} workout" data-day-plan="${weekday}">${PLAN_OPTIONS.map(i=>`<option value="${i}" ${i===val?'selected':''}>${safe(PLANS[i].name)}</option>`).join('')}</select>`;}
function scheduleEditor(schedule,kind){return `<div class="week-editor">${WEEKDAYS.map((name,i)=>{
  const active=schedule[i]!=null;return `<div class="week-row"><label class="day-toggle"><input type="checkbox" data-day-toggle="${i}" data-kind="${kind}" ${active?'checked':''}><span class="toggle-box"></span><span>${name}</span></label><div class="day-plan">${active?planSelect(i,schedule[i]):'<span class="rest-label">Rest day</span>'}</div></div>`;
}).join('')}</div>`;}
function renderWizard(){
  const top=`<div class="wizard-top"><div class="step-label">PERSONAL TRAINING · SETUP</div><div class="step-dots"><span class="${wizardStep===0?'on':''}"></span><span class="${wizardStep===1?'on':''}"></span><span class="${wizardStep===2?'on':''}"></span></div></div>`;
  if(wizardStep===0)return `${top}<div class="welcome"><div class="welcome-monogram">S</div><p class="eyebrow">TRAIN WITH PURPOSE</p><h1>Your training.<br>Your rules.</h1><p>One simple place to follow your split, log your lifts, and get stronger. Set it up once. Then just train.</p><button class="button primary block" data-action="wizard-next">Start New Program <span>→</span></button><small>Private on your iPhone. No account needed.</small></div>`;
  if(wizardStep===1)return `${top}<section class="heading"><p class="eyebrow">STEP 1 OF 2</p><h1>Build your week.</h1><p>Choose your training days and assign a workout. Rest days stay clear. You can change this later.</p></section>
    <label class="field-label" for="wizard-start">PROGRAM START DATE</label><input class="field" type="date" id="wizard-start" value="${safe(wizardDate)}">
    <div class="section-label">YOUR WEEKLY SPLIT</div>${scheduleEditor(wizardSchedule,'wizard')}
    <div class="hint">Default: Sun, Mon, Wed, Thu, Fri. Your first scheduled workout is Chest & Arms on Sunday, November 22.</div>
    <button class="button primary block" data-action="wizard-next">Continue to strength setup <span>→</span></button>
    <button class="text-button block" data-action="wizard-back">Back</button>`;
  return `${top}<section class="heading"><p class="eyebrow">STEP 2 OF 2</p><h1>Set your strength.</h1><p>Enter your <strong>estimated or measured 100% one-rep maxes</strong> from your strength assessments. We calculate 90% training maxes and begin <strong>5/3/1 on your first training day</strong>.</p></section>
    <div class="max-input-list">${LIFTS.map(l=>`<label class="max-input-row"><span>${safe(l.name)}</span><div class="max-input-right">${inputNumber(state.settings.oneRepMaxes[l.id],`data-wizard-max="${l.id}" placeholder="1RM" aria-label="${safe(l.name)} estimated or measured one-rep max"`)}<small>${safe(state.settings.unit)}</small></div></label>`).join('')}</div>
    <p class="hint" id="max-preview">Training max = your entered 1RM × 0.90.</p>
    <details class="advanced estimator"><summary>Need to estimate a 1RM from a working set? <span>⌄</span></summary>
      <p class="hint">Use the heaviest controlled working set from your November 19–20 assessments. No true max attempt required. The calculation is an estimate, not a guarantee.</p>
      ${LIFTS.map(l=>`<div class="estimate-row"><strong>${safe(l.name)}</strong><div><label>WEIGHT ${inputNumber(null,`data-estimate-weight="${l.id}" aria-label="${safe(l.name)} assessment weight" placeholder="Weight"`)}</label><label>REPS ${inputNumber(5,`data-estimate-reps="${l.id}" aria-label="${safe(l.name)} assessment reps" placeholder="5"`)}</label></div></div>`).join('')}
      <button class="button outline block" data-action="calculate-estimates">Calculate and fill 1RMs</button>
    </details>
    <button class="button primary block" data-action="wizard-save-known">Start 5/3/1 on ${safe(prettyDate(wizardDate))} <span>→</span></button>
    <button class="text-button block" data-action="wizard-back">Back to schedule</button>`;
}
function dateNav(){return `<div class="date-nav"><button class="arrow" data-action="date-shift" data-days="-1" aria-label="Previous date">‹</button><input type="date" id="workout-date" aria-label="Workout date" value="${safe(selectedDate)}"><button class="arrow" data-action="date-shift" data-days="1" aria-label="Next date">›</button>${selectedDate!==todayISO()?'<button class="today-button" data-action="today">Today</button>':''}</div>`;}
function weeklySummary(){
  const d=fromISO(selectedDate);const start=addDays(selectedDate,-d.getDay());const cells=WEEKDAYS.map((day,i)=>{const date=addDays(start,i),s=scheduleFor(date),done=state.sessions[date]?.completed;const active=!s.beforeStart&&s.isTraining;return `<button data-action="open-workout" data-date="${date}" class="week-dot ${date===selectedDate?'selected':''} ${done?'completed':''}" aria-label="${safe(day)} ${safe(prettyDate(date))}${done?' completed':''}"><span>${day.slice(0,1)}</span><i class="${active?'training':'rest'}">${done?'✓':active?'•':'–'}</i></button>`;}).join('');
  const current=Array.from({length:7},(_,i)=>addDays(start,i)).filter(date=>{const s=scheduleFor(date);return !s.beforeStart&&s.isTraining;});const completed=current.filter(d=>state.sessions[d]?.completed).length;
  return `<div class="weekly"><div class="weekly-header"><span>THIS WEEK</span><strong>${completed}/${current.length} sessions</strong></div><div class="week-dots">${cells}</div></div>`;
}
function lastSummary(id,date){const prev=previousExercise(id,date);if(!prev)return 'No previous log';const done=prev.sets.filter(s=>s.done);if(prev.type==='time')return `${prettyDate(prev.date)} · ${format(Math.max(...done.map(x=>x.seconds??0)))}s`;
  const top=done.filter(x=>x.reps>0).sort((a,b)=>(b.weight||0)-(a.weight||0))[0];return top?`${prettyDate(prev.date)} · ${format(top.weight)} × ${format(top.reps)}`:'No previous log';}
function exerciseCard(def,entry,s){const primary=entry.sets.some(t=>t.pct!=null)&&LIFT_IDS.has(def.id);
  const head=`${entry.sets.length} sets · ${def.type==='time'?`${def.min}s`:primary?'5/3/1':`${def.min}–${def.max} reps`}${def.note?` · ${safe(def.note)}`:''}`;
  const rows=entry.sets.map((set,i)=>`<div class="log-row ${set.done?'done':''}"><div class="set-ordinal"><strong>${i+1}</strong><span>${primary?`${set.pct}% · ${set.target}`:set.target}</span></div>${def.type==='time'?`<label class="log-field"><span>SECONDS</span>${inputNumber(set.seconds,`data-set-field="seconds" data-ex="${def.id}" data-index="${i}" aria-label="${safe(def.name)} set ${i+1} seconds" placeholder="60"`)}</label>`:`<label class="log-field"><span>${safe(state.settings.unit.toUpperCase())}</span>${inputNumber(set.weight,`data-set-field="weight" data-ex="${def.id}" data-index="${i}" aria-label="${safe(def.name)} set ${i+1} weight" placeholder="—"`)}</label><label class="log-field"><span>REPS</span>${inputNumber(set.reps,`data-set-field="reps" data-ex="${def.id}" data-index="${i}" aria-label="${safe(def.name)} set ${i+1} reps" placeholder="${primary?set.target.replace('+',''):def.min}"`)}</label>`}<button class="set-done ${set.done?'checked':''}" aria-label="${set.done?'Unmark':'Mark'} ${safe(def.name)} set ${i+1}" aria-pressed="${set.done}" data-action="toggle-set" data-ex="${def.id}" data-index="${i}">${set.done?'✓':'○'}</button></div>`).join('');
  return `<article class="exercise-card" data-exercise="${safe(def.id)}"><div class="exercise-top"><div><h2>${safe(def.name)}</h2><p>${safe(head)}</p></div><span class="count-pill">${entry.sets.filter(x=>x.done).length}/${entry.sets.length}</span></div>${primary?`<div class="lift-target">TRAINING MAX <strong>${format(getTrainingMaxes(s.cycle)[def.id])} ${safe(state.settings.unit)}</strong></div>`:''}<div class="log-grid">${rows}</div><div class="previous">LAST TIME <span>${safe(lastSummary(def.id,selectedDate))}</span></div></article>`;
}
function renderWorkout(){const s=scheduleFor(selectedDate);const suffix=dateNav();
  if(s.beforeStart&&!state.sessions[selectedDate])return `<section class="heading"><p class="eyebrow">YOUR TRAINING</p><h1>Ready when you are.</h1><p>${prettyDate(selectedDate,true)}</p></section>${suffix}<div class="quiet-card"><div class="quiet-icon">◷</div><h2>Starts ${safe(prettyDate(state.settings.startDate,true))}</h2><p>Your split is set. Until then, there are no workouts to log. Use the date arrows to preview your upcoming sessions.</p><button class="button outline block" data-action="jump-start">View first training day →</button></div>${weeklySummary()}`;
  const session=getSession(selectedDate);const program=PLANS[session.dayNumber-1];const rest=!session.exercises.length;const done=counted(session),totalSets=total(session);
  const phase=session.phase==='legacy'?'Earlier workout log':`5/3/1 · Cycle ${session.cycle} / Week ${session.week}`;
  const notice=session.phase==='531'&&session.exercises.some(e=>LIFT_IDS.has(e.id)&&!getTrainingMaxes(s.cycle)[e.id])?`<div class="inline-notice">Training max missing for a primary lift. Enter your 1RM in Settings to get prescribed weights.</div>`:'';
  const content=rest?`<div class="quiet-card"><div class="quiet-icon">✳</div><h2>Recovery day.</h2><p>Rest, walk, or get some light movement. Your next training session is on the schedule.</p></div>`:session.exercises.map(e=>exerciseCard(EXERCISES.get(e.id),e,s)).join('');
  const caption=session.phase==='legacy'?'Previously recorded workout. You can edit this log.':'Main lift weights use 90% of your 1RM as a training max. Week 1 starts on your program start date.';
  return `<section class="heading workout-heading"><div><p class="eyebrow">${selectedDate===todayISO()?'TODAY’S WORKOUT':'YOUR WORKOUT'} · ${safe(prettyDate(selectedDate))}</p><h1>${safe(program?.name||'Recovery')}</h1><p class="phase-line">${safe(phase)}</p></div></section>${suffix}${weeklySummary()}
    <div class="workout-status"><span>${session.phase==='legacy'?'EARLIER WORKOUT':'5/3/1 PROGRAM'}</span><strong>${rest?'RECOVERY':`${done} / ${totalSets} SETS`}</strong></div><div class="context-line">${safe(caption)}</div>${notice}${content}
    ${!rest?`<button class="rest-link" data-action="start-timer">◷ Start ${secondsText(state.settings.restSeconds)} rest timer</button>`:''}
    <div class="notes-wrap"><label class="section-label" for="workout-notes">SESSION NOTES</label><textarea id="workout-notes" data-notes placeholder="Anything worth remembering?" rows="2" maxlength="20000">${safe(session.notes)}</textarea></div>
    <button class="button ${session.completed?'outline':'primary'} block finish" data-action="finish-workout">${session.completed?'✓ Workout completed · Reopen':'✓ Complete '+(rest?'recovery':'workout')}</button>`;
}
function records(){return LIFTS.map(l=>{const sets=allSets().filter(x=>x.exId===l.id&&x.weight>0&&x.reps>0);const best=sets.reduce((a,b)=>!a||(estimated1RM(b.weight,b.reps)||0)>(estimated1RM(a.weight,a.reps)||0)?b:a,null);return `<div class="record-item"><div><strong>${safe(l.name)}</strong><small>${best?`${prettyDate(best.date)} · ${format(best.weight)} × ${format(best.reps)}`:'No logged lifts yet'}</small></div><div class="record-value">${best?format(estimated1RM(best.weight,best.reps)):'—'}<small>EST. 1RM · ${safe(state.settings.unit)}</small></div></div>`;}).join('');}
function accessoryRecords(){const best=new Map();for(const x of allSets()){if(LIFT_IDS.has(x.exId)||!(x.weight>0&&x.reps>0))continue;const old=best.get(x.exId);if(!old||x.weight>old.weight)best.set(x.exId,x);}return [...best.values()].sort((a,b)=>a.name.localeCompare(b.name)).map(x=>`<div class="record-item"><div><strong>${safe(x.name)}</strong><small>${prettyDate(x.date)}</small></div><div class="record-value">${format(x.weight)}<small>${safe(state.settings.unit)} × ${format(x.reps)} reps</small></div></div>`).join('')||'<p class="subtle">Log accessory work to see your best lifts.</p>'; }
function renderHistory(){const sessions=Object.values(state.sessions).sort((a,b)=>b.date.localeCompare(a.date));return `<section class="heading"><p class="eyebrow">YOUR RECORD</p><h1>History.</h1><p>Every session, right where you left it.</p></section><details class="records-panel"><summary>Personal records <span>⌄</span></summary>${records()}<details class="accessory-records"><summary>Accessory lift records <span>⌄</span></summary>${accessoryRecords()}</details></details><div class="section-label">RECENT SESSIONS <span>${sessions.length} TOTAL</span></div>
    ${sessions.length?sessions.map(s=>`<button class="history-row" data-action="open-workout" data-date="${safe(s.date)}"><div class="history-day"><strong>${fromISO(s.date).getDate()}</strong><small>${fromISO(s.date).toLocaleDateString('en-US',{month:'short'})}</small></div><div class="history-main"><strong>${safe(labelForSession(s))}</strong><small>${s.phase==='legacy'?'EARLIER LOG':`CYCLE ${s.cycle} · WEEK ${s.week}`} · ${counted(s)} sets</small></div><span class="history-check ${s.completed?'yes':''}">${s.completed?'✓':'›'}</span></button>`).join(''):`<div class="quiet-card"><h2>Nothing logged yet.</h2><p>Your completed workouts and draft sessions will appear here. Tap any entry to edit it later.</p></div>`}`;}
function maxRow(l,val,selector){return `<label class="max-input-row"><span>${safe(l.name)}</span><div class="max-input-right">${inputNumber(val,`${selector}="${l.id}" aria-label="${safe(l.name)} one-rep max" placeholder="—"`)}<small>${safe(state.settings.unit)}</small></div></label>`;}
function renderSettings(){const s=state.settings;const now=scheduleFor(todayISO());const tms=getTrainingMaxes(Math.max(1,cycleEditor));return `<section class="heading"><p class="eyebrow">KEEP IT SIMPLE</p><h1>Settings.</h1><p>Your split, strength numbers and data.</p></section>
    <section class="settings-section"><div class="section-heading"><h2>Your schedule</h2><button class="small-link" data-action="edit-schedule">${editSchedule?'Cancel':'Edit'}</button></div>
    ${editSchedule?`<label class="field-label" for="start-date">PROGRAM START</label><input class="field" id="start-date" type="date" value="${safe(s.startDate)}">${scheduleEditor(scheduleDraft??s.schedule,'settings')}<button class="button primary block" data-action="save-schedule">Save schedule</button>`:`<p class="subtle">Started ${prettyDate(s.startDate,true)}</p><div class="schedule-summary">${WEEKDAYS.map((d,i)=>s.schedule[i]!=null?`<div><strong>${d.slice(0,3)}</strong><span>${safe(PLANS[s.schedule[i]].name)}</span></div>`:'').join('')}</div>`}</section>
    <section class="settings-section"><div class="section-heading"><h2>Strength maxes</h2></div><p class="subtle">Enter your actual 1RM. Your training max is automatically 90% of it. Current cycle: ${Math.max(1,now.cycle)}.</p>
    <div class="max-input-list">${LIFTS.map(l=>maxRow(l,s.oneRepMaxes[l.id],'data-settings-max')).join('')}</div><button class="button outline block" data-action="save-one-rep-maxes">Save 1RM values / update 90% TM</button>
    <details class="advanced"><summary>Training maxes by cycle <span>⌄</span></summary><p class="hint">Override the training max directly for a future cycle. Existing workout entries are not changed.</p><label class="field-label" for="cycle-select">CYCLE</label><select id="cycle-select" class="field">${Array.from({length:Math.max(3,now.cycle+2)},(_,i)=>i+1).map(c=>`<option value="${c}" ${c===cycleEditor?'selected':''}>Cycle ${c}</option>`).join('')}</select><div class="max-input-list">${LIFTS.map(l=>maxRow(l,tms[l.id],'data-cycle-tm')).join('')}</div><button class="button outline block" data-action="save-cycle-maxes">Save cycle training maxes</button></details></section>
    <section class="settings-section"><h2>Preferences</h2><div class="setting-grid"><label>Weight units<select id="unit-select" class="field"><option value="lb" ${s.unit==='lb'?'selected':''}>Pounds (lb)</option><option value="kg" ${s.unit==='kg'?'selected':''}>Kilograms (kg)</option></select></label><label>Plate increment (${s.unit})<input id="increment" class="field" type="number" inputmode="decimal" step="0.25" min="0.25" max="100" value="${s.increment}"></label></div><details class="advanced"><summary>Optional rest timer <span>⌄</span></summary><div class="setting-grid"><label>Rest duration<select id="rest-select" class="field">${[60,90,120,150,180,240,300].map(n=>`<option value="${n}" ${n===s.restSeconds?'selected':''}>${secondsText(n)}</option>`).join('')}</select></label><label class="check-label"><input type="checkbox" id="auto-rest" ${s.autoRest?'checked':''}> Auto-start after each set</label></div></details><details class="advanced"><summary>5/3/1 percentages <span>⌄</span></summary>${s.template.map((week,i)=>`<div class="template-week"><strong>Week ${i+1}</strong>${week.map((t,j)=>`<label>Set ${j+1}: <input type="number" data-template-week="${i}" data-template-set="${j}" data-template-prop="pct" min="1" max="150" value="${t.pct}"> % × <input type="number" data-template-week="${i}" data-template-set="${j}" data-template-prop="reps" min="1" max="30" value="${t.reps}"> reps <input aria-label="AMRAP" type="checkbox" data-template-week="${i}" data-template-set="${j}" data-template-prop="amrap" ${t.amrap?'checked':''}>+</label>`).join('')}</div>`).join('')}<button class="text-button block" data-action="reset-template">Restore classic 5/3/1</button></details></section>
    <section class="settings-section"><h2>Backups</h2><p class="subtle">Data stays on this phone. Export JSON regularly; importing replaces all current data.</p><button class="button primary block" data-action="export">↓ Export JSON backup</button><label for="import-file" class="button outline block file-label">↑ Import JSON backup</label><input type="file" id="import-file" accept=".json,application/json" hidden><button class="erase" data-action="erase">Erase all local data</button></section><p class="footer-note">SOL STRENGTH 3.0 · OFFLINE FIRST · NO LOGIN</p>`;}
function secondsText(n){n=Math.max(0,Math.ceil(n));return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;}
function startTimer(){const secs=state.settings.restSeconds;timer={running:true,deadline:Date.now()+secs*1000,remaining:secs,finished:false};renderTimer();}
function renderTimer(){const el=$('#timer-bar');if(timer.running){timer.remaining=Math.max(0,Math.ceil((timer.deadline-Date.now())/1000));if(!timer.remaining){timer.running=false;timer.finished=true;toast('Rest complete.');}}
  el.hidden=!timer.running&&!timer.remaining&&!timer.finished;if(el.hidden)return;el.innerHTML=`<span>REST <strong>${secondsText(timer.remaining)}</strong></span><button data-action="timer-pause">${timer.finished?'Done':timer.running?'Pause':'Resume'}</button><button data-action="timer-clear" aria-label="Close timer">×</button>`;}
function exportData(){const payload={app:APP,version:SCHEMA,exportedAt:new Date().toISOString(),data:state};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`sol-strength-backup-${todayISO()}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);toast('Backup downloaded. Save it to Files or iCloud Drive.');}
async function importData(file){if(!file)return;if(file.size>20*1024*1024){toast('Backup must be under 20 MB.');return;}try{const raw=JSON.parse(await file.text());if(raw.app!==APP||![1,2,3].includes(raw.version)||!raw.data)throw Error('Not a SOL STRENGTH backup.');const restored=normalize(raw.data);if(!confirm(`Restore ${Object.keys(restored.sessions).length} sessions? This REPLACES your current data. Export a backup first if needed.`))return;state=restored;wizardSchedule=copy(state.settings.schedule);wizardDate=state.settings.startDate;wizardStep=0;selectedDate=todayISO();tab='today';cycleEditor=1;await save();render();toast('Backup restored.');}catch(e){console.error(e);toast(`Import failed: ${e.message}`);}}
function saveSetup(){state.settings.startDate=wizardDate;state.settings.schedule=copy(wizardSchedule);state.settings.setupComplete=true;tab='today';selectedDate=todayISO();cycleEditor=1;changed();render();toast('Your program is ready.');}
function applyWizardKnown(){const values={};for(const l of LIFTS){const node=document.querySelector(`[data-wizard-max="${l.id}"]`),v=num(node?.value);if(!(v>0&&v<=100000)){toast('Enter or estimate a positive 1RM for all four lifts.');node?.focus();return;}values[l.id]=v;}
  state.settings.oneRepMaxes=values;state.tmByCycle[1]=Object.fromEntries(LIFTS.map(l=>[l.id,values[l.id]*.9]));saveSetup();}
function changeUnits(unit){if(unit===state.settings.unit)return;const f=unit==='kg'?.45359237:2.2046226218;const change=v=>v==null?null:Number((v*f).toFixed(2));for(const l of LIFTS)state.settings.oneRepMaxes[l.id]=change(state.settings.oneRepMaxes[l.id]);for(const m of Object.values(state.tmByCycle))for(const l of LIFTS)m[l.id]=change(m[l.id]);for(const sess of Object.values(state.sessions))for(const e of sess.exercises)for(const t of e.sets){t.weight=change(t.weight);t.targetWeight=change(t.targetWeight);}state.settings.unit=unit;state.settings.increment=unit==='kg'?2.5:5;changed();render();toast(`Converted to ${unit}.`);}
function handleAction(el){const action=el.dataset.action;
  if(action==='wizard-next'){if(wizardStep===1){const count=Object.values(wizardSchedule).filter(v=>v!=null).length;if(!count){toast('Choose at least one training day.');return;}if(!validDate(wizardDate)){toast('Choose a valid start date.');return;}}wizardStep=Math.min(2,wizardStep+1);render();return;}
  if(action==='wizard-back'){wizardStep=Math.max(0,wizardStep-1);render();return;}
  if(action==='wizard-save-known'){applyWizardKnown();return;}
  if(action==='calculate-estimates'){
    let filled=0;
    for(const l of LIFTS){const weight=num(document.querySelector(`[data-estimate-weight="${l.id}"]`)?.value),reps=num(document.querySelector(`[data-estimate-reps="${l.id}"]`)?.value);
      if(weight==null)continue;
      if(!(weight>0&&weight<=100000&&Number.isInteger(reps)&&reps>=1&&reps<=12)){
        toast('Use a positive weight and 1–12 reps for each assessment set.');return;
      }
      const value=estimated1RM(weight,reps);const input=document.querySelector(`[data-wizard-max="${l.id}"]`);
      if(input){input.value=Number(value.toFixed(1));filled++;}
    }
    if(!filled){toast('Enter an assessment weight and reps first.');return;}
    const preview=$('#max-preview');if(preview)preview.textContent='Estimated 1RMs filled in above. Training maxes will use 90% of those values.';
    toast('Estimated one-rep maxes calculated.');return;
  }
  if(action==='date-shift'){selectedDate=addDays(selectedDate,Number(el.dataset.days));render();return;}
  if(action==='today'){selectedDate=todayISO();render();return;}
  if(action==='jump-start'){selectedDate=state.settings.startDate;render();return;}
  if(action==='open-workout'){goTo('today',el.dataset.date);return;}
  if(action==='toggle-set'){const e=writableSession(selectedDate).exercises.find(x=>x.id===el.dataset.ex);const set=e?.sets[Number(el.dataset.index)];if(!set)return;const timed=e.type==='time';if(!set.done&&!(timed?set.seconds>0:set.reps>0)){toast(timed?'Enter seconds first.':'Enter reps first.');$(`[data-set-field="${timed?'seconds':'reps'}"][data-ex="${e.id}"][data-index="${el.dataset.index}"]`)?.focus();return;}set.done=!set.done;if(set.done&&state.settings.autoRest)startTimer();changed();render();return;}
  if(action==='finish-workout'){const s=writableSession(selectedDate);if(!s.completed&&total(s)>0&&!counted(s)){toast('Log at least one set first.');return;}s.completed=!s.completed;s.completedAt=s.completed?new Date().toISOString():null;changed();render();toast(s.completed?'Workout saved.':'Workout reopened.');return;}
  if(action==='start-timer'){startTimer();return;}
  if(action==='timer-pause'){if(timer.finished){timer={running:false,deadline:0,remaining:0,finished:false};}else if(timer.running){timer.remaining=Math.max(0,Math.ceil((timer.deadline-Date.now())/1000));timer.running=false;}else if(timer.remaining){timer.running=true;timer.deadline=Date.now()+timer.remaining*1000;}renderTimer();return;}
  if(action==='timer-clear'){timer={running:false,deadline:0,remaining:0,finished:false};renderTimer();return;}
  if(action==='edit-schedule'){editSchedule=!editSchedule;scheduleDraft=editSchedule?copy(state.settings.schedule):null;render();return;}
  if(action==='save-schedule'){const selected=Object.values(scheduleDraft??{}).filter(v=>v!=null).length;if(!selected){toast('Choose at least one workout day.');return;}const elDate=$('#start-date');if(!validDate(elDate.value)){toast('Invalid start date.');return;}if(Object.keys(state.sessions).length&& !confirm('Changing your split or start date affects future scheduled workouts. Logged workouts keep their existing sets. Continue?'))return;state.settings.startDate=elDate.value;state.settings.schedule=copy(scheduleDraft);editSchedule=false;scheduleDraft=null;changed();render();toast('Schedule saved.');return;}
  if(action==='save-one-rep-maxes'){const vals={};for(const l of LIFTS){const v=num(document.querySelector(`[data-settings-max="${l.id}"]`)?.value);if(v!=null&&!(v>0&&v<=100000)){toast('Maxes must be positive.');return;}vals[l.id]=v;}state.settings.oneRepMaxes=vals;const cycle=Math.max(1,scheduleFor(todayISO()).cycle);const existing=getTrainingMaxes(cycle);state.tmByCycle[cycle]=Object.fromEntries(LIFTS.map(l=>[l.id,vals[l.id]!=null?vals[l.id]*.9:existing[l.id]]));changed();render();toast('1RM values and 90% training maxes saved.');return;}
  if(action==='save-cycle-maxes'){const values={};for(const l of LIFTS){const v=num(document.querySelector(`[data-cycle-tm="${l.id}"]`)?.value);if(v!=null&&!(v>0&&v<=100000)){toast('Enter a positive training max.');return;}values[l.id]=v;}state.tmByCycle[cycleEditor]=values;changed();render();toast(`Cycle ${cycleEditor} training maxes saved.`);return;}
  if(action==='reset-template'){if(!confirm('Reset future 5/3/1 targets to the classic three-week scheme?'))return;state.settings.template=copy(DEFAULT_TEMPLATE);changed();render();return;}
  if(action==='export'){exportData();return;}
  if(action==='erase'){if(!confirm('Permanently erase ALL local workout data? Export a JSON backup first.'))return;if(!confirm('Final confirmation: erase sessions and start setup again?'))return;state=blankState();wizardStep=0;wizardSchedule=copy(DEFAULT_SCHEDULE);wizardDate=state.settings.startDate;changed();render();return;}
}
function handleInput(event){const el=event.target;
  if(el.matches('[data-set-field]')){const set=writableSession(selectedDate).exercises.find(e=>e.id===el.dataset.ex)?.sets[Number(el.dataset.index)];if(!set)return;const value=num(el.value);if(value!=null&&(value<0||value>100000)){toast('Enter a valid nonnegative number.');el.value='';return;}set[el.dataset.setField]=value;changed(true);return;}
  if(el.matches('[data-notes]')){writableSession(selectedDate).notes=el.value;changed(true);return;}
  if(el.id==='wizard-start'){wizardDate=el.value;return;}
  if(el.matches('[data-wizard-max]')){const v=num(el.value);const preview=$('#max-preview');if(preview){const parts=LIFTS.map(l=>{const n=num(document.querySelector(`[data-wizard-max="${l.id}"]`)?.value);return n>0?`${l.name}: ${format(n*.9)} ${state.settings.unit}`:null;}).filter(Boolean);preview.textContent=parts.length?`Training max (90%): ${parts.join(' · ')}`:'Training max = your entered 1RM × 0.90.';}return;}
}
function handleChange(event){const el=event.target;
  if(el.id==='workout-date'){if(validDate(el.value)){selectedDate=el.value;render();}return;}
  if(el.matches('[data-day-toggle]')){const idx=Number(el.dataset.dayToggle),target=el.dataset.kind==='wizard'?wizardSchedule:scheduleDraft;if(!target)return;target[idx]=el.checked?(DEFAULT_SCHEDULE[idx]??PLAN_OPTIONS[0]):null;render();return;}
  if(el.matches('[data-day-plan]')){const idx=Number(el.dataset.dayPlan),target=state.settings.setupComplete&&editSchedule?scheduleDraft:wizardSchedule;if(target)target[idx]=Number(el.value);return;}
  if(el.id==='unit-select'){changeUnits(el.value);return;}
  if(el.id==='increment'){const n=num(el.value);if(n==null||n<.25||n>100){toast('Enter a valid increment between 0.25 and 100.');render();return;}state.settings.increment=n;changed();return;}
  if(el.id==='rest-select'){state.settings.restSeconds=Number(el.value);changed();return;}
  if(el.id==='auto-rest'){state.settings.autoRest=el.checked;changed();return;}
  if(el.id==='cycle-select'){cycleEditor=Number(el.value);render();return;}
  if(el.matches('[data-template-prop]')){const set=state.settings.template[Number(el.dataset.templateWeek)]?.[Number(el.dataset.templateSet)];if(!set)return;const field=el.dataset.templateProp;const n=num(el.value);if(field==='amrap')set.amrap=el.checked;else if(n&&n>0&&n<=(field==='pct'?150:30))set[field]=Math.round(n);else{toast('Invalid percentage or rep target.');render();return;}changed();return;}
  if(el.id==='import-file'){importData(el.files?.[0]);el.value='';return;}
  if(el.matches('[data-set-field],[data-notes]'))save();
}
async function init(){await loadState();document.addEventListener('click',event=>{const tabTarget=event.target.closest('[data-tab]');if(tabTarget){goTo(tabTarget.dataset.tab);return;}const action=event.target.closest('[data-action]');if(action)handleAction(action);});document.addEventListener('input',handleInput);document.addEventListener('change',handleChange);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&pending)save();renderTimer();});window.addEventListener('pagehide',()=>{if(pending)save();});window.addEventListener('online',render);window.addEventListener('offline',render);setInterval(renderTimer,500);render();if(navigator.storage?.persist)navigator.storage.persist().catch(()=>{});if('serviceWorker'in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(e=>console.warn('Service worker registration failed:',e));}
window.SOL_STRENGTH_TEST=Object.freeze({scheduleFor,estimated1RM,roundLoad,getTrainingMaxes,getState:()=>copy(state),getSession:date=>copy(getSession(date)),waitForSaves:async()=>{if(pending)await save();await queue;}});
init().catch(e=>{console.error('Startup failed',e);$('#screen').innerHTML='<div class="quiet-card"><h2>Unable to start.</h2><p>Check storage availability or restore a JSON backup.</p></div>';});
