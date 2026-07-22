# Your Personal OS — A Real Guide, Not a Manual

This is meant to be read once, then forgotten — the app should tell you what to do, not the other way around. But since you asked, here's the map.

---

## The six places you'll actually go

**🏡 Today** — Open this first, every day. It already knows what day it is and builds your schedule from your Life Rhythm (workouts, routines, work blocks) and layers your tasks in automatically. You shouldn't need to build your day by hand.

- **Right now** at the top tells you the one thing to focus on next.
- **Might be worth a look** (when it shows up) quietly flags anything that's gone quiet — a goal with no movement in 3 weeks, a core relationship you haven't touched in a while, a habit with no check-ins this week, maintenance that's overdue. It only shows the top 5, on purpose — it's a glance, not another list to manage.
- **Today's schedule** is your actual day, block by block. Routines like Morning Routine or Shutdown can have step-by-step checklists now — click "+ add steps" on one if it doesn't have any yet.
- **Other things today** is everything that doesn't live in a time block — habit reminders, follow-ups, content nudges.

**📥 Inbox** — The dump-it-here button. Anything you capture with the floating **+** button (bottom right, anywhere in the app) lands here unsorted. Open Inbox when you have a spare minute and sort each item into where it actually belongs — Task, Note, Content idea, Buyer question, Relationship/Opportunity, or Reminder. There's an AI "✨ Suggest" button on each item if you're not sure where something goes.

- The **Relationship/Opportunity** option can attach a note to someone you already know instead of always creating a new contact — search their name, pick them, and your note gets added to their file with a follow-up date set automatically.

**📅 Plan** — Time Blocks (your day, editable), Goals & Projects (with real progress bars now), and the Meal Planner (build-your-own-meal with a real starter food list already loaded).

**🌱 Grow** — Habits, Workouts (with real exercise history and PRs), Chores (seeded for your actual home, sorted so the most-overdue thing shows first), Maintenance, and Finance.

**💼 Business** — This is the real operating software, not a dashboard. Dashboard (today's 4 boxes + this week's build task), Pipeline (your CRM), Relationships (Sphere/Community/Professional, one list, filtered by tier), Content (the real idea → draft → publish → repurpose pipeline, with AI drafting help), Library (your CTAs/scripts/prompts, searchable, copy-button-ready), Clients (transaction log), and Roadmap (your actual 13-week build plan).

**📚 Library** — Your BOS manual (searchable, click to rename), Notes (click one to edit it), and your **Backlog** — a running list of ideas for improving the app itself. Add to it anytime, and there's a "copy all as a prompt" button for whenever you want to hand a batch of ideas to a future dev session.

**🛠️ Control Center** — The small gear icon near Sign Out, not one of the six main zones on purpose. This is where you change things yourself instead of asking for a code update: add/rename categories, toggle features on or off, swap a decorative image, set custom AI instructions, and see a running changelog of what's changed.

---

## Where the AI actually helps

You'll see a little **✨** in a few places — drafting a follow-up message on an overdue contact, drafting repurposed content the moment something publishes, suggesting where a captured item should go. All of it is optional and skippable — if it's not configured, it just says so instead of breaking anything.

---

## Banners & the running chibi 🐾

The look of the app comes from two things now, not the small corner accents this guide used to describe (those got replaced — a full-width banner plus clean cards reads better than a banner *and* six competing corner doodles).

**Banners** — a full-width illustrated scene at the top of Today, Business, Grow, Plan, Library, and Inbox. Each has its own themed default (sunrise cottage on Today, a path & signpost on Business, garden rows on Grow, a winding hill path on Plan, a reading nook on Library, a basket catching falling notes on Inbox). Want to swap any of them for real art instead of the default illustration? Control Center → Appearance → Banners lets you paste an image link (landscape, roughly 1600×440px) to override any of them.

**The running chibi** — a small animal that scurries to a new corner when the window gets narrow (top-right on desktop, smaller top-right on tablet, bottom-left near mobile width). Pick which one follows you around in Control Center → Appearance: bunny, cat, fox, or duck, with a live preview of each before you choose.

A couple of things worth knowing:
- The **floating + button** in the corner is *not* a decoration — that's the capture button, plain and functional on purpose.
- The running chibi (and the soft background wash behind everything) respects the `show_decorations` toggle in Control Center → Feature Toggles, if you ever want a plainer, quieter interface. Banners aren't gated by that toggle — they're part of each page's layout, not an optional extra.

---

## The honest parts

A few things are intentionally not built yet, and that's not an oversight:
- **True image upload** isn't built — Appearance settings use a pasted image link instead, which does the same job without needing extra setup.
- **Real push notifications** aren't built — that needs infrastructure beyond what this app currently has.
- **Data import/restore** isn't built — export (a safe, one-click backup) is.

If any of these become worth doing, they're each their own focused piece of work, not something to rush in alongside everything else.
