import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import {
  listEmailTemplates, addEmailTemplate, updateEmailTemplate, deleteEmailTemplate,
  listAutomations, addAutomation, updateAutomation, deleteAutomation, saveAutomationSteps,
  listEnrollments, cancelEnrollment,
} from '../../services/marketingAutomation.js';

// ============================================================
// MARKETING AUTOMATION — form submits, contact gets created and
// tagged, gets enrolled in a sequence, a scheduled function sends
// each step on schedule. Deliberately a list editor (add Email, add
// Wait), not a visual drag-and-drop builder — per the spec's own
// note, that gets nearly all the value for a fraction of the build.
// ============================================================
export default function MarketingAutomationTab() {
  const [subTab, setSubTab] = useState('automations');

  return (
    <div>
      <div className="row" style={{ marginBottom: 'var(--space-4)', gap: 4 }}>
        {[['automations', 'Automations'], ['templates', 'Email Templates'], ['enrollments', 'Enrollments'], ['setup', 'Setup']].map(([key, label]) => (
          <button key={key} className={`sub-tab ${subTab === key ? 'active' : ''}`} onClick={() => setSubTab(key)}>{label}</button>
        ))}
      </div>
      {subTab === 'automations' && <AutomationsView />}
      {subTab === 'templates' && <TemplatesView />}
      {subTab === 'enrollments' && <EnrollmentsView />}
      {subTab === 'setup' && <SetupView />}
    </div>
  );
}

function AutomationsView() {
  const [automations, setAutomations] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [newName, setNewName] = useState('');
  const [editSteps, setEditSteps] = useState({});
  const [error, setError] = useState(null);

  async function refresh() {
    const [a, t] = await Promise.all([listAutomations(), listEmailTemplates()]);
    setAutomations(a);
    setTemplates(t);
  }
  useEffect(() => { refresh(); }, []);

  async function handleAdd() {
    if (!newName.trim()) return;
    setError(null);
    try {
      await addAutomation(newName.trim());
    } catch (err) {
      setError(err.message || String(err));
      return;
    }
    setNewName('');
    refresh();
  }

  function startEditing(automation) {
    setExpandedId(automation.id);
    setEditSteps({
      [automation.id]: automation.automation_steps.map(s => ({ delay_days: s.delay_days, template_id: s.template_id })),
    });
  }

  function updateStep(automationId, index, field, value) {
    setEditSteps(prev => {
      const steps = [...(prev[automationId] || [])];
      steps[index] = { ...steps[index], [field]: field === 'delay_days' ? Number(value) : value };
      return { ...prev, [automationId]: steps };
    });
  }

  function addStep(automationId) {
    setEditSteps(prev => ({
      ...prev,
      [automationId]: [...(prev[automationId] || []), { delay_days: 0, template_id: templates[0]?.id || null }],
    }));
  }

  function removeStep(automationId, index) {
    setEditSteps(prev => ({ ...prev, [automationId]: prev[automationId].filter((_, i) => i !== index) }));
  }

  async function handleSaveSteps(automationId) {
    setError(null);
    try {
      await saveAutomationSteps(automationId, editSteps[automationId] || []);
    } catch (err) {
      setError(err.message || String(err));
      return;
    }
    setExpandedId(null);
    refresh();
  }

  async function handleDelete(automation) {
    const confirmed = window.confirm(`Delete "${automation.name}"? Active enrollments in it will stop advancing. This can't be undone.`);
    if (!confirmed) return;
    await deleteAutomation(automation.id);
    refresh();
  }

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <Card>
        <div className="row-between">
          <div className="section-label">Automations</div>
        </div>
        {error && <div className="muted" style={{ fontSize: 'var(--text-micro)', color: 'var(--danger)', marginTop: 4 }}>{error}</div>}
        {automations.length === 0 ? <EmptyState icon="sparkles" title="No automations yet" /> : (
          <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
            {automations.map(a => (
              <div key={a.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--sand)' }}>
                <div className="row-between">
                  <div>
                    <div style={{ fontWeight: 700 }}>{a.name}</div>
                    <div className="muted" style={{ fontSize: 'var(--text-caption)' }}>{a.automation_steps.length} step{a.automation_steps.length === 1 ? '' : 's'}</div>
                  </div>
                  <div className="row" style={{ gap: 4 }}>
                    <Button size="sm" variant="text" onClick={() => expandedId === a.id ? setExpandedId(null) : startEditing(a)}>
                      {expandedId === a.id ? 'Close' : 'Edit steps'}
                    </Button>
                    <button className="row-remove-btn" aria-label="Remove" onClick={() => handleDelete(a)}>×</button>
                  </div>
                </div>

                {expandedId !== a.id && a.automation_steps.length > 0 && (
                  <div className="stack" style={{ marginTop: 6, gap: 2 }}>
                    {a.automation_steps.map((s, i) => (
                      <div key={s.id} className="muted" style={{ fontSize: 'var(--text-small)' }}>
                        {i + 1}. {s.delay_days === 0 ? 'Immediately' : `After ${s.delay_days} day${s.delay_days === 1 ? '' : 's'}`} — {s.email_templates?.name || 'No template picked'}
                      </div>
                    ))}
                  </div>
                )}

                {expandedId === a.id && (
                  <div className="stack" style={{ marginTop: 'var(--space-3)', gap: 6 }}>
                    {(editSteps[a.id] || []).map((step, i) => (
                      <div key={i} className="row" style={{ gap: 'var(--space-2)', alignItems: 'center' }}>
                        <span className="muted" style={{ fontSize: 'var(--text-micro)', width: 20 }}>{i + 1}.</span>
                        <span className="muted" style={{ fontSize: 'var(--text-micro)' }}>Wait</span>
                        <input type="number" min="0" value={step.delay_days} onChange={e => updateStep(a.id, i, 'delay_days', e.target.value)} style={{ width: 60 }} />
                        <span className="muted" style={{ fontSize: 'var(--text-micro)' }}>days, then send</span>
                        <select value={step.template_id || ''} onChange={e => updateStep(a.id, i, 'template_id', e.target.value)}>
                          <option value="">Pick a template...</option>
                          {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <button className="row-remove-btn" aria-label="Remove step" onClick={() => removeStep(a.id, i)}>×</button>
                      </div>
                    ))}
                    <div className="row" style={{ gap: 'var(--space-2)' }}>
                      <Button size="sm" variant="ghost" onClick={() => addStep(a.id)}>+ Add step</Button>
                      <Button size="sm" onClick={() => handleSaveSteps(a.id)}>Save sequence</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="row" style={{ marginTop: 'var(--space-3)' }}>
          <input placeholder="New automation name (e.g. Buyer Nurture)" value={newName} onChange={e => setNewName(e.target.value)} />
          <Button size="sm" onClick={handleAdd}>+ Add automation</Button>
        </div>
      </Card>
    </div>
  );
}

function TemplatesView() {
  const [templates, setTemplates] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', subject: '', body: '' });

  async function refresh() { setTemplates(await listEmailTemplates()); }
  useEffect(() => { refresh(); }, []);

  async function handleAdd() {
    if (!form.name.trim() || !form.subject.trim()) return;
    await addEmailTemplate(form);
    setForm({ name: '', subject: '', body: '' });
    setAdding(false);
    refresh();
  }

  return (
    <Card>
      <div className="row-between">
        <div className="section-label">Email templates</div>
        <Button size="sm" variant="ghost" onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ New template'}</Button>
      </div>
      <p className="muted" style={{ fontSize: 'var(--text-caption)' }}>
        Use {'{{first_name}}'}, {'{{name}}'}, or {'{{email}}'} anywhere in the subject or body — filled in per contact when sent.
      </p>
      {adding && (
        <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
          <input placeholder="Template name (internal, e.g. 'Welcome')" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Subject line" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
          <textarea placeholder="Email body" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} style={{ minHeight: 140 }} />
          <div><Button size="sm" onClick={handleAdd}>Save template</Button></div>
        </div>
      )}
      {templates.length === 0 ? <EmptyState icon="sparkles" title="No templates yet" /> : (
        <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
          {templates.map(t => (
            <details key={t.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--sand)' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 'var(--text-small)' }}>{t.name} — {t.subject}</summary>
              <p className="muted" style={{ fontSize: 'var(--text-small)', marginTop: 4, whiteSpace: 'pre-line' }}>{t.body}</p>
              <button className="row-remove-btn" aria-label="Remove" onClick={() => deleteEmailTemplate(t.id).then(refresh)}>×</button>
            </details>
          ))}
        </div>
      )}
    </Card>
  );
}

function EnrollmentsView() {
  const [enrollments, setEnrollments] = useState([]);

  async function refresh() { setEnrollments(await listEnrollments()); }
  useEffect(() => { refresh(); }, []);

  const STATUS_LABEL = { active: 'Active', completed: 'Completed', cancelled: 'Cancelled' };

  return (
    <Card>
      <div className="section-label">Enrollments</div>
      {enrollments.length === 0 ? <EmptyState icon="sparkles" title="Nobody enrolled yet" /> : (
        <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
          {enrollments.map(e => (
            <div key={e.id} className="row-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--sand)' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{e.contacts?.name || e.contacts?.email || 'Unknown contact'}</div>
                <div className="muted" style={{ fontSize: 'var(--text-caption)' }}>
                  {e.automations?.name} — step {e.current_step + 1} — {STATUS_LABEL[e.status]}
                  {e.next_send && e.status === 'active' && ` — next send ${new Date(e.next_send).toLocaleDateString()}`}
                </div>
              </div>
              {e.status === 'active' && <Button size="sm" variant="text" onClick={() => cancelEnrollment(e.id).then(refresh)}>Cancel</Button>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function SetupView() {
  return (
    <Card>
      <div className="section-label">Setup checklist</div>
      <div className="stack" style={{ marginTop: 'var(--space-3)', gap: 10, fontSize: 'var(--text-small)' }}>
        <div>
          <strong>1. Run the migration</strong>
          <div className="muted">v2_marketing_automation_layer.sql</div>
        </div>
        <div>
          <strong>2. Get a Resend account and API key</strong>
          <div className="muted">resend.com — verify a sending domain there, then add RESEND_API_KEY and FROM_EMAIL (e.g. hello@yourdomain.com) as Netlify environment variables.</div>
        </div>
        <div>
          <strong>3. Find your Supabase user id</strong>
          <div className="muted">Supabase Dashboard → Authentication → Users → copy your own user's UUID → add as SITE_OWNER_USER_ID in Netlify.</div>
        </div>
        <div>
          <strong>4. Point your website's forms at this endpoint</strong>
          <div className="muted">POST to /.netlify/functions/submit-lead-form with JSON: {'{ name, email, phone, tags: ["buyer"], automation_name: "Buyer Nurture" }'}</div>
        </div>
        <div>
          <strong>5. Build your automations and templates here</strong>
          <div className="muted">Automations tab: create a sequence, add steps with a delay and a template. Email Templates tab: write the actual emails.</div>
        </div>
        <div>
          <strong>6. Set SITE_ORIGIN once you have a real domain</strong>
          <div className="muted">Locks the form endpoint to only accept submissions from your actual website instead of anywhere.</div>
        </div>
      </div>
    </Card>
  );
}
