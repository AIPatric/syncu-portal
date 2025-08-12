// /pages/api/finalize.js
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST' });

  const { kundeId, rolleId, batchId, files } = req.body || {};
  if (!kundeId || !rolleId || !batchId || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'kundeId, rolleId, batchId und files sind Pflicht.' });
    }

  const rows = files.map(f => ({
    kunde_id: kundeId,
    rolle_id: rolleId,
    storage_path: f.path,           // Pfad im Bucket
    file_url: f.publicUrl || null,  // nur falls Bucket public ist
    original_name: f.originalName,
    status: 'pending',
    batch_id: batchId,
  }));

  const { error } = await supabaseAdmin.from('upload_queue').insert(rows);
  if (error) return res.status(500).json({ error: 'Queue-Eintrag fehlgeschlagen.' });

  return res.status(200).json({ success: true, count: rows.length });
}
