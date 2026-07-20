/* ---------------------------------------------------------------
   Shared DB helpers used by nutrition.js, tasks.js, habits.js,
   dashboard.js. Loaded after auth.js, before the feature modules.
--------------------------------------------------------------- */
function todayStr(){ return new Date().toISOString().slice(0,10); }
function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

/* Every user gets exactly one settings row, created on first use
   with the table's built-in defaults (matches the static targets
   the Nutrition tab used to show: 1835 kcal / 150p / 185c / 55f). */
async function ensureSettings(){
  const user = getCurrentUser();
  let { data, error } = await supabaseClient
    .from('settings').select('*').eq('user_id', user.id).maybeSingle();
  if(error){ console.error(error); return null; }
  if(!data){
    const { data: inserted, error: insErr } = await supabaseClient
      .from('settings').insert({ user_id: user.id }).select().single();
    if(insErr){ console.error(insErr); return null; }
    data = inserted;
  }
  return data;
}

function progressBarHtml(id, pct){
  const clamped = Math.max(0, Math.min(100, pct));
  return '<div class="progress-track"><div class="progress-fill" id="' + id + '" style="width:' + clamped + '%"></div></div>';
}
