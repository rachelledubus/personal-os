import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Checkbox from '../../components/ui/Checkbox.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { listTransactions, addTransaction } from '../../services/transactions.js';
import { listContacts } from '../../services/contacts.js';

// ============================================================
// CLIENTS — Transaction Review Log, alive instead of a static
// template. Logging a closing schedules the 30/90/365 touches and
// captures the content idea automatically.
// ============================================================
export default
function ClientsTab() {
  const [transactions, setTransactions] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    contact_id: '', buyer_or_seller: 'Buyer', property_area: '', closing_date: '', referral_source: '',
    timeline_notes: '', biggest_objection: '', unexpected_question: '', what_almost_went_wrong: '',
    lesson_learned: '', system_to_update: '', content_idea_added: false, added_to_past_client_plan: true,
    testimonial_requested: true, photos_collected: false, referral_opportunity_noted: '',
  });

  async function refresh() {
    const [t, c] = await Promise.all([listTransactions(), listContacts('Active Client')]);
    setTransactions(t);
    setContacts(c);
  }
  useEffect(() => { refresh(); }, []);

  function handleSelectContact(contactId) {
    const contact = contacts.find(c => c.id === contactId);
    setForm(prev => ({
      ...prev,
      contact_id: contactId,
      // Both already exist on the CRM record — no reason to ask twice.
      buyer_or_seller: contact?.buyer_seller && contact.buyer_seller !== 'Both' ? contact.buyer_seller : prev.buyer_or_seller,
      property_area: contact?.location_interest || prev.property_area,
    }));
  }

  async function handleAdd() {
    if (!form.contact_id || !form.closing_date) return;
    const contact = contacts.find(c => c.id === form.contact_id);
    await addTransaction({ ...form, contacts_name: contact?.name });
    setForm({
      contact_id: '', buyer_or_seller: 'Buyer', property_area: '', closing_date: '', referral_source: '',
      timeline_notes: '', biggest_objection: '', unexpected_question: '', what_almost_went_wrong: '',
      lesson_learned: '', system_to_update: '', content_idea_added: false, added_to_past_client_plan: true,
      testimonial_requested: true, photos_collected: false, referral_opportunity_noted: '',
    });
    setAdding(false);
    refresh();
  }

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <Card>
        <div className="row-between">
          <div className="section-label">Log a closing</div>
          <Button size="sm" variant="ghost" onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ New closing'}</Button>
        </div>
        {adding && (
          <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <select value={form.contact_id} onChange={e => handleSelectContact(e.target.value)}>
                <option value="">Select client...</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={form.buyer_or_seller} onChange={e => setForm({ ...form, buyer_or_seller: e.target.value })}>
                <option>Buyer</option><option>Seller</option>
              </select>
              <input placeholder="Property / area" value={form.property_area} onChange={e => setForm({ ...form, property_area: e.target.value })} />
              <input type="date" value={form.closing_date} onChange={e => setForm({ ...form, closing_date: e.target.value })} />
              <input placeholder="Referral source" value={form.referral_source} onChange={e => setForm({ ...form, referral_source: e.target.value })} />
            </div>

            <div className="muted" style={{ fontSize: 'var(--text-micro)', marginTop: 'var(--space-2)', textTransform: 'uppercase' }}>What happened</div>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <input placeholder="Timeline (start to close)" value={form.timeline_notes} onChange={e => setForm({ ...form, timeline_notes: e.target.value })} style={{ flex: 1, minWidth: 200 }} />
              <input placeholder="Biggest objection or concern" value={form.biggest_objection} onChange={e => setForm({ ...form, biggest_objection: e.target.value })} style={{ flex: 1, minWidth: 200 }} />
            </div>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <input placeholder="Unexpected question" value={form.unexpected_question} onChange={e => setForm({ ...form, unexpected_question: e.target.value })} style={{ flex: 1, minWidth: 200 }} />
              <input placeholder="What almost went wrong" value={form.what_almost_went_wrong} onChange={e => setForm({ ...form, what_almost_went_wrong: e.target.value })} style={{ flex: 1, minWidth: 200 }} />
            </div>

            <div className="muted" style={{ fontSize: 'var(--text-micro)', marginTop: 'var(--space-2)', textTransform: 'uppercase' }}>Lessons</div>
            <textarea placeholder="Lesson learned — what could've been explained earlier, or a content idea from this transaction" value={form.lesson_learned} onChange={e => setForm({ ...form, lesson_learned: e.target.value })} style={{ minHeight: 60 }} />
            <input placeholder="Which system should this update? (e.g. Consultation SOP)" value={form.system_to_update} onChange={e => setForm({ ...form, system_to_update: e.target.value })} />
            <input placeholder="Referral opportunity — who they might introduce" value={form.referral_opportunity_noted} onChange={e => setForm({ ...form, referral_opportunity_noted: e.target.value })} />

            <div className="muted" style={{ fontSize: 'var(--text-micro)', marginTop: 'var(--space-2)', textTransform: 'uppercase' }}>What this transaction creates</div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--space-3)' }}>
              <Checkbox checked={form.added_to_past_client_plan} onChange={v => setForm({ ...form, added_to_past_client_plan: v })} label="Schedule 30/90/365-day touches" />
              <Checkbox checked={form.content_idea_added} onChange={v => setForm({ ...form, content_idea_added: v })} label="Send lesson to Inbox as content idea" />
              <Checkbox checked={form.testimonial_requested} onChange={v => setForm({ ...form, testimonial_requested: v })} label="Testimonial requested" />
              <Checkbox checked={form.photos_collected} onChange={v => setForm({ ...form, photos_collected: v })} label="Photos collected (with permission)" />
            </div>
            <div><Button size="sm" onClick={handleAdd}>Save closing</Button></div>
          </div>
        )}
      </Card>

      {transactions.length === 0 ? <EmptyState icon="star" title="No closings logged yet" /> : transactions.map(t => (
        <Card key={t.id}>
          <div className="row-between">
            <div style={{ fontWeight: 700 }}>{t.contacts?.name || 'Unknown client'} · {t.property_area}</div>
            <span className="muted" style={{ fontSize: 'var(--text-caption)' }}>{t.closing_date}</span>
          </div>
          {t.lesson_learned && <div className="muted" style={{ fontSize: 'var(--text-small)', marginTop: 4 }}>{t.lesson_learned}</div>}
          {t.system_to_update && <div className="faint" style={{ fontSize: 'var(--text-caption)', marginTop: 2 }}>Updates: {t.system_to_update}</div>}
        </Card>
      ))}
    </div>
  );
}
