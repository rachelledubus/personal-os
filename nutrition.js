/* ---------------------------------------------------------------
   Nutrition: food database + meal log + daily totals.
   Tables: foods, meal_logs, settings.
--------------------------------------------------------------- */
const MEAL_TYPES = ['breakfast','lunch','dinner','snacks'];
const MEAL_LABELS = {breakfast:'Breakfast', lunch:'Lunch', dinner:'Dinner', snacks:'Snacks'};

async function loadFoods(){
  const user = getCurrentUser();
  const { data, error } = await supabaseClient.from('foods').select('*').eq('user_id', user.id).order('name');
  if(error){ console.error(error); return []; }
  return data;
}
async function addFoodRow(food){
  const user = getCurrentUser();
  const { error } = await supabaseClient.from('foods').insert({ ...food, user_id: user.id });
  if(error) console.error(error);
}
async function deleteFoodRow(id){
  const { error } = await supabaseClient.from('foods').delete().eq('id', id);
  if(error) console.error(error);
}

async function loadMealLogs(date){
  const user = getCurrentUser();
  const { data, error } = await supabaseClient
    .from('meal_logs')
    .select('id, meal_type, servings, food_id, foods ( name, calories, protein, carbs, fat )')
    .eq('user_id', user.id)
    .eq('log_date', date);
  if(error){ console.error(error); return []; }
  return data;
}
async function addMealLogRow(foodId, mealType, servings){
  const user = getCurrentUser();
  const { error } = await supabaseClient.from('meal_logs').insert({
    user_id: user.id, food_id: foodId, meal_type: mealType, servings, log_date: todayStr()
  });
  if(error) console.error(error);
}
async function deleteMealLogRow(id){
  const { error } = await supabaseClient.from('meal_logs').delete().eq('id', id);
  if(error) console.error(error);
}

function computeTotals(logs){
  const t = {calories:0, protein:0, carbs:0, fat:0};
  logs.forEach(l => {
    if(!l.foods) return;
    const s = Number(l.servings) || 0;
    t.calories += (Number(l.foods.calories)||0) * s;
    t.protein  += (Number(l.foods.protein)||0) * s;
    t.carbs    += (Number(l.foods.carbs)||0) * s;
    t.fat      += (Number(l.foods.fat)||0) * s;
  });
  return t;
}

async function renderFoodDb(){
  const list = document.getElementById('food-db-list');
  if(!list) return;
  const foods = await loadFoods();
  window.__foodsCache = foods;
  list.innerHTML = foods.length === 0
    ? '<div class="empty-note">No foods saved yet — add one below.</div>'
    : '';
  foods.forEach(f => {
    const row = document.createElement('div');
    row.className = 'inbox-item';
    row.innerHTML = '<span><b>' + escapeHtml(f.name) + '</b>' +
      (f.serving_size ? ' — ' + escapeHtml(f.serving_size) : '') +
      ' · ' + f.calories + ' kcal · ' + f.protein + 'p / ' + f.carbs + 'c / ' + f.fat + 'f</span>' +
      '<button aria-label="Remove">×</button>';
    row.querySelector('button').addEventListener('click', async () => {
      await deleteFoodRow(f.id);
      renderFoodDb();
      populateMealFoodSelects();
    });
    list.appendChild(row);
  });
  populateMealFoodSelects();
}

function populateMealFoodSelects(){
  const foods = window.__foodsCache || [];
  MEAL_TYPES.forEach(mt => {
    const sel = document.getElementById('meal-food-select-' + mt);
    if(!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">Choose a food...</option>' +
      foods.map(f => '<option value="' + f.id + '">' + escapeHtml(f.name) + '</option>').join('');
    if(current) sel.value = current;
  });
}

async function renderMealLog(){
  const logs = await loadMealLogs(todayStr());
  MEAL_TYPES.forEach(mt => {
    const container = document.getElementById('meal-log-' + mt);
    if(!container) return;
    const entries = logs.filter(l => l.meal_type === mt);
    container.innerHTML = entries.length === 0
      ? '<div class="empty-note">Nothing logged yet.</div>'
      : '';
    entries.forEach(l => {
      const row = document.createElement('div');
      row.className = 'inbox-item';
      const name = l.foods ? l.foods.name : '(deleted food)';
      const cals = l.foods ? Math.round((Number(l.foods.calories)||0) * l.servings) : 0;
      row.innerHTML = '<span>' + escapeHtml(name) + ' × ' + l.servings + ' · ' + cals + ' kcal</span><button aria-label="Remove">×</button>';
      row.querySelector('button').addEventListener('click', async () => {
        await deleteMealLogRow(l.id);
        renderMealLog();
        renderNutritionTotals();
        if(window.refreshTodaySummary) window.refreshTodaySummary();
      });
      container.appendChild(row);
    });
  });
  renderNutritionTotals(logs);
}

async function renderNutritionTotals(logsParam){
  const logs = logsParam || await loadMealLogs(todayStr());
  const totals = computeTotals(logs);
  const settings = await ensureSettings();
  const goals = settings || {calorie_goal:1835, protein_goal:150, carb_goal:185, fat_goal:55};

  const setStat = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  setStat('nt-calories', Math.round(totals.calories) + ' / ' + goals.calorie_goal + ' kcal');
  setStat('nt-protein', Math.round(totals.protein) + ' / ' + goals.protein_goal + 'g');
  setStat('nt-carbs', Math.round(totals.carbs) + ' / ' + goals.carb_goal + 'g');
  setStat('nt-fat', Math.round(totals.fat) + ' / ' + goals.fat_goal + 'g');

  const setBar = (id, val, goal) => {
    const el = document.getElementById(id);
    if(el) el.style.width = Math.max(0, Math.min(100, (val / goal) * 100)) + '%';
  };
  setBar('nt-bar-calories', totals.calories, goals.calorie_goal);
  setBar('nt-bar-protein', totals.protein, goals.protein_goal);
  setBar('nt-bar-carbs', totals.carbs, goals.carb_goal);
  setBar('nt-bar-fat', totals.fat, goals.fat_goal);

  return { totals, goals };
}

async function initNutritionModule(){
  document.getElementById('food-add-btn').addEventListener('click', async () => {
    const name = document.getElementById('food-name').value.trim();
    const serving_size = document.getElementById('food-serving').value.trim();
    const calories = Number(document.getElementById('food-calories').value) || 0;
    const protein = Number(document.getElementById('food-protein').value) || 0;
    const carbs = Number(document.getElementById('food-carbs').value) || 0;
    const fat = Number(document.getElementById('food-fat').value) || 0;
    if(!name){ return; }
    await addFoodRow({ name, serving_size, calories, protein, carbs, fat });
    ['food-name','food-serving','food-calories','food-protein','food-carbs','food-fat'].forEach(id => document.getElementById(id).value = '');
    renderFoodDb();
  });

  MEAL_TYPES.forEach(mt => {
    document.getElementById('meal-add-btn-' + mt).addEventListener('click', async () => {
      const sel = document.getElementById('meal-food-select-' + mt);
      const servingsInput = document.getElementById('meal-servings-' + mt);
      const foodId = sel.value;
      const servings = Number(servingsInput.value) || 1;
      if(!foodId) return;
      await addMealLogRow(foodId, mt, servings);
      servingsInput.value = '1';
      renderMealLog();
      if(window.refreshTodaySummary) window.refreshTodaySummary();
    });
  });

  await renderFoodDb();
  await renderMealLog();
}
