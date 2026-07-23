// OWNER: REALTOR-OS (app)
// File: src/components/realtor/ChecklistViewer.jsx

import React, { useEffect, useState } from 'react';

export default function ChecklistViewer({ instanceId }) {
  const [instance, setInstance] = useState(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/checklists/${instanceId}`);
      if (res.ok) setInstance(await res.json());
    }
    if (instanceId) load();
  }, [instanceId]);

  if (!instance) return <div>No checklist selected.</div>;

  return (
    <div>
      <h3>Checklist: {instance.checklistId}</h3>
      <ul>
        {instance.items.map(i => (
          <li key={i.id}>
            <label>
              <input type="checkbox" checked={i.done} onChange={async () => {
                await fetch(`/api/checklists/${instance.id}/items/${i.id}`, { method: 'POST' });
                const r = await fetch(`/api/checklists/${instance.id}`);
                setInstance(await r.json());
              }} /> {i.text}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
