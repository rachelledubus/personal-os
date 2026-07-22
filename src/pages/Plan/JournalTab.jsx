import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import MonthGrid from '../../components/ui/MonthGrid.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import {
  getHabitGridData, getMoodGridData, getWorkoutGridData, getWeeklyResetGridData,
  getBusinessSummary, getFocusTimeSummary, getChoreCompletionRate,
} from '../../services/journalTrackers.js';
import { getJournalObservations } from '../../services/journalObservations.js';

const MOOD_COLOR = { Low: 'rgba(143, 165, 138, 0.25)', Medium: 'rgba(143, 165, 138, 0.6)', High: 'var(--sage)' };
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function StatCard({ label, current, previous, unit = '' }) {
  const diff = current - previous;
  const trendLabel = previous === 0 ? null : (diff === 0 ? 'same as last month' : `${diff > 0 ? '+' : ''}${diff}${unit} vs last month`);
  return (
    <div style={{ padding: 'var(--space-3)', background: 'var(--cream)', borderRadius: 'var(--radius-md)', minWidth: 130 }}>
      <div className="muted" style={{ fontSize: 11 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--navy)' }}>{current}{unit}</div>
      {trendLabel && <div className="muted" style={{ fontSize: 10 }}>{trendLabel}</div>}
    </div>
  );
}

export default function JournalTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-indexed
  const [loading, setLoading] = useState(true);
  const [observations, setObservations] = useState([]);
  const [habitGrids, setHabitGrids] = useState([]);
  const [moodGrid, setMoodGrid] = useState({});
  const [workoutGrid, setWorkoutGrid] = useState({});
  const [resetGrid, setResetGrid] = useState({});
  const [business, setBusiness] = useState(null);
  const [focus, setFocus] = useState(null);
  const [choreRate, setChoreRate] = useState(null);

  useEffect(() => { load(); }, [year, month]);

  async function load() {
    setLoading(true);
    const [obs, habits, mood, workouts, resets, biz, focusData, chores] = await Promise.all([
      getJournalObservations(year, month),
      getHabitGridData(year, month),
      getMoodGridData(year, month),
      getWorkoutGridData(year, month),
      getWeeklyResetGridData(year, month),
      getBusinessSummary(year, month),
      getFocusTimeSummary(year, month),
      getChoreCompletionRate(year, month),
    ]);
    setObservations(obs);
    setHabitGrids(habits);
    setMoodGrid(mood);
    setWorkoutGrid(workouts);
    setResetGrid(resets);
    setBusiness(biz);
    setFocus(focusData);
    setChoreRate(chores);
    setLoading(false);
  }

  function changeMonth(delta) {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth < 1) { newMonth = 12; newYear -= 1; }
    if (newMonth > 12) { newMonth = 1; newYear += 1; }
    setMonth(newMonth);
    setYear(newYear);
  }

  const hasAnyData = habitGrids.length > 0 || Object.values(moodGrid).some(Boolean) || Object.values(workoutGrid).some(Boolean);

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <Card>
        <div className="row-between">
          <Button size="sm" variant="text" onClick={() => changeMonth(-1)}>← Prev</Button>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--navy)' }}>
            {MONTH_NAMES[month - 1]} {year}
          </div>
          <Button size="sm" variant="text" onClick={() => changeMonth(1)}>Next →</Button>
        </div>
      </Card>

      {loading ? null : (
        <>
          {observations.length > 0 && (
            <Card>
              <div className="section-label">☁️ Sora's observations</div>
              <div className="stack" style={{ marginTop: 'var(--space-2)', gap: 6 }}>
                {observations.map((o, i) => (
                  <div key={i} style={{ fontSize: 13, color: 'var(--navy)' }}>{o}</div>
                ))}
              </div>
            </Card>
          )}

          {!hasAnyData ? (
            <Card>
              <EmptyState icon="sparkles" title="Nothing tracked yet this month" subtitle="These fill in automatically as you use Habits, Energy check-ins, and Workouts — nothing to set up here." />
            </Card>
          ) : (
            <>
              <Card>
                <div className="section-label" style={{ marginBottom: 'var(--space-3)' }}>Trackers</div>
                <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--space-5)' }}>
                  {habitGrids.map(h => (
                    <MonthGrid key={h.id} year={year} month={month} days={h.days} label={h.name} />
                  ))}
                  <MonthGrid year={year} month={month} days={moodGrid} label="Energy" colorFor={v => v ? MOOD_COLOR[v] : null} />
                  <MonthGrid year={year} month={month} days={workoutGrid} label="Workouts" />
                  <MonthGrid year={year} month={month} days={resetGrid} label="Weekly resets" />
                </div>
              </Card>

              <Card>
                <div className="section-label" style={{ marginBottom: 'var(--space-3)' }}>This month</div>
                <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                  <StatCard label="Interactions" current={business.interactions.current} previous={business.interactions.previous} />
                  <StatCard label="Content published" current={business.contentPublished.current} previous={business.contentPublished.previous} />
                  <StatCard label="Transactions closed" current={business.transactionsClosed.current} previous={business.transactionsClosed.previous} />
                  <StatCard label="Focus time" current={Math.round(focus.current / 60 * 10) / 10} previous={Math.round(focus.previous / 60 * 10) / 10} unit="hr" />
                  {choreRate !== null && <StatCard label="Chore completion (approx.)" current={choreRate} previous={0} unit="%" />}
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
