// OWNER: REALTOR-OS (app)
// File: src/pages/realtor/Contacts.jsx

import React, { useEffect, useState } from 'react';

export default function Contacts() {
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/realtor/contacts');
      if (res.ok) setContacts(await res.json());
    }
    load();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Contacts</h1>
      <ul>
        {contacts.map(c => (<li key={c.id}>{c.first_name} {c.last_name} — {c.email}</li>))}
      </ul>
    </div>
  );
}
