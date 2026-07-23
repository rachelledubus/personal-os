// OWNER: REALTOR-OS (app)
// File: src/pages/realtor/Dashboard.jsx
// Purpose: Minimal Dashboard UI skeleton for Realtor OS.

import React, { useEffect, useState } from 'react';

export default function Dashboard() {
  const [leads, setLeads] = useState([]);
  const [metrics, setMetrics] = useState({});

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/realtor/summary');
        if (res.ok) {
          const json = await res.json();
          setLeads(json.leads || []);
          setMetrics(json.metrics || {});
        }
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Realtor OS — Dashboard</h1>
      <section>
        <h2>Today's Focus</h2>
        <ul>
          {leads.slice(0,5).map(l => (<li key={l.id}>{l.first_name} {l.last_name} — {l.status}</li>))}
        </ul>
      </section>
      <section>
        <h2>Business Pulse</h2>
        <pre>{JSON.stringify(metrics, null, 2)}</pre>
      </section>
      <section>
        <h2>Attention Needed</h2>
        <p>Open tasks, overdue follow-ups, and pipeline risks will appear here.</p>
      </section>
    </div>
  );
}
