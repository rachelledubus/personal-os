# Phase 2 Implementation Guide — Bug Fixes, Workouts, Meal Builder, Finance

Everything below is **new since the last full zip**. Same drill as before: migrations first, then files, then verify. This phase didn't need any new environment variables — the existing `GOOGLE_AI_API_KEY` powers the new AI feature too.

---

## 0. What this phase actually is

Three things happened, in order:

1. **A real bug fix** — the Today page crash. Not cosmetic, this one broke the app.
2. **Feedback-driven rebuilds** — Workouts, Chores, Business Roadmap, Library Documents, and the Inbox all got reworked based on what you flagged as not working the way you wanted.
3. **New features** — AI exercise swap, the meal builder ("Build Your Own Meal"), weekly meal planning, and a real Finance tab.

---

## 1. Run these 3 migrations, in this order

Same process as always: Supabase → SQL Editor → New query → paste → Run.

1. [ ] `v2_polish_layer.sql` — interactive chores, roadmap links + sub-tasks, workout exercise templates
2. [ ] `v2_finance_layer.sql` — the Finance tab's data
3. [ ] `v2_meal_builder_layer.sql` — one column, tags a food with its meal-builder slot

If any of them errors with "already exists," that's fine — it means it partially ran before; the rest of the statements still apply safely.

---

## 2. The crash fix (do this one first, it matters most)

**What broke it:** adding `tasks.time_block_id` back in the Intelligence phase gave the database *two* separate connections between `tasks` and `time_blocks`. Any query that tried to pull both together couldn't tell which connection you meant, and Supabase refused to guess — that's the `PGRST201` error you saw.

**Files that fix it** — these replace files you already have, no new folders:

- [ ] `src/services/dailyExecution.js`
- [ ] `src/services/aiOperator.js`
- [ ] `src/services/timeBlocks.js`

---

## 3. Files that changed based on your feedback

| File | What changed |
|---|---|
| `src/services/missions.js` | "Other things today" items now link to their real page |
| `src/components/capture/GlobalCapture.jsx` | Capture modal auto-closes after saving |
| `src/pages/Inbox/InboxPage.jsx` + `.css` | Live-updates without refresh; shows where a resolved item went |
| `src/services/goals.js` | Roadmap items can now have sub-tasks (reuses milestones) |
| `src/pages/Business/BusinessPage.jsx` | Roadmap items link out + expand into sub-tasks |
| `src/pages/Library/LibraryPage.jsx` | Documents tab shows actual content, not just titles |
| `src/services/workoutAnalytics.js` | Exercise templates for all 3 days + AI swap function |
| `src/pages/Grow/GrowPage.jsx` | Workouts rebuilt to match your old app; Chores now interactive; Finance tab added; habit streaks |
| `src/pages/Today/TodayPage.jsx` | Small celebration when everything's checked off |
| `src/pages/Plan/MealPlannerPage.jsx` | Meal builder added; Day/Week toggle for planning |
| `netlify/functions/classify-capture.js` + `ai-replan.js` | Switched from Anthropic to Google AI (Gemini) |
| `src/components/intelligence/AskAIPanel.jsx` | Updated message to reference the right env var |

## 4. Brand new files

| File | What it's for |
|---|---|
| `src/services/chores.js` | Daily/weekly/monthly completion tracking with correct auto-reset |
| `src/services/finance.js` | Quick-add income/expense/bill, budget-by-category, savings goals |
| `src/services/mealBuilder.js` | "Build Your Own Meal" slot picker logic |
| `src/services/mealWeek.js` | Weekly meal planning + week-wide grocery list |
| `netlify/functions/swap-exercise.js` | AI exercise substitution (same-muscle-group swap) |

---

## 5. Verify — walk through what's new

- [ ] **Today page loads without a console error** — this is the big one, confirm it first.
- [ ] **Grow → Workouts** — three day tabs (Tue Upper, Thu Lower/Quad, Sat Posterior Chain), each with real exercises and per-set weight/reps boxes. Try the "🔄 Swap it" button on one exercise.
- [ ] **Grow → Chores** — check a daily item, confirm it's checked. (Can't verify the reset without waiting a day — that's expected.)
- [ ] **Grow → Finance** — add a quick expense, confirm it shows under "Spending by category" and in "Recent entries."
- [ ] **Business → Roadmap** — click an item, confirm it expands; try "+ Link this to a page."
- [ ] **Library → Documents** — click a document, confirm it expands to show content (not just a title).
- [ ] **Plan → Meal Planner** — try the "Build your own meal" section at the top; try the "Plan the week" toggle.
- [ ] **Inbox** — capture something from the floating button, confirm it shows up in Inbox without a page refresh.

---

That's the whole phase. Once the checklist above passes, you're caught up to everything built through this round.
