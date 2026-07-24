import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SidePanel from '../ui/SidePanel.jsx';
import Button from '../ui/Button.jsx';
import AiSuggestionBox from '../ui/AiSuggestionBox.jsx';
import InteractionTimeline from './InteractionTimeline.jsx';
import {
  getContact, updateContact, deleteContact, requestFollowUpDraft, inferDefaultTier,
} from '../../services/contacts.js';
import { getCategoryList } from '../../services/settings.js';
import { getCadenceStandards, standardKeyForContact, FOLLOWUP_STANDARD_TYPES } from '../../services/followupStandards.js';

const STATUS_TONE = {
  Overdue: 'var(--terracotta, #C0553A)',
  'Due Soon': 'var(--gold, #B8863B)',
  'On Track': 'var(--sage, #5B7B62)',
  'No Next Action': 'var(--ink-soft)',
  'No Date Set': 'var(--ink-soft)',
};

const TIERS = ['Tier 1 - Core', 'Tier 2 - Developing', 'Tier 3 - Strategic'];

// Fields captured by the Consultation guided flow — shown read-only
// here so the profile doesn't re-implement that flow's editing UI,
// just surfaces what it already collected.
const QUALIFYING_FIELDS = [
  ['buyer_seller', 'Buyer or seller'], ['persona', 'Persona'], ['location_interest', 'Location interest'],
  ['situation_notes', 'Situation & timeline notes'], ['lifestyle_notes', 'Lifestyle priorities'],
  ['comfortable_payment', 'Comfortable monthly payment'], ['budget_notes', 'Budget notes'],
  ['must_haves', 'Must-haves'], ['deal_breakers', 'Deal-breakers'],
];

export default function ContactProfilePanel({ contactId, onClose, onUpdated }) {
  const [contact, setContact] = useState(null);
  const [categories, setCategories] = useState([]);
  const [stages, setStages] = useState([]);
  const [sources, setSources] = useState([]);
  const [timelines, setTimelines] = useState([]);
  const [cadence, setCadence] = useState({});
  const [notesForm, setNotesForm] = useState({});
  const [editingNotes, setEditingNotes] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({});
  const [editingFollowUp, setEditingFollowUp] = useState(false);
  const [draft, setDraft] = useState(null);
  const [drafting, setDrafting] = useState(false);

  async function refresh() {
    if (!contactId) return;
    const [c, cats, st, src, tl, cad] = await Promise.all([
      getContact(contactId), getCategoryList('pipeline_categories'), getCategoryList('lead_stages'),
      getCategoryList('lead_sources'), getCategoryList('contact_timelines'), getCadenceStandards(),
    ]);
    setContact(c); setCategories(cats); setStages(st); setSources(src); setTimelines(tl); setCadence(cad);
    setNotesForm({
      phone: c.phone || '', email: c.email || '', goals: c.goals || '', concerns: c.concerns || '',
      important_personal_details: c.important_personal_details || '', how_we_connected: c.how_we_connected || '',
    });
    setFollowUpForm({ next_action: c.next_action || '', next_follow_up_date: c.next_follow_up_date || '' });
  }
  useEffect(() => { refresh(); }, [contactId]);

  async function applyField(fields) {
    await updateContact(contactId, fields);
    await refresh();
    onUpdated?.();
  }

  async function handleSaveNotes() {
    await applyField(notesForm);
    setEditingNotes(false);
  }

  async function handleSaveFollowUp() {
    await applyField({ ...followUpForm, next_follow_up_date: followUpForm.next_follow_up_date || null });
    setEditingFollowUp(false);
  }

  async function handleDraftFollowUp() {
    setDrafting(true);
    const result = await requestFollowUpDraft(contact);
    setDrafting(false);
    setDraft(result || { unavailable: true });
  }

  async function handleDelete() {
    if (!window.confirm(`Delete ${contact.name}? This removes the contact and can't be undone.`)) return;
    await deleteContact(contactId);
    onUpdated?.();
    onClose();
  }

  if (!contactId) return null;
  if (!contact) return <SidePanel open title="Loading…" onClose={onClose}><div /></SidePanel>;

  const isPipelineCategory = ['Lead', 'Future Client'].includes(contact.category);
  const standardKey = standardKeyForContact(contact);
  const standard = FOLLOWUP_STANDARD_TYPES.find(s => s.key === standardKey);
  const qualifying = QUALIFYING_FIELDS.filter(([key]) => contact[key]);

  return (
    <SidePanel open title={contact.name} subtitle={contact.organization} onClose={onClose}>
      <div className="stack" style={{ gap: 'var(--space-4)' }}>

        <div className="row-between">
          <select value={contact.category} onChange={e => applyField({ category: e.target.value, relationship_tier: contact.relationship_tier || inferDefaultTier(e.target.value) })}>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_TONE[contact.status] }}>{contact.status}</span>
        </div>

        {isPipelineCategory && (
          <div className="row" style={{ gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <select value={contact.lead_stage || ''} onChange={e => applyField({ lead_stage: e.target.value || null })}>
              <option value="">No stage set</option>
              {stages.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={contact.source || ''} onChange={e => applyField({ source: e.target.value || null })}>
              <option value="">Source unknown</option>
              {sources.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={contact.timeline || ''} onChange={e => applyField({ timeline: e.target.value || null })}>
              <option value="">Timeline unknown</option>
              {timelines.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}

        <div>
          <div className="section-label" style={{ fontSize: 12 }}>Relationship tier</div>
          <select style={{ marginTop: 4 }} value={contact.relationship_tier || ''} onChange={e => applyField({ relationship_tier: e.target.value || null })}>
            <option value="">No tier set</option>
            {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <div className="row-between">
            <div className="section-label" style={{ fontSize: 12 }}>Follow-up</div>
            <Button size="sm" variant="text" onClick={() => setEditingFollowUp(!editingFollowUp)}>{editingFollowUp ? 'Cancel' : 'Edit'}</Button>
          </div>
          {standard && (
            <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
              Standard: {standard.label} · every {cadence[standardKey] ?? '—'} days
            </div>
          )}
          {editingFollowUp ? (
            <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
              <input placeholder="Next action" value={followUpForm.next_action}
                onChange={e => setFollowUpForm({ ...followUpForm, next_action: e.target.value })} />
              <input type="date" value={followUpForm.next_follow_up_date || ''}
                onChange={e => setFollowUpForm({ ...followUpForm, next_follow_up_date: e.target.value })} />
              <div><Button size="sm" onClick={handleSaveFollowUp}>Save</Button></div>
            </div>
          ) : (
            <div style={{ marginTop: 4, fontSize: 13 }}>
              {contact.next_action || <span className="muted">No next action set</span>}
              {contact.next_follow_up_date && <div className="muted" style={{ fontSize: 12 }}>Due {contact.next_follow_up_date}</div>}
            </div>
          )}
        </div>

        <div className="row" style={{ gap: 'var(--space-2)' }}>
          <select value={contact.preferred_contact_method || 'text'} onChange={e => applyField({ preferred_contact_method: e.target.value })}>
            <option value="text">Prefers text</option>
            <option value="email">Prefers email</option>
            <option value="call_scheduled">Scheduled calls only</option>
          </select>
        </div>

        <div>
          <div className="row-between">
            <div className="section-label" style={{ fontSize: 12 }}>Details & notes</div>
            <Button size="sm" variant="text" onClick={() => setEditingNotes(!editingNotes)}>{editingNotes ? 'Cancel' : 'Edit'}</Button>
          </div>
          {editingNotes ? (
            <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
              <input placeholder="Phone" value={notesForm.phone} onChange={e => setNotesForm({ ...notesForm, phone: e.target.value })} />
              <input placeholder="Email" value={notesForm.email} onChange={e => setNotesForm({ ...notesForm, email: e.target.value })} />
              <input placeholder="How we connected" value={notesForm.how_we_connected} onChange={e => setNotesForm({ ...notesForm, how_we_connected: e.target.value })} />
              <textarea placeholder="Goals" value={notesForm.goals} onChange={e => setNotesForm({ ...notesForm, goals: e.target.value })} style={{ minHeight: 44 }} />
              <textarea placeholder="Concerns" value={notesForm.concerns} onChange={e => setNotesForm({ ...notesForm, concerns: e.target.value })} style={{ minHeight: 44 }} />
              <textarea placeholder="Other important details" value={notesForm.important_personal_details}
                onChange={e => setNotesForm({ ...notesForm, important_personal_details: e.target.value })} style={{ minHeight: 44 }} />
              <div><Button size="sm" onClick={handleSaveNotes}>Save</Button></div>
            </div>
          ) : (
            <div className="stack" style={{ marginTop: 4, fontSize: 13, gap: 4 }}>
              {contact.phone && <div>{contact.phone}</div>}
              {contact.email && <div>{contact.email}</div>}
              {contact.how_we_connected && <div className="muted">Connected via: {contact.how_we_connected}</div>}
              {contact.goals && <div><strong>Goals:</strong> {contact.goals}</div>}
              {contact.concerns && <div><strong>Concerns:</strong> {contact.concerns}</div>}
              {contact.important_personal_details && <div>{contact.important_personal_details}</div>}
              {!contact.phone && !contact.email && !contact.goals && !contact.concerns && !contact.important_personal_details && (
                <span className="muted">Nothing recorded yet.</span>
              )}
            </div>
          )}
        </div>

        {qualifying.length > 0 && (
          <div>
            <div className="section-label" style={{ fontSize: 12 }}>From consultation</div>
            <div className="stack" style={{ marginTop: 4, fontSize: 12 }}>
              {qualifying.map(([key, label]) => (
                <div key={key}><strong>{label}:</strong> {contact[key]}</div>
              ))}
            </div>
          </div>
        )}

        <div className="row" style={{ gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <Link to={`/business/flows/consultation?contact=${contact.id}`}><Button size="sm" variant="ghost">Consultation</Button></Link>
          <Button size="sm" variant="ghost" onClick={handleDraftFollowUp} disabled={drafting}>{drafting ? 'Drafting…' : '✨ Draft follow-up'}</Button>
          <Button size="sm" variant="text" onClick={handleDelete}>Delete</Button>
        </div>
        {draft && (
          <AiSuggestionBox unavailable={draft.unavailable} onDismiss={() => setDraft(null)}>
            <div style={{ fontSize: 13 }}>{draft.message}</div>
            {draft.channel && <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{draft.channel}</div>}
          </AiSuggestionBox>
        )}

        <InteractionTimeline contact={contact} />
      </div>
    </SidePanel>
  );
}