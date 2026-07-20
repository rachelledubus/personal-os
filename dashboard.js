/* ---------------------------------------------------------------
   Home "Today" command center. Combines:
   - fixed weekly workout schedule (Cycle Mon / Lower Tue / Pilates
     Wed / Posterior Thu / Rest Fri / Upper Sat / Rest Sun — matches
     the existing Workouts tab. A full editable schedule engine is
     Settings-page work for a later phase.)
   - today's nutrition totals vs goals (nutrition.js)
   - today's habit completion (habits.js)
   - "business" progress = Real Estate category tasks (tasks.js)
--------------------------------------------------------------- */
const WEEKDAY_WORKOUT = [
  { label: 'Rest day', sub: '' },                                    // Sun = 0
  { label: 'Cycle', sub: 'Cardio day' },                              // Mon = 1
  { label: 'Lower Body — Quad Focus', sub: 'Lifting day (Tue)' },     // Tue = 2
  { label: 'Pilates', sub: 'Mobility & core' },                       // Wed = 3
  { label: 'Posterior Chain', sub: 'Lifting day (Thu)' },             // Thu = 4
  { label: 'Rest day', sub: '' },                                     // Fri = 5
  { label: 'Upper Body', sub: 'Lifting day (Sat)' },                  // Sat = 6
];

function getTodayWorkout(){
  return WEEKDAY_WORKOUT[new Date().getDay()];
}

async function renderTodaySummary(){
  const wk = getTodayWorkout();
  const wEl = document.getElementById('today-workout-name');
  const wSubEl = document.getElementById('today-workout-sub');
  if(wEl) wEl.textContent = wk.label;
  if(wSubEl) wSubEl.textContent = wk.sub;

  try{
    const logs = await loadMealLogs(todayStr());
    const { totals, goals } = await renderNutritionTotalsQuiet(logs);
    const calsEl = document.getElementById('today-nutrition-cals');
    const protEl = document.getElementById('today-nutrition-protein');
    if(calsEl) calsEl.textContent = Math.round(totals.calories) + ' / ' + goals.calorie_goal + ' kcal';
    if(protEl) protEl.textContent = Math.round(totals.protein) + ' / ' + goals.protein_goal + 'g protein';
  }catch(e){ console.error(e); }

  try{
    const defs = await loadHabitDefs();
    const logs = await loadHabitLogs(todayStr());
    const done = logs.filter(l => l.completed).length;
    const el = document.getElementById('today-habits');
    if(el) el.textContent = done + ' / ' + defs.length + ' complete';
  }catch(e){ console.error(e); }

  try{
    const tasks = await loadTaskRows();
    const biz = tasks.filter(t => t.category === 'Real Estate');
    const done = biz.filter(t => t.completed).length;
    const el = document.getElementById('today-business');
    if(el) el.textContent = biz.length === 0 ? 'No business tasks yet' : (done + ' / ' + biz.length + ' complete');
  }catch(e){ console.error(e); }
}

/* Computes totals/goals without touching the Nutrition tab's own DOM elements,
   so the Home card can show numbers even before that tab has been opened. */
async function renderNutritionTotalsQuiet(logs){
  const totals = computeTotals(logs);
  const settings = await ensureSettings();
  const goals = settings || {calorie_goal:1835, protein_goal:150, carb_goal:185, fat_goal:55};
  return { totals, goals };
}

window.refreshTodaySummary = renderTodaySummary;
