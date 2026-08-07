import React, { useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { listKitchenInventory, setInventoryItem, deleteInventoryItem, syncInventoryFromIngredients } from '../../services/groceryAggregation.js';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery.js';

export default
function KitchenInventoryTab() {
  // Most likely cause of a load error: v2_grocery_aggregation_and_inventory_layer.sql hasn't been run yet.
  const { data: items, loading, error: loadError, refresh } = useSupabaseQuery(() => listKitchenInventory(), []);
  const [newItem, setNewItem] = useState({ name: '', quantity: '', unit: '' });
  const [addError, setAddError] = useState(null);
  const [countDrafts, setCountDrafts] = useState({}); // id -> draft quantity string, for the "needs a count" quick-fill
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);

  async function handleAdd() {
    if (!newItem.name.trim()) return;
    try {
      await setInventoryItem(newItem.name, newItem.quantity, newItem.unit);
    } catch (err) {
      setAddError(err.message || String(err));
      return;
    }
    setAddError(null);
    setNewItem({ name: '', quantity: '', unit: '' });
    refresh();
  }

  async function handleDelete(id) {
    await deleteInventoryItem(id);
    refresh();
  }

  async function handleSync() {
    setSyncing(true);
    setSyncStatus(null);
    try {
      const result = await syncInventoryFromIngredients();
      setSyncStatus(result.added === 0 ? "You're fully caught up — every ingredient from your recipes and foods is already here." : `Added ${result.added} ingredient${result.added === 1 ? '' : 's'} — count what you have and enter it below.`);
      refresh();
    } catch (err) {
      setSyncStatus(`Couldn't sync: ${err.message || err}`);
    }
    setSyncing(false);
  }

  async function handleSaveCount(item) {
    const draft = countDrafts[item.id];
    if (draft === undefined || draft === '') return;
    try {
      await setInventoryItem(item.ingredient_name, draft, item.unit);
    } catch (err) {
      setAddError(err.message || String(err));
      return;
    }
    setCountDrafts(d => { const next = { ...d }; delete next[item.id]; return next; });
    refresh();
  }

  if (loading) return null;
  if (loadError) {
    return (
      <Card>
        <div className="section-label">Kitchen Inventory</div>
        <div className="muted" style={{ fontSize: 'var(--text-caption)', marginTop: 'var(--space-2)', color: 'var(--danger)' }}>
          Couldn't load: {loadError}
          <br />If this mentions a missing table, the v2_grocery_aggregation_and_inventory_layer.sql migration likely hasn't been run yet.
        </div>
      </Card>
    );
  }

  const needsCount = items.filter(i => i.quantity === null || i.quantity === undefined);
  const counted = items.filter(i => i.quantity !== null && i.quantity !== undefined);

  return (
    <Card>
      <div className="row-between">
        <div className="section-label">Kitchen Inventory</div>
        <Button size="sm" variant="ghost" onClick={handleSync} disabled={syncing}>
          {syncing ? 'Syncing…' : 'Populate from my recipes & foods'}
        </Button>
      </div>
      <p className="muted" style={{ fontSize: 'var(--text-caption)', marginTop: 4 }}>
        "Generate list (with quantities)" on the Grocery List tab subtracts these amounts before adding to the shopping list —
        so a full bag of flour means it won't ask you to buy more until it's gone.
      </p>
      {syncStatus && <div className="muted" style={{ fontSize: 'var(--text-micro)', marginTop: 4 }}>{syncStatus}</div>}

      {items.length === 0 ? (
        <EmptyState icon="leaf" title="Nothing here yet" subtitle="Click 'Populate from my recipes & foods' above, or add something manually below." />
      ) : (
        <div className="stack" style={{ marginTop: 'var(--space-3)', gap: 'var(--space-4)' }}>
          {needsCount.length > 0 && (
            <div>
              <div className="muted" style={{ fontSize: 'var(--text-micro)', textTransform: 'uppercase' }}>Needs a count ({needsCount.length})</div>
              <div className="stack" style={{ marginTop: 4, gap: 4 }}>
                {needsCount.map(item => (
                  <div key={item.id} className="row-between" style={{ fontSize: 'var(--text-small)' }}>
                    <span>{item.ingredient_name}</span>
                    <div className="row" style={{ gap: 4 }}>
                      <input
                        type="number" placeholder="how much?"
                        value={countDrafts[item.id] ?? ''}
                        onChange={e => setCountDrafts(d => ({ ...d, [item.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveCount(item); }}
                        style={{ width: 90 }}
                      />
                      <span className="muted" style={{ alignSelf: 'center' }}>{item.unit}</span>
                      <Button size="sm" variant="text" onClick={() => handleSaveCount(item)}>Save</Button>
                      <button className="row-remove-btn" aria-label="Remove" onClick={() => handleDelete(item.id)}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {counted.length > 0 && (
            <div>
              {needsCount.length > 0 && <div className="muted" style={{ fontSize: 'var(--text-micro)', textTransform: 'uppercase' }}>Counted</div>}
              <div className="stack" style={{ marginTop: 4, gap: 4 }}>
                {counted.map(item => (
                  <div key={item.id} className="row-between" style={{ fontSize: 'var(--text-small)' }}>
                    <span>{item.ingredient_name} <span className="faint">{item.quantity} {item.unit}</span></span>
                    <button className="row-remove-btn" aria-label="Remove" onClick={() => handleDelete(item.id)}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="row" style={{ marginTop: 'var(--space-3)', flexWrap: 'wrap', gap: 4 }}>
        <input placeholder="Ingredient (e.g. Flour)" value={newItem.name} onChange={e => setNewItem(n => ({ ...n, name: e.target.value }))} style={{ flex: 2, minWidth: 120 }} />
        <input type="number" placeholder="Qty" value={newItem.quantity} onChange={e => setNewItem(n => ({ ...n, quantity: e.target.value }))} style={{ width: 60 }} />
        <input placeholder="Unit" value={newItem.unit} onChange={e => setNewItem(n => ({ ...n, unit: e.target.value }))} style={{ width: 90 }} />
        <Button size="sm" onClick={handleAdd}>+ Add / update</Button>
      </div>
      {addError && <div className="muted" style={{ fontSize: 'var(--text-micro)', marginTop: 4, color: 'var(--danger)' }}>Couldn't save: {addError}</div>}
    </Card>
  );
}
