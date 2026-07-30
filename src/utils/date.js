// Local-calendar-date formatter (YYYY-MM-DD) — deliberately NOT
// toISOString(), which reports the date in UTC. For anyone west of
// UTC (e.g. Eastern time), toISOString() rolls over to "tomorrow"
// several hours before midnight actually happens locally, which was
// the root cause of the Today schedule mixing two different days'
// blocks: the day-of-week lookup (local) and the stored block_date
// (was UTC) disagreed for several hours every evening.
function toLocalDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayStr() {
  return toLocalDateStr(new Date());
}

export function mondayOfWeek(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  return toLocalDateStr(date);
}

export function isMonday(d = new Date()) {
  return d.getDay() === 1;
}

export function isFriday(d = new Date()) {
  return d.getDay() === 5;
}

export function isFirstWeekOfMonth(d = new Date()) {
  return d.getDate() <= 7;
}

export function currentMonthStr(d = new Date()) {
  return toLocalDateStr(d).slice(0, 7);
}