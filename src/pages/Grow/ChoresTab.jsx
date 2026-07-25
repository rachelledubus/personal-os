import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Checkbox from '../../components/ui/Checkbox.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { listChores, listCurrentCompletions, toggleChore, addChore, seedStarterChoresIfEmpty, getLastCompletedDates } from '../../services/chores.js';

export default function ChoresTab() {
  const [items, setItems] = useState([]);
  const [doneIds, setDoneIds] = useState(new Set());
  const [lastCompleted, setLastCompleted] = useState({});
  const [newChore, setNewChore] = useState({ 'chores-daily': '', 'chores-weekly': '', 'chores-monthly': '' });

  async function refresh() {
    setItems(await listChores());
    setDoneIds(await listCurrentCompletions());
    setLastCompleted(await getLastCompletedDates());
  }
  useEffect(() => { seedStarterChoresIfEmpty().then(refresh); }, []);

  async function handleToggle(item, checked) {
    setDoneIds(prev => {
      const next = new Set(prev);
      checked ? next.add(item.id) : next.delete(item.id);
      return next;
    });
    await toggleChore(item, checked);
  }

  async function handleAdd(listKey) {
    if (!newChore[listKey].trim()) return;
    await addChore(listKey, newChore[listKey].trim());
    setNewChore({ ...newChore, [listKey]: '' });
    refresh();
  }

  const LABELS = { 'chores-daily': 'Daily (resets tomorrow)', 'chores-weekly': 'Weekly (resets Monday)', 'chores-monthly': 'Monthly (resets 1st)' };

  // Most-overdue-first for weekly/monthly — a chore with no completion
  // on record sorts first (never done beats "done a while ago").
  function sortedItemsFor(key) {
    const list = items.filter(i => i.list_key === key);
    if (key === 'chores-daily') return list;
    return [...list].sort((a, b) => (lastCompleted[a.id] || '').localeCompare(lastCompleted[b.id] || ''));
  }

  return (
    <div className="stack">
      {Object.keys(LABELS).map(key => (
        <Card key={key}>
          <div className="section-label">{LABELS[key]}</div>
          <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
            {sortedItemsFor(key).length === 0
              ? <EmptyState icon="leaf" title="Nothing here yet" />
              : sortedItemsFor(key).map(i => (
                <Checkbox key={i.id} checked={doneIds.has(i.id)} onChange={v => handleToggle(i, v)} label={i.name} />
              ))}
          </div>
          <div className="row" style={{ marginTop: 'var(--space-3)' }}>
            <input placeholder="Add a chore..." value={newChore[key]} onChange={e => setNewChore({ ...newChore, [key]: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleAdd(key)} />
            <Button size="sm" variant="ghost" onClick={() => handleAdd(key)}>+ Add</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
