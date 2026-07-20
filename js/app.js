/* ---------------------------------------------------------------
   App shell logic.
   NOTE ON THIS PHASE: this is the *foundation* build — file
   structure, Supabase auth, and schema. The feature modules below
   (routine/habits/chores/bills/appointments/workouts) still read
   and write through the local storageGet/storageSet helpers, same
   as V1. Migrating each one to the Supabase tables in schema.sql
   (foods, meal_logs, workouts, habits, tasks, etc.) is the next
   phase, module by module.
--------------------------------------------------------------- */

/* ---------------- Storage helpers (local, pending Supabase migration) ---------------- */
function storageGet(key){
  try{ return localStorage.getItem(key); }catch(e){ return null; }
}
function storageSet(key, value){
  try{ localStorage.setItem(key, value); return true; }catch(e){ return false; }
}
function todayStr(){ return new Date().toISOString().slice(0,10); }
function mondayOfWeek(d){
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0,10);
}
function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ---------------- Generic checklist group (routine / habits / chores) ---------------- */
function createChecklist(prefix, defaultItems, period){
  function getMarker(){
    if(period === 'day') return todayStr();
    if(period === 'week') return mondayOfWeek(new Date());
    if(period === 'month') return new Date().toISOString().slice(0,7);
    return null;
  }
  function getItems(){
    const raw = storageGet(prefix + '-items');
    if(raw){ try{ return JSON.parse(raw); }catch(e){} }
    storageSet(prefix + '-items', JSON.stringify(defaultItems));
    return defaultItems.slice();
  }
  function getState(){
    const marker = getMarker();
    const storedMarker = storageGet(prefix + '-marker');
    const raw = storageGet(prefix + '-state');
    let state = {};
    try{ state = raw ? JSON.parse(raw) : {}; }catch(e){ state = {}; }
    if(period && storedMarker !== marker){
      state = {};
      storageSet(prefix + '-state', JSON.stringify(state));
      storageSet(prefix + '-marker', marker);
    }
    return state;
  }
  function toggle(text, val){
    const state = getState();
    state[text] = val;
    storageSet(prefix + '-state', JSON.stringify(state));
  }
  function addItem(text){
    const items = getItems();
    items.push(text);
    storageSet(prefix + '-items', JSON.stringify(items));
  }
  function removeItem(text){
    let items = getItems();
    items = items.filter(i => i !== text);
    storageSet(prefix + '-items', JSON.stringify(items));
    const state = getState();
    delete state[text];
    storageSet(prefix + '-state', JSON.stringify(state));
  }
  return {getItems, getState, toggle, addItem, removeItem};
}

const routineMorning = createChecklist('routine-morning', ["Get up","Get dressed","Eat breakfast","Check today's priorities"], 'day');
const routineEvening = createChecklist('routine-evening', ["Set out tomorrow's clothes","Tidy one surface","Wind-down / screens off","Lights out"], 'day');
const choresDaily = createChecklist('chores-daily', ["Dishes","Wipe counters","Make bed","Take out trash if full"], 'day');
const choresWeekly = createChecklist('chores-weekly', ["Vacuum/sweep","Clean bathroom","Laundry","Change sheets","Grocery run"], 'week');
const choresMonthly = createChecklist('chores-monthly', ["Deep clean fridge","Dust","Wipe baseboards","Declutter one area"], 'month');

/* Note: habits moved to js/habits.js (Supabase-backed) — no longer part
   of this generic localStorage checklist group. */
const MOUNTS = [
  {group: routineMorning, containerId:'routine-morning-list', showRemove:true},
  {group: routineEvening, containerId:'routine-evening-list', showRemove:true},
  {group: choresDaily, containerId:'chores-daily-list', showRemove:true},
  {group: choresWeekly, containerId:'chores-weekly-list', showRemove:true},
  {group: choresMonthly, containerId:'chores-monthly-list', showRemove:true},
];

function renderChecklist(mount){
  const container = document.getElementById(mount.containerId);
  if(!container) return;
  const items = mount.group.getItems();
  const state = mount.group.getState();
  container.innerHTML = '';
  if(items.length === 0){
    container.innerHTML = '<div class="empty-note">Nothing here yet.</div>';
    return;
  }
  items.forEach((text, idx) => {
    const row = document.createElement('div');
    row.className = 'task-row' + (state[text] ? ' done' : '');
    const cbId = mount.containerId + '-cb-' + idx;
    row.innerHTML =
      '<input type="checkbox" id="' + cbId + '" ' + (state[text] ? 'checked' : '') + '>' +
      '<label for="' + cbId + '">' + escapeHtml(text) + '</label>' +
      (mount.showRemove ? '<button class="row-remove" aria-label="Remove">×</button>' : '');
    row.querySelector('input').addEventListener('change', e => {
      mount.group.toggle(text, e.target.checked);
      renderAllMounts();
    });
    if(mount.showRemove){
      row.querySelector('.row-remove').addEventListener('click', () => {
        mount.group.removeItem(text);
        renderAllMounts();
      });
    }
    container.appendChild(row);
  });
}
function renderAllMounts(){ MOUNTS.forEach(renderChecklist); }

/* ---------------- Today's priorities (max 3) ---------------- */
const TASK_KEY = 'dash-today-tasks';
const MAX_TASKS = 3;
function loadTasks(){
  const raw = storageGet(TASK_KEY);
  try{ return raw ? JSON.parse(raw) : []; }catch(e){ return []; }
}
function saveTasks(t){ storageSet(TASK_KEY, JSON.stringify(t)); }
function renderPriorities(){
  const tasks = loadTasks();
  ['dash-task-list','home-priorities-list'].forEach(id => {
    const list = document.getElementById(id);
    if(!list) return;
    list.innerHTML = '';
    if(tasks.length === 0){
      list.innerHTML = '<div class="empty-note">Nothing added yet — what matters most today?</div>';
    }
    tasks.forEach((t, idx) => {
      const row = document.createElement('div');
      row.className = 'task-row' + (t.done ? ' done' : '');
      const cbId = id + '-t-' + idx;
      row.innerHTML = '<input type="checkbox" id="' + cbId + '" ' + (t.done ? 'checked' : '') + '>' +
        '<label for="' + cbId + '">' + escapeHtml(t.text) + '</label>';
      row.querySelector('input').addEventListener('change', e => {
        const cur = loadTasks();
        cur[idx].done = e.target.checked;
        saveTasks(cur);
        renderPriorities();
      });
      list.appendChild(row);
    });
  });
  const countEl = document.getElementById('dash-task-count');
  if(countEl) countEl.textContent = tasks.length + ' / ' + MAX_TASKS;
  const fullMsg = document.getElementById('dash-full-msg');
  if(fullMsg) fullMsg.style.display = tasks.length >= MAX_TASKS ? 'block' : 'none';
}
function addTask(){
  const input = document.getElementById('dash-task-input');
  const val = input.value.trim();
  if(!val) return;
  const tasks = loadTasks();
  if(tasks.length >= MAX_TASKS){
    document.getElementById('dash-full-msg').style.display = 'block';
    return;
  }
  tasks.push({text: val, done: false});
  saveTasks(tasks);
  input.value = '';
  renderPriorities();
}

/* ---------------- Quick capture inbox ---------------- */
const INBOX_KEY = 'dash-inbox';
function loadInbox(){
  const raw = storageGet(INBOX_KEY);
  try{ return raw ? JSON.parse(raw) : []; }catch(e){ return []; }
}
function saveInbox(items){ storageSet(INBOX_KEY, JSON.stringify(items)); }
function renderInbox(){
  const items = loadInbox();
  const list = document.getElementById('inbox-list');
  const empty = document.getElementById('inbox-empty');
  list.innerHTML = '';
  empty.style.display = items.length === 0 ? 'block' : 'none';
  items.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'inbox-item';
    row.innerHTML = '<span>' + escapeHtml(item) + '</span><button aria-label="Remove">×</button>';
    row.querySelector('button').addEventListener('click', () => {
      const cur = loadInbox();
      cur.splice(idx, 1);
      saveInbox(cur);
      renderInbox();
    });
    list.appendChild(row);
  });
}
function addInboxItem(){
  const input = document.getElementById('inbox-input');
  const val = input.value.trim();
  if(!val) return;
  const items = loadInbox();
  items.unshift(val);
  saveInbox(items);
  input.value = '';
  renderInbox();
}

/* ---------------- Appointments ---------------- */
const APPT_KEY = 'appointments';
function loadAppts(){
  const raw = storageGet(APPT_KEY);
  try{ return raw ? JSON.parse(raw) : []; }catch(e){ return []; }
}
function saveAppts(items){ storageSet(APPT_KEY, JSON.stringify(items)); }
function renderApptsFull(){
  const items = loadAppts();
  items.sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time));
  const list = document.getElementById('appts-list');
  const empty = document.getElementById('appts-empty');
  list.innerHTML = '';
  empty.style.display = items.length === 0 ? 'block' : 'none';
  items.forEach((a) => {
    const row = document.createElement('div');
    row.className = 'appt-item';
    row.innerHTML = '<div class="info"><b>' + escapeHtml(a.title) + '</b><span>' + a.date + (a.time ? ' · ' + a.time : '') + (a.notes ? ' · ' + escapeHtml(a.notes) : '') + '</span></div><button aria-label="Remove">×</button>';
    row.querySelector('button').addEventListener('click', () => {
      const cur = loadAppts();
      saveAppts(cur.filter(x => x.id !== a.id));
      renderApptsFull();
      renderApptsToday();
    });
    list.appendChild(row);
  });
}
function renderApptsToday(){
  const items = loadAppts();
  const today = items.filter(a => a.date === todayStr()).sort((a,b)=>a.time.localeCompare(b.time));
  ['home-appts-today','dash-appts-today'].forEach(id => {
    const el = document.getElementById(id);
    if(!el) return;
    if(today.length === 0){
      el.innerHTML = '<div class="empty-note">Nothing scheduled today.</div>';
      return;
    }
    el.innerHTML = today.map(a => '<div class="appt-item"><div class="info"><b>' + escapeHtml(a.title) + '</b><span>' + (a.time || 'All day') + (a.notes ? ' · ' + escapeHtml(a.notes) : '') + '</span></div></div>').join('');
  });
}
function addAppt(){
  const title = document.getElementById('appt-title').value.trim();
  const date = document.getElementById('appt-date').value;
  const time = document.getElementById('appt-time').value;
  const notes = document.getElementById('appt-notes').value.trim();
  if(!title || !date) return;
  const items = loadAppts();
  items.push({id: Date.now().toString(), title, date, time, notes});
  saveAppts(items);
  document.getElementById('appt-title').value = '';
  document.getElementById('appt-date').value = '';
  document.getElementById('appt-time').value = '';
  document.getElementById('appt-notes').value = '';
  renderApptsFull();
  renderApptsToday();
}

/* ---------------- Bills ---------------- */
const BILLS_KEY = 'bills';
const BILLS_MARKER_KEY = 'bills-marker';
function loadBills(){
  const marker = new Date().toISOString().slice(0,7);
  const storedMarker = storageGet(BILLS_MARKER_KEY);
  const raw = storageGet(BILLS_KEY);
  let bills = [];
  try{ bills = raw ? JSON.parse(raw) : []; }catch(e){ bills = []; }
  if(storedMarker !== marker){
    bills = bills.map(b => ({...b, paid:false}));
    storageSet(BILLS_KEY, JSON.stringify(bills));
    storageSet(BILLS_MARKER_KEY, marker);
  }
  return bills;
}
function saveBills(bills){ storageSet(BILLS_KEY, JSON.stringify(bills)); }
function renderBills(){
  const bills = loadBills();
  bills.sort((a,b) => a.dueDay - b.dueDay);
  const list = document.getElementById('bills-list');
  const empty = document.getElementById('bills-empty');
  const totalEl = document.getElementById('bills-total');
  list.innerHTML = '';
  empty.style.display = bills.length === 0 ? 'block' : 'none';
  let total = 0;
  bills.forEach(b => {
    total += Number(b.amount) || 0;
    const row = document.createElement('div');
    row.className = 'bill-item';
    row.innerHTML =
      '<input type="checkbox" ' + (b.paid ? 'checked' : '') + '>' +
      '<div class="info"><b>' + escapeHtml(b.name) + '</b><span>$' + b.amount + ' · due day ' + b.dueDay + '</span></div>' +
      '<button aria-label="Remove">×</button>';
    row.querySelector('input').addEventListener('change', e => {
      const cur = loadBills();
      const idx = cur.findIndex(x => x.id === b.id);
      if(idx > -1){ cur[idx].paid = e.target.checked; saveBills(cur); }
      renderBills();
    });
    row.querySelector('button').addEventListener('click', () => {
      const cur = loadBills();
      saveBills(cur.filter(x => x.id !== b.id));
      renderBills();
    });
    list.appendChild(row);
  });
  totalEl.textContent = '$' + total.toFixed(0) + '/mo';
}
function addBill(){
  const name = document.getElementById('bill-name').value.trim();
  const amount = document.getElementById('bill-amount').value;
  const dueDay = document.getElementById('bill-day').value;
  if(!name || !amount || !dueDay) return;
  const bills = loadBills();
  bills.push({id: Date.now().toString(), name, amount, dueDay: Number(dueDay), paid:false});
  saveBills(bills);
  document.getElementById('bill-name').value = '';
  document.getElementById('bill-amount').value = '';
  document.getElementById('bill-day').value = '';
  renderBills();
}

/* ---------------- Workouts (placeholder — full engine is phase 2) ---------------- */
const DAYS = {
  A: { exercises: [
    {id:"squat", name:"Back Squat or Leg Press", target:"6–8 reps", sets:3},
    {id:"rdl", name:"Romanian Deadlift", target:"8–10 reps", sets:3},
    {id:"stepup", name:"DB Step-Up", target:"10–12/leg", sets:3},
    {id:"legext", name:"Leg Extension", target:"12–15 reps", sets:2},
    {id:"hipabd", name:"Cable Hip Abduction", target:"12–15 reps", sets:2},
    {id:"row1", name:"Seated Row", target:"10–12 reps", sets:3},
    {id:"calf", name:"Standing Calf Raise", target:"12–15 reps", sets:3},
    {id:"core1", name:"Hanging Knee Raise / Cable Crunch", target:"10–15 reps", sets:2},
  ]},
  B: { exercises: [
    {id:"hipthrust", name:"Hip Thrust", target:"8–10 reps", sets:3},
    {id:"deadlift", name:"Trap Bar Deadlift", target:"5–6 reps", sets:3},
    {id:"slleg", name:"Single-Leg Leg Press", target:"8–10/leg", sets:3},
    {id:"legcurl", name:"Seated Leg Curl", target:"10–12 reps", sets:2},
    {id:"pulldown", name:"Lat Pulldown or Pull-Up", target:"8–10 reps", sets:3},
    {id:"hipabd2", name:"Hip Abduction", target:"12–15 reps", sets:2},
    {id:"plank", name:"Weighted Plank", target:"30–45 sec", sets:2},
  ]},
  C: { exercises: [
    {id:"incline", name:"Incline DB or Barbell Press", target:"6–8 reps", sets:3},
    {id:"row2", name:"Chest-Supported Row", target:"8–10 reps", sets:3},
    {id:"ohp", name:"Standing DB Shoulder Press", target:"8–10 reps", sets:3},
    {id:"lateral", name:"DB Lateral Raise", target:"12–15 reps", sets:3},
    {id:"arms", name:"Bicep Curl + Triceps Pushdown", target:"10–12 each", sets:2},
    {id:"slrdl", name:"Single-Leg RDL", target:"10–12/leg", sets:2},
    {id:"facepull", name:"Face Pull", target:"12–15 reps", sets:2},
    {id:"finisher", name:"Conditioning Finisher (optional)", target:"8–10 min intervals", sets:1},
  ]}
};
let currentWkDay = "A";
let wkDayLogs = {};
function loadWkDayLog(dayKey){
  if(wkDayLogs[dayKey]) return wkDayLogs[dayKey];
  const raw = storageGet('day-log-' + dayKey);
  try{ wkDayLogs[dayKey] = raw ? JSON.parse(raw) : {}; }catch(e){ wkDayLogs[dayKey] = {}; }
  return wkDayLogs[dayKey];
}
function fmtDate(d){ return new Date(d).toLocaleDateString(undefined,{month:'short', day:'numeric'}); }
function renderWkDay(dayKey){
  currentWkDay = dayKey;
  const day = DAYS[dayKey];
  const log = loadWkDayLog(dayKey);
  const list = document.getElementById('wk-exercise-list');
  if(!list) return;
  list.innerHTML = '';
  day.exercises.forEach(ex => {
    const history = log[ex.id] || [];
    const lastEntry = history.length ? history[history.length-1] : null;
    const div = document.createElement('div');
    div.className = 'exercise';
    div.dataset.exId = ex.id;
    let lastText = 'No sessions logged yet';
    if(lastEntry){
      const setsStr = lastEntry.sets.map(s => (s.weight||'-') + '×' + (s.reps||'-')).join('  ');
      lastText = 'Last (' + fmtDate(lastEntry.date) + '): ' + setsStr;
    }
    let setsHtml = '';
    for(let i=0;i<ex.sets;i++){
      const prevSet = lastEntry && lastEntry.sets[i] ? lastEntry.sets[i] : {weight:'',reps:''};
      setsHtml += '<div class="set-input"><span>Set ' + (i+1) + ' lb</span>' +
        '<input type="number" inputmode="decimal" class="w-input" data-set="' + i + '" placeholder="' + (prevSet.weight || '') + '">' +
        '<span>Reps</span>' +
        '<input type="number" inputmode="numeric" class="r-input" data-set="' + i + '" placeholder="' + (prevSet.reps || '') + '"></div>';
    }
    div.innerHTML = '<div class="exercise-head"><h4>' + ex.name + '</h4><span class="target">' + ex.target + ' · ' + ex.sets + ' sets</span></div>' +
      '<div class="last-session">' + lastText + '</div><div class="sets-row">' + setsHtml + '</div>';
    list.appendChild(div);
  });
}
function saveWkSession(){
  const log = loadWkDayLog(currentWkDay);
  const today = new Date().toISOString();
  document.querySelectorAll('#wk-exercise-list .exercise').forEach(div => {
    const exId = div.dataset.exId;
    const sets = [];
    const wInputs = div.querySelectorAll('.w-input');
    const rInputs = div.querySelectorAll('.r-input');
    wInputs.forEach((wInput, idx) => {
      const rInput = rInputs[idx];
      const weight = wInput.value.trim();
      const reps = rInput.value.trim();
      if(weight || reps) sets.push({weight, reps});
    });
    if(sets.length){
      if(!log[exId]) log[exId] = [];
      log[exId].push({date: today, sets});
      if(log[exId].length > 8) log[exId] = log[exId].slice(-8);
    }
  });
  wkDayLogs[currentWkDay] = log;
  storageSet('day-log-' + currentWkDay, JSON.stringify(log));
  const msg = document.getElementById('wk-save-msg');
  if(msg){ msg.classList.add('show'); setTimeout(()=>msg.classList.remove('show'), 1800); }
  renderWkDay(currentWkDay);
}

/* ---------------- Tabs ---------------- */
function switchTab(tabName){
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + tabName));
  if(tabName === 'home' && window.refreshTodaySummary) window.refreshTodaySummary();
}

/* ---------------- Init (called by auth.js once a session exists) ---------------- */
let appInitialized = false;
function initApp(user){
  document.getElementById('date-line').textContent = new Date().toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'});
  const emailEl = document.getElementById('signed-in-email');
  if(emailEl && user) emailEl.textContent = user.email;

  if(appInitialized) return; // avoid double-binding listeners on repeat sign-ins
  appInitialized = true;

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  document.querySelectorAll('.nav-card').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.goto));
  });

  document.getElementById('dash-task-add-btn').addEventListener('click', addTask);
  document.getElementById('dash-task-input').addEventListener('keydown', e => { if(e.key === 'Enter') addTask(); });

  document.getElementById('inbox-add-btn').addEventListener('click', addInboxItem);
  document.getElementById('inbox-input').addEventListener('keydown', e => { if(e.key === 'Enter') addInboxItem(); });

  document.getElementById('routine-morning-add').addEventListener('click', () => {
    const input = document.getElementById('routine-morning-input');
    if(input.value.trim()){ routineMorning.addItem(input.value.trim()); input.value=''; renderAllMounts(); }
  });
  document.getElementById('routine-evening-add').addEventListener('click', () => {
    const input = document.getElementById('routine-evening-input');
    if(input.value.trim()){ routineEvening.addItem(input.value.trim()); input.value=''; renderAllMounts(); }
  });
  document.getElementById('reset-routine-btn').addEventListener('click', () => {
    storageSet('routine-morning-state', '{}');
    storageSet('routine-evening-state', '{}');
    renderAllMounts();
  });

  document.getElementById('chores-daily-add').addEventListener('click', () => {
    const input = document.getElementById('chores-daily-input');
    if(input.value.trim()){ choresDaily.addItem(input.value.trim()); input.value=''; renderAllMounts(); }
  });
  document.getElementById('chores-weekly-add').addEventListener('click', () => {
    const input = document.getElementById('chores-weekly-input');
    if(input.value.trim()){ choresWeekly.addItem(input.value.trim()); input.value=''; renderAllMounts(); }
  });
  document.getElementById('chores-monthly-add').addEventListener('click', () => {
    const input = document.getElementById('chores-monthly-input');
    if(input.value.trim()){ choresMonthly.addItem(input.value.trim()); input.value=''; renderAllMounts(); }
  });

  document.getElementById('bill-add-btn').addEventListener('click', addBill);
  document.getElementById('appt-add-btn').addEventListener('click', addAppt);

  document.querySelectorAll('.wk-day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.wk-day-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      renderWkDay(btn.dataset.day);
    });
  });
  document.getElementById('wk-save-btn').addEventListener('click', saveWkSession);

  renderPriorities();
  renderApptsToday();
  renderApptsFull();
  renderAllMounts();
  renderBills();
  renderWkDay('A');

  initHabitsModule();
  initNutritionModule();
  initTasksModule();
  renderTodaySummary();
}

window.initApp = initApp;
