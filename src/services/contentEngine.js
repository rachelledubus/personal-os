import { supabase } from '../lib/supabaseClient.js';
import { logActivity } from './goals.js';
import { getCustomAiInstructions } from './settings.js';

// ============================================================
// CONTENT ENGINE (System 03)
// One flagship piece never stays one piece — it becomes an email
// line, an Instagram carousel, a Facebook answer, a partner resource.
// This is that pipeline, real instead of a bare checklist.
// ============================================================

const REPURPOSE_FORMATS = ['email', 'instagram', 'facebook', 'video', 'partner_resource'];

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export async function listContentPieces(status = null) {
  const userId = await getUserId();
  let q = supabase.from('content_pieces').select('*, content_repurpose_items(*)').eq('user_id', userId).order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function getContentPiece(id) {
  const { data, error } = await supabase.from('content_pieces').select('*, content_repurpose_items(*)').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function addContentPiece(fields) {
  const userId = await getUserId();
  const { data, error } = await supabase.from('content_pieces').insert({ ...fields, user_id: userId }).select().single();
  if (error) throw error;
  return data;
}

export async function updateContentPiece(id, fields) {
  const { error } = await supabase.from('content_pieces').update(fields).eq('id', id);
  if (error) throw error;
}

export async function advanceStatus(id, status) {
  const fields = { status };
  if (status === 'published') fields.published_date = new Date().toISOString().slice(0, 10);
  await updateContentPiece(id, fields);
  if (status === 'published') await logActivity('content_items', id, 'published');
}

/** Creates the 5 empty repurpose slots for a piece once it's
 *  published — this is what "repurpose into 2+ formats" actually
 *  tracks against, instead of being a checklist item nobody checks. */
export async function initRepurposeSlots(contentPieceId) {
  const userId = await getUserId();
  const { data: existing } = await supabase.from('content_repurpose_items').select('format').eq('content_piece_id', contentPieceId);
  const existingFormats = new Set((existing || []).map(e => e.format));
  const rows = REPURPOSE_FORMATS.filter(f => !existingFormats.has(f)).map(format => ({
    user_id: userId, content_piece_id: contentPieceId, format,
  }));
  if (rows.length > 0) await supabase.from('content_repurpose_items').insert(rows);
}

export async function markRepurposed(id, notes = null) {
  const { error } = await supabase.from('content_repurpose_items')
    .update({ published: true, published_at: new Date().toISOString(), notes }).eq('id', id);
  if (error) throw error;
}

/** AI drafts the derivative formats from the flagship piece — the
 *  actual A3/P5 "repurposing waterfall" workflow. Returns null (rather
 *  than throwing) if the function isn't deployed, same
 *  graceful-degrade pattern as every other AI feature in the app. */
export async function requestRepurposeDrafts(piece) {
  try {
    const customInstructions = await getCustomAiInstructions();
    const res = await fetch('/.netlify/functions/repurpose-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: piece.title,
        buyerQuestion: piece.buyer_question,
        audience: piece.audience,
        customInstructions,
      }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Expands a brief into a full draft — "automated" half of Sprint B.
 *  Same graceful-degrade contract as every other AI feature: null if
 *  the function isn't deployed, never a thrown error the caller has
 *  to handle specially. */
export async function requestDraftExpansion(piece) {
  try {
    const customInstructions = await getCustomAiInstructions();
    const res = await fetch('/.netlify/functions/draft-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ piece, customInstructions }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** "Pull from a library of content ideas" — reuses the existing
 *  Prompt Library (Business -> Library) rather than building a
 *  second, parallel template store. A prompt tagged with category
 *  "Content Template" doubles as a content brief starter: its
 *  prompt_text becomes the seed for goal/trade_off, title/use_for
 *  become title/audience hints. No new table. */
export async function listContentTemplates() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('prompts').select('*')
    .eq('user_id', userId).eq('category', 'Content Template').order('title');
  if (error) throw error;
  return data || [];
}

/** The other "pull from" source: ideas already sitting in the
 *  pipeline with status 'idea' — the real ideas library was already
 *  here, just not browsable as one. */
export async function listContentIdeas() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('content_pieces').select('*')
    .eq('user_id', userId).eq('status', 'idea').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
