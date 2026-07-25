import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import { CATEGORY_LISTS, getCategoryList, setCategoryList } from '../../services/settings.js';

export default function CategoriesSection() {
  const [lists, setLists] = useState({});
  const [newItem, setNewItem] = useState({});

  async function refresh() {
    const entries = await Promise.all(
      Object.keys(CATEGORY_LISTS).map(async key => [key, await getCategoryList(key)])
    );
    setLists(Object.fromEntries(entries));
  }
  useEffect(() => { refresh(); }, []);

  async function handleAdd(listKey) {
    const value = (newItem[listKey] || '').trim();
    if (!value) return;
    const updated = [...(lists[listKey] || []), value];
    await setCategoryList(listKey, updated);
    setNewItem({ ...newItem, [listKey]: '' });
    refresh();
  }

  async function handleRemove(listKey, item) {
    const updated = (lists[listKey] || []).filter(i => i !== item);
    await setCategoryList(listKey, updated);
    refresh();
  }

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <p className="muted" style={{ fontSize: 'var(--text-caption)' }}>
        These lists back genuinely free-text fields — safe to add, rename (remove + re-add), or delete.
        A few things that look like "categories" elsewhere (capture types, relationship tiers, content status)
        are controlled vocabularies the app's logic depends on, and aren't editable here on purpose.
      </p>
      {Object.entries(CATEGORY_LISTS).map(([key, meta]) => (
        <Card key={key}>
          <div className="section-label">{meta.label}</div>
          <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 'var(--space-2)' }}>
            {(lists[key] || []).map(item => (
              <span key={item} className="capture-type-chip active" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {item}
                <button onClick={() => handleRemove(key, item)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>×</button>
              </span>
            ))}
          </div>
          <div className="row" style={{ marginTop: 'var(--space-3)' }}>
            <input placeholder="Add an option..." value={newItem[key] || ''} onChange={e => setNewItem({ ...newItem, [key]: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleAdd(key)} />
            <Button size="sm" variant="ghost" onClick={() => handleAdd(key)}>+ Add</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
