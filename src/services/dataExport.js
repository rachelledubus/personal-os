import { supabase } from '../lib/supabaseClient.js';

// ============================================================
// DATA EXPORT
// Downloads your core data as one JSON file — a real backup, kept
// simple on purpose. Import/restore is deliberately NOT built yet:
// restoring data has real corruption/overwrite risk that deserves its
// own careful pass rather than being rushed in alongside everything
// else this session. Export is safe (read-only) and fully built.
// ============================================================

const EXPORT_TABLES = [
  'contacts', 'content_pieces', 'content_repurpose_items', 'transactions',
  'goals', 'projects', 'tasks', 'roadmap_items', 'ctas', 'scripts', 'prompts',
  'product_backlog_ideas', 'maintenance_items', 'finance_entries', 'notes',
];

export async function exportAllData() {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  const results = await Promise.all(
    EXPORT_TABLES.map(table => supabase.from(table).select('*').eq('user_id', userId))
  );

  const bundle = { exported_at: new Date().toISOString(), user_id: userId, tables: {} };
  EXPORT_TABLES.forEach((table, i) => {
    bundle.tables[table] = results[i].data || [];
  });
  return bundle;
}

export function downloadAsFile(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
