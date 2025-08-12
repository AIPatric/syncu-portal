// /pages/api/finalize.js
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST' });

  try {
    const { kundeId, rolleId, batchId, files, service } = req.body || {};
    if (!kundeId || !rolleId || !batchId || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'kundeId, rolleId, batchId und files sind Pflicht.' });
    }

    const now = new Date().toISOString();

    const rows = files.map(f => ({
      kunde_id: kundeId,
      rolle_id: rolleId,
      storage_path: f.path,                 // Pfad im Bucket (wichtig)
      file_url: f.publicUrl || null,        // nur falls Bucket public
      original_name: f.originalName || null,
      status: 'pending',
      batch_id: batchId,
      service: service || null,             // 'objektunterlagen' | 'bonitaet'
      created_at: now,
    }));

    const { error } = await supabaseAdmin.from('upload_queue').insert(rows);

    if (error) {
      console.error('[finalize] insert error:', error);
      return res.status(500).json({ error: error.message || 'Queue-Eintrag fehlgeschlagen.' });
    }

    return res.status(200).json({ success: true, count: rows.length });
  } catch (e) {
    console.error('[finalize] unexpected error:', e);
    return res.status(500).json({ error: 'Interner Fehler bei finalize.' });
  }
}
