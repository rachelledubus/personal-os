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
const TRANSACTION_CATEGORIES = ['Lead', 'Future Client', 'Active Client'];

export default function ContactProfilePanel({ contactId, onClose, onUpdated }) {
  const [contact, setContact] = useState(null);
  const [categories, setCategories] = useState([]);
  const [stages, setStages] = useState([]);
  const [sources, setSources] = useState([]);
  const [timelines, setTimelines] = useState([]);
  const [cadence, setCadence] = useState({});

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  const [editingFollowUp, setEditingFollowUp] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({});

  const [editingContactInfo, setEditingContactInfo] = useState(false);
  const [contactInfoForm, setContactInfoForm] = useState({});

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({});

  const [editingNotes, setEditingNotes] = useState(false);
  const [notesForm, setNotesForm] = useState({});

  const [draft, setDraft] = useState(null);
  const [drafting, setDrafting] = useState(false);

  async function refresh() {
    if (!contactId) return;
    const [c, cats, st, src, tl, cad] = await Promise.all([
      getContact(contactId), getCategoryList('pipeline_categories'), getCategoryList('lead_stages'),
      getCategoryList('lead_sources'), getCategoryList('contact_timelines'), getCadenceStandards(),
    ]);
    setContact(c); setCategories(cats); setStages(st); setSources(src); setTimelines(tl); setCadence(cad);
    setNameDraft(c.name);
    setFollowUpForm({ next_action: c.next_action || '', next_follow_up_date: c.next_follow_up_date || '', last_contact_date: c.last_contact_date || '' });
    setContactInfoForm({ phone: c.phone || '', email: c.email || '', organization: c.organization || '', how_we_connected: c.how_we_connected || '' });
    setProfileForm({ buyer_seller: c.buyer_seller || '', persona: c.persona || '', location_interest: c.location_interest || '' });
    setNotesForm({
      goals: c.goals || '', concerns: c.concerns || '', important_personal_details: c.important_personal_details || '',
      relationship_notes: c.relationship_notes || '', last_conversation: c.last_conversation || '',
    });
  }
  useEffect(() => { refresh(); }, [contactId]);

  async function applyField(fields) {
    await updateContact(contactId, fields);
    await refresh();
    onUpdated?.();
  }

  async function handleSaveName() {
    if (!nameDraft.trim()) return;
    await applyField({ name: nameDraft.trim() });
    setEditingName(false);
  }

  async function handleSaveFollowUp() {
    await applyField({ ...followUpForm, next_follow_up_date: followUpForm.next_follow_up_date || null, last_contact_date: followUpForm.last_contact_date || null });
    setEditingFollowUp(false);
  }

  async function handleSaveContactInfo() {
    await applyField(contactInfoForm);
    setEditingContactInfo(false);
  }

  async function handleSaveProfile() {
    await applyField({ ...profileForm, buyer_seller: profileForm.buyer_seller || null });
    setEditingProfile(false);
  }

  async function handleSaveNotes() {
    await applyField(notesForm);
    setEditingNotes(false);
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
  const isTransactionCategory = TRANSACTION_CATEGORIES.includes(contact.category);
  const standardKey = standardKeyForContact(contact);
  const standard = FOLLOWUP_STANDARD_TYPES.find(s => s.key === standardKey);

  return (
    <SidePanel open title={
      editingName ? (
        <div className="row" style={{ gap: 'var(--space-2)' }}>
          <input value={nameDraft} onChange={e => setNameDraft(e.target.value)} autoFocus
            onKeyDown={e => e.key === 'Enter' && handleSaveName()} style={{ fontSize: 'var(--text-title)', fontWeight: 800 }} />
          <Button size="sm" onClick={handleSaveName}>Save</Button>
        </div>
      ) : (
        <span style={{ cursor: 'text' }} onClick={() => setEditingName(true)}>{contact.name}</span>
      )
    } onClose={onClose}>
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

        <div className="row" style={{ gap: 'var(--space-2)' }}>
          <div style={{ flex: 1 }}>
            <div className="section-label" style={{ fontSize: 11 }}>Relationship tier</div>
            <select style={{ marginTop: 4, width: '100%' }} value={contact.relationship_tier || ''} onChange={e => applyField({ relationship_tier: e.target.value || null })}>
              <option value="">No tier set</option>
              {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <div className="section-label" style={{ fontSize: 11 }}>Prefers</div>
            <select style={{ marginTop: 4, width: '100%' }} value={contact.preferred_contact_method || 'text'} onChange={e => applyField({ preferred_contact_method: e.target.value })}>
              <option value="text">Text</option>
              <option value="email">Email</option>
              <option value="call_scheduled">Scheduled calls only</option>
            </select>
          </div>
        </div>

        {/* ---------- Follow-up ---------- */}
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
              <label className="reset-field"><span>Next follow-up due</span>
                <input type="date" value={followUpForm.next_follow_up_date || ''}
                  onChange={e => setFollowUpForm({ ...followUpForm, next_follow_up_date: e.target.value })} />
              </label>
              <label className="reset-field"><span>Last actually contacted</span>
                <input type="date" value={followUpForm.last_contact_date || ''}
                  onChange={e => setFollowUpForm({ ...followUpForm, last_contact_date: e.target.value })} />
              </label>
              <div><Button size="sm" onClick={handleSaveFollowUp}>Save</Button></div>
            </div>
          ) : (
            <div style={{ marginTop: 4, fontSize: 13 }}>
              {contact.next_action || <span className="muted">No next action set</span>}
              {contact.next_follow_up_date && <div className="muted" style={{ fontSize: 12 }}>Due {contact.next_follow_up_date}</div>}
              {contact.last_contact_date && <div className="muted" style={{ fontSize: 12 }}>Last contacted {contact.last_contact_date}</div>}
            </div>
          )}
        </div>

        {/* ---------- Contact info ---------- */}
        <div>
          <div className="row-between">
            <div className="section-label" style={{ fontSize: 12 }}>Contact info</div>
            <Button size="sm" variant="text" onClick={() => setEditingContactInfo(!editingContactInfo)}>{editingContactInfo ? 'Cancel' : 'Edit'}</Button>
          </div>
          {editingContactInfo ? (
            <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
              <input placeholder="Phone" value={contactInfoForm.phone} onChange={e => setContactInfoForm({ ...contactInfoForm, phone: e.target.value })} />
              <input placeholder="Email" value={contactInfoForm.email} onChange={e => setContactInfoForm({ ...contactInfoForm, email: e.target.value })} />
              <input placeholder="Organization" value={contactInfoForm.organization} onChange={e => setContactInfoForm({ ...contactInfoForm, organization: e.target.value })} />
              <input placeholder="How we connected" value={contactInfoForm.how_we_connected} onChange={e => setContactInfoForm({ ...contactInfoForm, how_we_connected: e.target.value })} />
              <div><Button size="sm" onClick={handleSaveContactInfo}>Save</Button></div>
            </div>
          ) : (
            <div className="stack" style={{ marginTop: 4, fontSize: 13, gap: 4 }}>
              {contact.phone && <div>{contact.phone}</div>}
              {contact.email && <div>{contact.email}</div>}
              {contact.organization && <div className="muted">{contact.organization}</div>}
              {contact.how_we_connected && <div className="muted">Connected via: {contact.how_we_connected}</div>}
              {!contact.phone && !contact.email && !contact.organization && !contact.how_we_connected && (
                <span className="muted">Nothing recorded yet.</span>
              )}
            </div>
          )}
        </div>

        {/* ---------- Buyer/seller profile ---------- */}
        {isTransactionCategory && (
          <div>
            <div className="row-between">
              <div className="section-label" style={{ fontSize: 12 }}>Buyer/seller profile</div>
              <Button size="sm" variant="text" onClick={() => setEditingProfile(!editingProfile)}>{editingProfile ? 'Cancel' : 'Edit'}</Button>
            </div>
            {editingProfile ? (
              <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
                <select value={profileForm.buyer_seller} onChange={e => setProfileForm({ ...profileForm, buyer_seller: e.target.value })}>
                  <option value="">Not set</option>
                  <option value="Buyer">Buyer</option>
                  <option value="Seller">Seller</option>
                  <option value="Both">Both</option>
                </select>
                <input placeholder="Persona" value={profileForm.persona} onChange={e => setProfileForm({ ...profileForm, persona: e.target.value })} />
                <input placeholder="Location interest" value={profileForm.location_interest} onChange={e => setProfileForm({ ...profileForm, location_interest: e.target.value })} />
                <div><Button size="sm" onClick={handleSaveProfile}>Save</Button></div>
              </div>
            ) : (
              <div className="stack" style={{ marginTop: 4, fontSize: 13, gap: 4 }}>
                {contact.buyer_seller && <div>{contact.buyer_seller}</div>}
                {contact.persona && <div><strong>Persona:</strong> {contact.persona}</div>}
                {contact.location_interest && <div><strong>Looking in:</strong> {contact.location_interest}</div>}
                {!contact.buyer_seller && !contact.persona && !contact.location_interest && (
                  <span className="muted">Nothing recorded yet — fill in here or via Consultation.</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* ---------- Notes ---------- */}
        <div>
          <div className="row-between">
            <div className="section-label" style={{ fontSize: 12 }}>Notes</div>
            <Button size="sm" variant="text" onClick={() => setEditingNotes(!editingNotes)}>{editingNotes ? 'Cancel' : 'Edit'}</Button>
          </div>
          {editingNotes ? (
            <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
              <textarea placeholder="Goals" value={notesForm.goals} onChange={e => setNotesForm({ ...notesForm, goals: e.target.value })} style={{ minHeight: 44 }} />
              <textarea placeholder="Concerns" value={notesForm.concerns} onChange={e => setNotesForm({ ...notesForm, concerns: e.target.value })} style={{ minHeight: 44 }} />
              <textarea placeholder="Other important details" value={notesForm.important_personal_details}
                onChange={e => setNotesForm({ ...notesForm, important_personal_details: e.target.value })} style={{ minHeight: 44 }} />
              <textarea placeholder="Relationship notes" value={notesForm.relationship_notes}
                onChange={e => setNotesForm({ ...notesForm, relationship_notes: e.target.value })} style={{ minHeight: 44 }} />
              <textarea placeholder="Last conversation" value={notesForm.last_conversation}
                onChange={e => setNotesForm({ ...notesForm, last_conversation: e.target.value })} style={{ minHeight: 44 }} />
              <div><Button size="sm" onClick={handleSaveNotes}>Save</Button></div>
            </div>
          ) : (
            <div className="stack" style={{ marginTop: 4, fontSize: 13, gap: 4 }}>
              {contact.goals && <div><strong>Goals:</strong> {contact.goals}</div>}
              {contact.concerns && <div><strong>Concerns:</strong> {contact.concerns}</div>}
              {contact.important_personal_details && <div>{contact.important_personal_details}</div>}
              {contact.relationship_notes && <div><strong>Relationship notes:</strong> {contact.relationship_notes}</div>}
              {contact.last_conversation && <div><strong>Last conversation:</strong> {contact.last_conversation}</div>}
              {!contact.goals && !contact.concerns && !contact.important_personal_details && !contact.relationship_notes && !contact.last_conversation && (
                <span className="muted">Nothing recorded yet.</span>
              )}
            </div>
          )}
        </div>

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

        <div className="muted" style={{ fontSize: 11, borderTop: '1px solid var(--sand)', paddingTop: 'var(--space-2)' }}>
          Added {contact.date_added || contact.created_at?.slice(0, 10)}
        </div>
      </div>
    </SidePanel>
  );
}