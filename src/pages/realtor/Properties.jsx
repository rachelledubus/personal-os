// OWNER: REALTOR-OS (app)
// File: src/pages/realtor/Properties.jsx

import React, { useEffect, useState } from 'react';

export default function Properties() {
  const [props, setProps] = useState([]);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/realtor/properties');
      if (res.ok) setProps(await res.json());
    }
    load();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Properties</h1>
      <table>
        <thead><tr><th>Address</th><th>MLS ID</th><th>Price</th><th>Status</th></tr></thead>
        <tbody>
          {props.map(p => (
            <tr key={p.id}>
              <td>{p.address}, {p.city}</td>
              <td>{p.mls_id || '-'}</td>
              <td>{p.list_price}</td>
              <td>{p.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
