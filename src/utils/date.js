export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function mondayOfWeek(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
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
  return d.toISOString().slice(0, 7);
}
