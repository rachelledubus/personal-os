import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SidePanel from '../ui/SidePanel.jsx';
import { Sparkles } from 'lucide-react';
import Button from '../ui/Button.jsx';
import Badge, { contactStatusTone } from '../ui/Badge.jsx';
import AiSuggestionBox from '../ui/AiSuggestionBox.jsx';
import InteractionTimeline from './InteractionTimeline.jsx';
import {
  getContact, updateContact, deleteContact, requestFollowUpDraft, inferDefaultTier,
} from '../../services/contacts.js';
import { getCategoryList } from '../../services/settings.js';
import { getCadenceStandards, standardKeyForContact, FOLLOWUP_STANDARD_TYPES } from '../../services/followupStandards.js';
import { logActivity } from '../../services/businessActivityLog.js';
import { listScripts } from '../../services/library.js';

const TIERS = ['Tier 1 - Core', 'Tier 2 - Developing', 'Tier 3 - Strategic'];

function plusDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
const TRANSACTION_CATEGORIES = ['Lead', 'Future Client', 'Active Client'];

export default function ContactProfilePanel({ contactId, onClose, onUpdated }) {
  const [contact, setContact] = useState(null);
  const [categories, setCategories] = useState([]);
  const [stages, setStages] = useState([]);
  const [sources, setSources] = useState([]);
  const [timelines, setTimelines] = useState([]);
  const [cadence, setCadence] = useState({});

  const [editingName, setEditingName] = useState(false);
  const [loggingTouch, setLoggingTouch] = useState(false);
  const [touchLogged, setTouchLogged] = useState(false);
  const [expandTouch, setExpandTouch] = useState(false);
  const [touchChannel, setTouchChannel] = useState('unspecified');
  const [touchNextFollowUp, setTouchNextFollowUp] = useState(plusDays(7));
  const [relationshipTriggers, setRelationshipTriggers] = useState([]);
  const [showTriggers, setShowTriggers] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  const [editingFollowUp, setEditingFollowUp] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({});

  const [editingContactInfo, setEditingContactInfo] = useState(false);
  const [contactInfoForm, setContactInfoForm] = useState({});

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({});

  const [editingNotes, setEditingNotes] = useState(false);
  const [notesForm, setNotesForm] = useState({});
  const [editingDiscovery, setEditingDiscovery] = useState(false);
  const [discoveryForm, setDiscoveryForm] = useState({});

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
    setDiscoveryForm({
      discovery_situation: c.discovery_situation || '', discovery_lifestyle_priorities: c.discovery_lifestyle_priorities || '',
      discovery_financial_reality: c.discovery_financial_reality || '', discovery_decision_factors: c.discovery_decision_factors || '',
    });
  }
  useEffect(() => { refresh(); }, [contactId]);
  useEffect(() => {
    listScripts().then(scripts => setRelationshipTriggers(scripts.filter(s => s.section === 'Trigger \u2014 Relationship')));
  }, []);

  async function applyField(fields) {
    await updateContact(contactId, fields);
    await refresh();
    onUpdated?.();
  }

  /** Default tap = done. No modal, no required fields — this is the
   *  actual fix for the interaction cost that made CRM logging fall
   *  off. The optional channel/next-follow-up expansion never blocks
   *  the tap itself. */
  async function handleLogTouch() {
    setLoggingTouch(true);
    try {
      await logActivity('conversation', {
        channel: touchChannel, relatedContactId: contactId,
      });
      if (expandTouch && touchNextFollowUp) {
        await applyField({ next_follow_up_date: touchNextFollowUp, last_contact_date: new Date().toISOString().slice(0, 10) });
      } else {
        await applyField({ last_contact_date: new Date().toISOString().slice(0, 10) });
      }
      setTouchLogged(true);
      setTimeout(() => setTouchLogged(false), 2000);
      setExpandTouch(false);
    } finally {
      setLoggingTouch(false);
    }
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

  async function handleSaveDiscovery() {
    await applyField(discoveryForm);
    setEditingDiscovery(false);
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
          <Badge tone={contactStatusTone(contact.status)}>{contact.status}</Badge>
        </div>

        {/* ---------- Quick Touch Logger — one tap, no modal ---------- */}
        <div>
          <div className="row" style={{ gap: 'var(--space-2)', alignItems: 'center' }}>
            <Button size="sm" variant={touchLogged ? 'sage' : 'primary'} onClick={handleLogTouch} disabled={loggingTouch}>
              {touchLogged ? '✓ Logged' : loggingTouch ? 'Logging…' : 'Log Touch'}
            </Button>
            <Button size="sm" variant="text" onClick={() => setExpandTouch(!expandTouch)}>{expandTouch ? 'Hide options' : '+ options'}</Button>
          </div>
          {expandTouch && (
            <div className="row" style={{ marginTop: 6, gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="row" style={{ gap: 4 }}>
                {['call', 'text', 'email'].map(ch => (
                  <button key={ch} className={`sub-tab ${touchChannel === ch ? 'active' : ''}`} style={{ fontSize: 'var(--text-micro)' }} onClick={() => setTouchChannel(ch)}>
                    {ch}
                  </button>
                ))}
              </div>
              <label style={{ fontSize: 'var(--text-micro)' }} className="muted">
                Next follow-up: <input type="date" value={touchNextFollowUp} onChange={e => setTouchNextFollowUp(e.target.value)} style={{ width: 130 }} />
              </label>
            </div>
          )}
          {relationshipTriggers.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <button className="row-remove-btn" aria-label="Toggle triggers" onClick={() => setShowTriggers(!showTriggers)} style={{ fontSize: 'var(--text-micro)', textDecoration: 'underline' }}>
                {showTriggers ? 'Hide' : 'Worth noting?'}
              </button>
              {showTriggers && (
                <div className="stack" style={{ marginTop: 4, gap: 4 }}>
                  {relationshipTriggers.map(t => (
                    <div key={t.id} style={{ fontSize: 'var(--text-micro)' }}>
                      <strong>{t.situation}:</strong> <span className="muted">{t.script_text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ---------- Contact info ---------- */}
        <div>
          <div className="row-between">
            <div className="section-label" style={{ fontSize: 'var(--text-caption)' }}>Contact info</div>
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
            <div className="stack" style={{ marginTop: 4, fontSize: 'var(--text-small)', gap: 4 }}>
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

        {/* ---------- Follow-up ---------- */}
        <div>
          <div className="row-between">
            <div className="section-label" style={{ fontSize: 'var(--text-caption)' }}>Follow-up</div>
            <Button size="sm" variant="text" onClick={() => setEditingFollowUp(!editingFollowUp)}>{editingFollowUp ? 'Cancel' : 'Edit'}</Button>
          </div>
          {standard && (
            <div className="muted" style={{ fontSize: 'var(--text-micro)', marginTop: 2 }}>
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
            <div style={{ marginTop: 4, fontSize: 'var(--text-small)' }}>
              {contact.next_action || <span className="muted">No next action set</span>}
              {contact.next_follow_up_date && <div className="muted" style={{ fontSize: 'var(--text-caption)' }}>Due {contact.next_follow_up_date}</div>}
              {contact.last_contact_date && <div className="muted" style={{ fontSize: 'var(--text-caption)' }}>Last contacted {contact.last_contact_date}</div>}
            </div>
          )}
        </div>

        <div className="row" style={{ gap: 'var(--space-2)' }}>
          <div style={{ flex: 1 }}>
            <div className="section-label" style={{ fontSize: 'var(--text-micro)' }}>Relationship tier</div>
            <select style={{ marginTop: 4, width: '100%' }} value={contact.relationship_tier || ''} onChange={e => applyField({ relationship_tier: e.target.value || null })}>
              <option value="">No tier set</option>
              {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <div className="section-label" style={{ fontSize: 'var(--text-micro)' }}>Prefers</div>
            <select style={{ marginTop: 4, width: '100%' }} value={contact.preferred_contact_method || 'text'} onChange={e => applyField({ preferred_contact_method: e.target.value })}>
              <option value="text">Text</option>
              <option value="email">Email</option>
              <option value="call_scheduled">Scheduled calls only</option>
            </select>
          </div>
        </div>

        {/* ---------- Buyer/seller profile ---------- */}
        {isTransactionCategory && (
          <div>
            <div className="row-between">
              <div className="section-label" style={{ fontSize: 'var(--text-caption)' }}>Buyer/seller profile</div>
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
              <div className="stack" style={{ marginTop: 4, fontSize: 'var(--text-small)', gap: 4 }}>
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
            <div className="section-label" style={{ fontSize: 'var(--text-caption)' }}>Notes</div>
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
            <div className="stack" style={{ marginTop: 4, fontSize: 'var(--text-small)', gap: 4 }}>
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

        {/* ---------- Client Discovery Framework (System 08, Phase 1) ---------- */}
        <div>
          <div className="row-between">
            <div className="section-label" style={{ fontSize: 'var(--text-caption)' }}>Discovery</div>
            <Button size="sm" variant="text" onClick={() => setEditingDiscovery(!editingDiscovery)}>{editingDiscovery ? 'Cancel' : 'Edit'}</Button>
          </div>
          {editingDiscovery ? (
            <div className="stack" style={{ marginTop: 'var(--space-2)' }}>
              <textarea placeholder="Situation — where are they now, moving from, why, timeline?" value={discoveryForm.discovery_situation}
                onChange={e => setDiscoveryForm({ ...discoveryForm, discovery_situation: e.target.value })} style={{ minHeight: 44 }} />
              <textarea placeholder="Lifestyle priorities — work location, schools, family, commute" value={discoveryForm.discovery_lifestyle_priorities}
                onChange={e => setDiscoveryForm({ ...discoveryForm, discovery_lifestyle_priorities: e.target.value })} style={{ minHeight: 44 }} />
              <textarea placeholder="Financial reality — comfortable monthly payment, not just price range" value={discoveryForm.discovery_financial_reality}
                onChange={e => setDiscoveryForm({ ...discoveryForm, discovery_financial_reality: e.target.value })} style={{ minHeight: 44 }} />
              <textarea placeholder="Decision factors — must-haves, deal-breakers, biggest concerns" value={discoveryForm.discovery_decision_factors}
                onChange={e => setDiscoveryForm({ ...discoveryForm, discovery_decision_factors: e.target.value })} style={{ minHeight: 44 }} />
              <div><Button size="sm" onClick={handleSaveDiscovery}>Save</Button></div>
            </div>
          ) : (
            <div className="stack" style={{ marginTop: 4, fontSize: 'var(--text-small)', gap: 4 }}>
              {contact.discovery_situation && <div><strong>Situation:</strong> {contact.discovery_situation}</div>}
              {contact.discovery_lifestyle_priorities && <div><strong>Lifestyle:</strong> {contact.discovery_lifestyle_priorities}</div>}
              {contact.discovery_financial_reality && <div><strong>Financial reality:</strong> {contact.discovery_financial_reality}</div>}
              {contact.discovery_decision_factors && <div><strong>Decision factors:</strong> {contact.discovery_decision_factors}</div>}
              {!contact.discovery_situation && !contact.discovery_lifestyle_priorities && !contact.discovery_financial_reality && !contact.discovery_decision_factors && (
                <span className="muted">Nothing recorded yet.</span>
              )}
            </div>
          )}
        </div>

        <div className="row" style={{ gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <Link to={`/business/flows/consultation?contact=${contact.id}`}><Button size="sm" variant="ghost">Consultation</Button></Link>
          <Button size="sm" variant="ghost" onClick={handleDraftFollowUp} disabled={drafting}>{drafting ? 'Drafting…' : <><Sparkles size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Draft follow-up</>}</Button>
          <Button size="sm" variant="text" onClick={handleDelete}>Delete</Button>
        </div>
        {draft && (
          <AiSuggestionBox unavailable={draft.unavailable} onDismiss={() => setDraft(null)}>
            <div style={{ fontSize: 'var(--text-small)' }}>{draft.message}</div>
            {draft.channel && <div className="muted" style={{ fontSize: 'var(--text-micro)', marginTop: 4 }}>{draft.channel}</div>}
          </AiSuggestionBox>
        )}

        <InteractionTimeline contact={contact} />

        <div className="muted" style={{ fontSize: 'var(--text-micro)', borderTop: '1px solid var(--sand)', paddingTop: 'var(--space-2)' }}>
          Added {contact.date_added || contact.created_at?.slice(0, 10)}
        </div>
      </div>
    </SidePanel>
  );
}