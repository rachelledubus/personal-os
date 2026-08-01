import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { listGroceryItems, toggleGroceryItemPurchased, deleteGroceryItem, bulkDeleteGroceryItems, clearPurchasedGroceryItems } from '../../services/groceryList.js';
import { nextMonday } from '../../services/mealWeek.js';
import {
  listShoppingUnitMappings, addShoppingUnitMapping, deleteShoppingUnitMapping, generateAggregatedGroceryList,
} from '../../services/groceryAggregation.js';

export default
function GroceryListTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [weekStart, setWeekStart] = useState(nextMonday());
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState(null);
  const [genError, setGenError] = useState(null);
  const [showMappings, setShowMappings] = useState(false);
  const [mappings, setMappings] = useState([]);
  const [newMapping, setNewMapping] = useState({ ingredient_name: '', qty_per_shopping_unit: '', shopping_unit_label: '' });
  const [mappingError, setMappingError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => { refresh(); }, []);
  useEffect(() => { if (showMappings) loadMappings(); }, [showMappings]);

  async function refresh() {
    setLoading(true);
    setLoadError(null);
    try {
      setItems(await listGroceryItems());
    } catch (err) {
      // Most likely cause: v2_grocery_list_display_layer.sql hasn't been
      // run yet (purchased/created_at columns missing) — surfaced instead
      // of failing silently and leaving this tab permanently blank.
      setLoadError(err.message || String(err));
    }
    setLoading(false);
  }

  function shiftWeek(days) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + days);
    setWeekStart(d.toISOString().slice(0, 10));
  }

  async function handleGenerateAggregated() {
    setGenerating(true);
    setGenError(null);
    try {
      const result = await generateAggregatedGroceryList(weekStart);
      setGenStatus(`Added/updated ${result.added} ingredient${result.added === 1 ? '' : 's'} with real quantities` +
        (result.skippedHaveEnough > 0 ? ` (${result.skippedHaveEnough} already covered by what's on hand).` : '.'));
      refresh();
    } catch (err) {
      // Most likely cause: v2_grocery_aggregation_and_inventory_layer.sql hasn't been run yet.
      setGenError(err.message || String(err));
    }
    setGenerating(false);
    setTimeout(() => setGenStatus(null), 5000);
  }

  async function loadMappings() {
    try {
      setMappings(await listShoppingUnitMappings());
    } catch (err) {
      setMappingError(err.message || String(err));
    }
  }

  async function handleAddMapping() {
    if (!newMapping.ingredient_name.trim() || !newMapping.shopping_unit_label.trim()) return;
    try {
      await addShoppingUnitMapping({
        ingredient_name: newMapping.ingredient_name.trim(),
        qty_per_shopping_unit: Number(newMapping.qty_per_shopping_unit) || 1,
        shopping_unit_label: newMapping.shopping_unit_label.trim(),
      });
    } catch (err) {
      setMappingError(err.message || String(err));
      return;
    }
    setMappingError(null);
    setNewMapping({ ingredient_name: '', qty_per_shopping_unit: '', shopping_unit_label: '' });
    loadMappings();
  }

  async function handleDeleteMapping(id) {
    await deleteShoppingUnitMapping(id);
    loadMappings();
  }

  async function handleToggle(item) {
    await toggleGroceryItemPurchased(item.id, !item.purchased);
    refresh();
  }

  async function handleClearPurchased() {
    await clearPurchasedGroceryItems();
    refresh();
  }

  function toggleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleBulkDelete() {
    const count = selectedIds.size;
    if (count === 0) return;
    const confirmed = window.confirm(`Delete ${count} item${count === 1 ? '' : 's'} from the list? This can't be undone.`);
    if (!confirmed) return;
    await bulkDeleteGroceryItems([...selectedIds]);
    setSelectedIds(new Set());
    refresh();
  }

  if (loading) return null;
  if (loadError) {
    return (
      <Card>
        <div className="section-label">Grocery List</div>
        <div className="muted" style={{ fontSize: 'var(--text-caption)', marginTop: 'var(--space-2)', color: 'var(--danger)' }}>
          Couldn't load the grocery list: {loadError}
          <br />If this mentions a missing column, the v2_grocery_list_display_layer.sql migration likely hasn't been run yet.
        </div>
      </Card>
    );
  }

  const needed = items.filter(i => !i.purchased);
  const purchased = items.filter(i => i.purchased);

  return (
    <Card>
      <div className="row-between">
        <div className="section-label">Grocery List</div>
        <div className="row" style={{ gap: 'var(--space-2)' }}>
          {selectedIds.size > 0 && <Button size="sm" variant="text" onClick={handleBulkDelete}>Delete {selectedIds.size} selected</Button>}
          {purchased.length > 0 && <Button size="sm" variant="text" onClick={handleClearPurchased}>Clear checked ({purchased.length})</Button>}
        </div>
      </div>

      <div className="row-between" style={{ marginTop: 'var(--space-3)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <div className="row" style={{ gap: 'var(--space-2)', alignItems: 'center' }}>
          <Button size="sm" variant="ghost" onClick={() => shiftWeek(-7)}>← </Button>
          <span className="muted" style={{ fontSize: 'var(--text-caption)' }}>Week of {weekStart}</span>
          <Button size="sm" variant="ghost" onClick={() => shiftWeek(7)}>→</Button>
        </div>
        <Button size="sm" variant="primary" onClick={handleGenerateAggregated} disabled={generating}>
          {generating ? 'Calculating…' : 'Generate list (with quantities)'}
        </Button>
      </div>
      {genStatus && <div className="muted" style={{ fontSize: 'var(--text-caption)', marginTop: 4 }}>{genStatus}</div>}
      {genError && <div className="muted" style={{ fontSize: 'var(--text-caption)', marginTop: 4, color: 'var(--danger)' }}>Couldn't generate: {genError}</div>}

      {items.length === 0 ? (
        <EmptyState icon="leaf" title="Nothing on your list yet" subtitle="Use 'Generate grocery list' from Plan a day/week, or 'Add to grocery list' from a recipe." />
      ) : (
        <div className="stack" style={{ marginTop: 'var(--space-3)', gap: 4 }}>
          {needed.map(item => (
            <label key={item.id} className="row" style={{ gap: 'var(--space-2)', alignItems: 'center' }}>
              <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} title="Select for bulk delete" />
              <input type="checkbox" checked={false} onChange={() => handleToggle(item)} title="Mark purchased" />
              <span>{item.name}</span>
              {item.total_quantity != null && <span className="faint">× {item.total_quantity} {item.unit}</span>}
              <span className="muted" style={{ fontSize: 'var(--text-micro)' }}>{item.category}</span>
              <button className="row-remove-btn" aria-label="Remove" onClick={() => deleteGroceryItem(item.id).then(refresh)}>×</button>
            </label>
          ))}
          {purchased.length > 0 && (
            <>
              <div className="muted" style={{ fontSize: 'var(--text-micro)', marginTop: 'var(--space-3)' }}>Checked off</div>
              {purchased.map(item => (
                <label key={item.id} className="row" style={{ gap: 'var(--space-2)', alignItems: 'center', opacity: 0.5 }}>
                  <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} title="Select for bulk delete" />
                  <input type="checkbox" checked={true} onChange={() => handleToggle(item)} title="Mark purchased" />
                  <span style={{ textDecoration: 'line-through' }}>{item.name}</span>
                </label>
              ))}
            </>
          )}
        </div>
      )}

      <div style={{ marginTop: 'var(--space-4)' }}>
        <Button size="sm" variant="text" onClick={() => setShowMappings(!showMappings)}>
          {showMappings ? 'Hide' : 'Manage'} shopping-unit conversions
        </Button>
        {showMappings && (
          <div style={{ marginTop: 'var(--space-2)' }}>
            <p className="muted" style={{ fontSize: 'var(--text-micro)' }}>
              Define how a recipe quantity converts to what you actually buy — e.g. "4 cups flour" per "1 bag (5lb)."
              Ingredients without a mapping just show their raw recipe quantity on the list.
            </p>
            {mappingError && <div className="muted" style={{ fontSize: 'var(--text-micro)', color: 'var(--danger)' }}>{mappingError}</div>}
            {mappings.length > 0 && (
              <div className="stack" style={{ gap: 4, marginTop: 'var(--space-2)' }}>
                {mappings.map(m => (
                  <div key={m.id} className="row-between" style={{ fontSize: 'var(--text-small)' }}>
                    <span>{m.ingredient_name}: {m.qty_per_shopping_unit} → 1 {m.shopping_unit_label}</span>
                    <button className="row-remove-btn" aria-label="Remove" onClick={() => handleDeleteMapping(m.id)}>×</button>
                  </div>
                ))}
              </div>
            )}
            <div className="row" style={{ marginTop: 'var(--space-2)', flexWrap: 'wrap', gap: 4 }}>
              <input placeholder="Ingredient (e.g. Flour)" value={newMapping.ingredient_name}
                onChange={e => setNewMapping(m => ({ ...m, ingredient_name: e.target.value }))} style={{ flex: 2, minWidth: 120 }} />
              <input type="number" placeholder="Qty" value={newMapping.qty_per_shopping_unit}
                onChange={e => setNewMapping(m => ({ ...m, qty_per_shopping_unit: e.target.value }))} style={{ width: 60 }} />
              <input placeholder="= 1 shopping unit (e.g. bag)" value={newMapping.shopping_unit_label}
                onChange={e => setNewMapping(m => ({ ...m, shopping_unit_label: e.target.value }))} style={{ flex: 2, minWidth: 140 }} />
              <Button size="sm" variant="ghost" onClick={handleAddMapping}>+ Add</Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

