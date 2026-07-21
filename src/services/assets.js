import { supabase } from '../lib/supabaseClient.js';
import { addDevLogEntry } from './devMemory.js';

// ============================================================
// ASSET SLOTS
// URL-based, not file upload. Paste a link to an image you've already
// hosted anywhere (Google Drive share link, Imgur, etc.) and assign
// it to a slot — swaps a decorative graphic without touching code.
// Components read their slot via getAssetUrl() and fall back to their
// built-in SVG when nothing's assigned.
// ============================================================

export const ASSET_SLOTS = [
  { key: 'profile_avatar', label: 'Profile avatar (SideNav)', usedIn: 'Every page — top of the sidebar' },
  { key: 'today_mascot', label: 'Today page mascot', usedIn: 'Today — empty states' },
  { key: 'business_mascot', label: 'Business page mascot', usedIn: 'Business — Dashboard card' },
  { key: 'grow_mascot', label: 'Grow page mascot', usedIn: 'Grow — empty states' },
  { key: 'meal_planner_graphic', label: 'Meal Planner graphic', usedIn: 'Plan — Meal Planner' },
  { key: 'workout_graphic', label: 'Workout graphic', usedIn: 'Grow — Workouts' },
  { key: 'library_graphic', label: 'Library graphic', usedIn: 'Library' },
];

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export async function listAssetSlots() {
  const userId = await getUserId();
  const { data, error } = await supabase.from('asset_slots').select('*').eq('user_id', userId);
  if (error) throw error;
  const byKey = Object.fromEntries((data || []).map(a => [a.slot_key, a]));
  return ASSET_SLOTS.map(slot => ({ ...slot, image_url: byKey[slot.key]?.image_url || null }));
}

export async function setAssetSlot(slotKey, imageUrl) {
  const userId = await getUserId();
  const { error } = await supabase.from('asset_slots').upsert({
    user_id: userId, slot_key: slotKey, image_url: imageUrl || null, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,slot_key' });
  if (error) throw error;
  const label = ASSET_SLOTS.find(s => s.key === slotKey)?.label || slotKey;
  await addDevLogEntry('config', imageUrl ? `Assigned a custom image to "${label}"` : `Reset "${label}" to the built-in artwork`);
}

/** What a decorative component actually calls — returns the assigned
 *  URL or null (meaning: use the built-in SVG, nothing's broken). */
export async function getAssetUrl(slotKey) {
  const userId = await getUserId();
  const { data } = await supabase.from('asset_slots').select('image_url')
    .eq('user_id', userId).eq('slot_key', slotKey).maybeSingle();
  return data?.image_url || null;
}
