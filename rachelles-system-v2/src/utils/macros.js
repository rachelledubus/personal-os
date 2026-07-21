// Pure functions — no Supabase calls here, just the math the Meal Planner
// needs to compute live totals and "remaining" macros as meals are built.

export function sumMacros(entries) {
  return entries.reduce(
    (acc, e) => ({
      calories: acc.calories + (Number(e.calories) || 0) * (Number(e.servings) || 1),
      protein: acc.protein + (Number(e.protein) || 0) * (Number(e.servings) || 1),
      carbs: acc.carbs + (Number(e.carbs) || 0) * (Number(e.servings) || 1),
      fat: acc.fat + (Number(e.fat) || 0) * (Number(e.servings) || 1),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export function remainingMacros(goals, consumed) {
  return {
    calories: Math.max(0, (goals.calorie_goal || 0) - consumed.calories),
    protein: Math.max(0, (goals.protein_goal || 0) - consumed.protein),
    carbs: Math.max(0, (goals.carb_goal || 0) - consumed.carbs),
    fat: Math.max(0, (goals.fat_goal || 0) - consumed.fat),
  };
}

// Given the remaining macros and a food database, suggest foods whose
// per-serving macros fit within what's left — simple, transparent scoring,
// not a black box: prioritizes protein-per-calorie efficiency when protein
// is the tightest remaining constraint, otherwise just filters by fit.
export function suggestFoods(foods, remaining, count = 5) {
  const proteinIsTight = remaining.protein > 0 && remaining.calories > 0
    && (remaining.protein / (remaining.calories || 1)) > 0.08;

  const fitting = foods.filter(f =>
    (Number(f.calories) || 0) <= remaining.calories + 50 // small buffer
  );

  const scored = fitting.map(f => {
    const cals = Number(f.calories) || 1;
    const protein = Number(f.protein) || 0;
    const proteinDensity = protein / cals;
    return { ...f, _score: proteinIsTight ? proteinDensity : -Math.abs(cals - remaining.calories) };
  });

  scored.sort((a, b) => b._score - a._score);
  return scored.slice(0, count);
}

export function pctOfGoal(value, goal) {
  if (!goal) return 0;
  return Math.max(0, Math.min(100, (value / goal) * 100));
}
