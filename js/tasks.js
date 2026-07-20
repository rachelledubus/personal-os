/* ---------------------------------------------------------------
   Tasks: general task manager. Table: tasks.
--------------------------------------------------------------- */
const TASK_CATEGORIES = ['Personal','Real Estate','Content','Health','Home'];

async function loadTaskRows(){
  const user = getCurrentUser();
  const { data, error } = await supabaseClient
    .from('tasks').select('*').eq('user_id', user.id)
    .order('completed', {ascending:true})
    .order('due_date', {ascending:true, nullsFirst:false});
  if(error){ console.error(error); return []; }
  return data;
}
async function addTaskRow(task){
  const user = getCurrentUser();
  const { error } = await supabaseClient.from('tasks').insert({ ...task, user_id: user.id });
  if(error) console.error(error);
}
async function toggleTaskRow(id, val){
  const { error } = await supabaseClient.from('tasks').update({ completed: val }).eq('id', id);
  if(error) console.error(error);
}
async function deleteTaskRow(id){
  const { error } = await supabaseClient.from('tasks').delete().eq('id', id);
  if(error) console.error(error);
}

function priorityLabel(p){
  return p === 'high' ? 'High' : p === 'low' ? 'Low' : 'Medium';
}

async function renderTasks(){
  const list = document.getElementById('tasks-list');
  if(!list) return;
  const tasks = await loadTaskRows();
  list.innerHTML = tasks.length === 0 ? '<div class="empty-note">No tasks yet — add one below.</div>' : '';
  tasks.forEach(t => {
    const row = document.createElement('div');
    row.className = 'task-row' + (t.completed ? ' done' : '');
    const cbId = 'task-cb-' + t.id;
    row.innerHTML =
      '<input type="checkbox" id="' + cbId + '" ' + (t.completed ? 'checked' : '') + '>' +
      '<label for="' + cbId + '">' + escapeHtml(t.title) +
        '<span class="task-meta">' + escapeHtml(t.category) +
        (t.due_date ? ' · due ' + t.due_date : '') +
        ' · ' + priorityLabel(t.priority) + ' priority</span>' +
      '</label>' +
      '<button class="row-remove" aria-label="Remove">×</button>';
    row.querySelector('input').addEventListener('change', async e => {
      await toggleTaskRow(t.id, e.target.checked);
      renderTasks();
      if(window.refreshTodaySummary) window.refreshTodaySummary();
    });
    row.querySelector('.row-remove').addEventListener('click', async () => {
      await deleteTaskRow(t.id);
      renderTasks();
      if(window.refreshTodaySummary) window.refreshTodaySummary();
    });
    list.appendChild(row);
  });
}

async function initTasksModule(){
  const catSelect = document.getElementById('task-category');
  catSelect.innerHTML = TASK_CATEGORIES.map(c => '<option value="' + c + '">' + c + '</option>').join('');

  document.getElementById('task-add-btn').addEventListener('click', async () => {
    const title = document.getElementById('task-title').value.trim();
    const category = catSelect.value;
    const due_date = document.getElementById('task-due').value || null;
    const priority = document.getElementById('task-priority').value;
    if(!title) return;
    await addTaskRow({ title, category, due_date, priority, completed:false });
    document.getElementById('task-title').value = '';
    document.getElementById('task-due').value = '';
    renderTasks();
    if(window.refreshTodaySummary) window.refreshTodaySummary();
  });

  await renderTasks();
}
