// OWNER: REALTOR-OS (app)
// File: src/pages/realtor/Leads.jsx

import React, { useEffect, useState } from 'react';

export default function Leads() {
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/realtor/leads');
      if (res.ok) setLeads(await res.json());
    }
    load();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Leads</h1>
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Status</th></tr></thead>
        <tbody>
          {leads.map(l => (
            <tr key={l.id}>
              <td>{l.first_name} {l.last_name}</td>
              <td>{l.email}</td>
              <td>{l.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
