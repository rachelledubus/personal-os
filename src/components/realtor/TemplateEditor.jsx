// OWNER: REALTOR-OS (app)
// File: src/components/realtor/TemplateEditor.jsx

import React, { useEffect, useState } from 'react';

export default function TemplateEditor() {
  const [templates, setTemplates] = useState([]);
  const [current, setCurrent] = useState(null);
  const [content, setContent] = useState('');

  useEffect(() => { async function l(){ const res = await fetch('/api/templates/list'); if(res.ok){ setTemplates(await res.json()); } } l(); }, []);

  async function openTemplate(path) {
    const res = await fetch(`/api/templates/get?path=${encodeURIComponent(path)}`);
    if (!res.ok) return;
    const txt = await res.text();
    setCurrent(path);
    setContent(txt);
  }

  async function save() {
    await fetch('/api/templates/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: current, content }) });
    alert('Saved');
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Templates</h1>
      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ width: 300 }}>
          <h3>Available</h3>
          <ul>
            {templates.map(t => (<li key={t}><button onClick={() => openTemplate(t)}>{t}</button></li>))}
          </ul>
        </div>
        <div style={{ flex: 1 }}>
          {current ? (
            <div>
              <h3>{current}</h3>
              <textarea style={{ width: '100%', height: 400 }} value={content} onChange={e => setContent(e.target.value)} />
              <div><button onClick={save}>Save</button></div>
            </div>
          ) : <div>Select a template to edit</div>}
        </div>
      </div>
    </div>
  );
}
