/* ---------------------------------------------------------------
   Habits: migrated from localStorage to Supabase.
   Tables: habits (definitions), habit_logs (daily completion).
--------------------------------------------------------------- */
async function loadHabitDefs(){
  const user = getCurrentUser();
  const { data, error } = await supabaseClient
    .from('habits').select('*').eq('user_id', user.id).eq('archived', false).order('sort_order');
  if(error){ console.error(error); return []; }
  if(data.length === 0){
    const defaults = ["Water","Meds/vitamins","Movement/stretch","Screen wind-down"];
    for(let i=0;i<defaults.length;i++){
      await supabaseClient.from('habits').insert({ user_id: user.id, name: defaults[i], sort_order: i });
    }
    return loadHabitDefs();
  }
  return data;
}
async function loadHabitLogs(date){
  const user = getCurrentUser();
  const { data, error } = await supabaseClient
    .from('habit_logs').select('*').eq('user_id', user.id).eq('log_date', date);
  if(error){ console.error(error); return []; }
  return data;
}
async function setHabitLog(habitId, date, completed){
  const user = getCurrentUser();
  if(completed){
    const { error } = await supabaseClient
      .from('habit_logs')
      .upsert({ user_id: user.id, habit_id: habitId, log_date: date, completed: true }, { onConflict: 'habit_id,log_date' });
    if(error) console.error(error);
  } else {
    const { error } = await supabaseClient
      .from('habit_logs').delete().eq('habit_id', habitId).eq('log_date', date);
    if(error) console.error(error);
  }
}
async function addHabitDef(name){
  const user = getCurrentUser();
  const defs = await loadHabitDefs();
  const { error } = await supabaseClient.from('habits').insert({ user_id: user.id, name, sort_order: defs.length });
  if(error) console.error(error);
}
async function removeHabitDef(id){
  const { error } = await supabaseClient.from('habits').update({ archived: true }).eq('id', id);
  if(error) console.error(error);
}

async function renderHabits(){
  const defs = await loadHabitDefs();
  const logs = await loadHabitLogs(todayStr());
  const doneIds = new Set(logs.filter(l => l.completed).map(l => l.habit_id));

  [{id:'home-habits-list', showRemove:false}, {id:'habits-full-list', showRemove:true}].forEach(cfg => {
    const container = document.getElementById(cfg.id);
    if(!container) return;
    container.innerHTML = defs.length === 0 ? '<div class="empty-note">No habits yet.</div>' : '';
    defs.forEach(h => {
      const isDone = doneIds.has(h.id);
      const row = document.createElement('div');
      row.className = 'task-row' + (isDone ? ' done' : '');
      const cbId = cfg.id + '-cb-' + h.id;
      row.innerHTML =
        '<input type="checkbox" id="' + cbId + '" ' + (isDone ? 'checked' : '') + '>' +
        '<label for="' + cbId + '">' + escapeHtml(h.name) + '</label>' +
        (cfg.showRemove ? '<button class="row-remove" aria-label="Remove">×</button>' : '');
      row.querySelector('input').addEventListener('change', async e => {
        await setHabitLog(h.id, todayStr(), e.target.checked);
        renderHabits();
        if(window.refreshTodaySummary) window.refreshTodaySummary();
      });
      if(cfg.showRemove){
        row.querySelector('.row-remove').addEventListener('click', async () => {
          await removeHabitDef(h.id);
          renderHabits();
          if(window.refreshTodaySummary) window.refreshTodaySummary();
        });
      }
      container.appendChild(row);
    });
  });

  return { total: defs.length, done: doneIds.size };
}

async function initHabitsModule(){
  document.getElementById('habits-add-btn').addEventListener('click', async () => {
    const input = document.getElementById('habits-input');
    if(input.value.trim()){
      await addHabitDef(input.value.trim());
      input.value = '';
      renderHabits();
      if(window.refreshTodaySummary) window.refreshTodaySummary();
    }
  });
  await renderHabits();
}
