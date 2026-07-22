import { supabase } from '../lib/supabaseClient.js';

// ============================================================
// IMAGE UPLOAD — generic, works anywhere an image could go.
// One shared bucket ('user-assets'), one function. Any future feature
// that needs an uploaded image (Guardian art, whatever comes next)
// calls uploadImage() with its own `folder` — no new bucket, no new
// migration, no new service.
//
// Defaults never require this at all: every image slot in the app
// falls back to a built-in, code-shipped default (SVG banner scenes,
// placeholder Guardian art, etc.) when nothing's been uploaded. This
// is purely an optional override layer, same as the paste-a-URL
// option it sits alongside.
// ============================================================

const BUCKET = 'user-assets';
const MAX_FILE_SIZE_MB = 5;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

/** Uploads a file to the shared bucket under this user's own folder,
 *  returns the public URL — ready to hand straight to setAssetSlot()
 *  or any other "store this URL" call. `folder` is just a subfolder
 *  for organization (e.g. 'banners', 'avatar', 'guardians' later) —
 *  it doesn't need to exist ahead of time. */
export async function uploadImage(file, folder = 'general') {
  if (!file) throw new Error('No file provided.');
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Unsupported file type. Use PNG, JPEG, WebP, GIF, or SVG.');
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    throw new Error(`File too large — max ${MAX_FILE_SIZE_MB}MB.`);
  }

  const userId = await getUserId();
  if (!userId) throw new Error('Not signed in.');

  const path = `${userId}/${folder}/${Date.now()}-${sanitizeFilename(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Best-effort cleanup — deletes a previously uploaded file given its
 *  public URL. Safe to call on URLs that aren't actually in this
 *  bucket (e.g. a pasted external link); it just won't find anything
 *  to delete. Never throws — losing an old, orphaned file is harmless,
 *  it should never block whatever real action triggered this. */
export async function deleteUploadedImage(publicUrl) {
  if (!publicUrl || !publicUrl.includes(`/${BUCKET}/`)) return;
  try {
    const path = publicUrl.split(`/${BUCKET}/`)[1];
    if (path) await supabase.storage.from(BUCKET).remove([path]);
  } catch {
    // non-critical
  }
}
