import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { listKitchenInventory, setInventoryItem, deleteInventoryItem } from '../../services/groceryAggregation.js';

export default
function KitchenInventoryTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [newItem, setNewItem] = useState({ name: '', quantity: '', unit: '' });
  const [addError, setAddError] = useState(null);

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    setLoading(true);
    setLoadError(null);
    try {
      setItems(await listKitchenInventory());
    } catch (err) {
      // Most likely cause: v2_grocery_aggregation_and_inventory_layer.sql hasn't been run yet.
      setLoadError(err.message || String(err));
    }
    setLoading(false);
  }

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

  return (
    <Card>
      <div className="section-label">Kitchen Inventory</div>
      <p className="muted" style={{ fontSize: 'var(--text-caption)', marginTop: 4 }}>
        What you already have on hand. "Generate list (with quantities)" on the Grocery List tab subtracts these amounts
        before adding to the shopping list — so a full bag of flour means it won't ask you to buy more until it's gone.
      </p>

      {items.length === 0 ? (
        <EmptyState icon="leaf" title="Nothing recorded yet" subtitle="Add what's currently in your kitchen below." />
      ) : (
        <div className="stack" style={{ marginTop: 'var(--space-3)', gap: 4 }}>
          {items.map(item => (
            <div key={item.id} className="row-between" style={{ fontSize: 'var(--text-small)' }}>
              <span>{item.ingredient_name} <span className="faint">{item.quantity} {item.unit}</span></span>
              <button className="row-remove-btn" onClick={() => handleDelete(item.id)}>×</button>
            </div>
          ))}
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

