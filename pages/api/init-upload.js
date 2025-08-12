// /pages/api/init-upload.js
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST allowed' });

  try {
    const { vorname, nachname, rolleName } = req.body || {};
    if (!vorname || !nachname || !rolleName) {
      return res.status(400).json({ error: 'Vorname, Nachname, Rolle sind Pflicht.' });
    }

    // Rolle holen
    const { data: rolleData, error: rolleError } = await supabaseAdmin
      .from('rollen')
      .select('id')
      .eq('rolle', rolleName)
      .maybeSingle();

    if (rolleError) {
      console.error('[init-upload] Rollen-Query Fehler:', rolleError);
      return res.status(500).json({ error: 'Fehler beim Abrufen der Rolle.' });
    }
    if (!rolleData) {
      return res.status(400).json({ error: `Rolle '${rolleName}' existiert nicht.` });
    }

    // Kunde anlegen
    const { data: kundeData, error: kundeError } = await supabaseAdmin
      .from('kunden')
      .insert({ name: `${vorname} ${nachname}`, rolle_id: rolleData.id })
      .select('id')
      .single();

    if (kundeError) {
      console.error('[init-upload] Kunde anlegen Fehler:', kundeError);
      return res.status(500).json({ error: 'Kunde konnte nicht angelegt werden.' });
    }

    const batchId = uuidv4();

    return res.status(200).json({
      kundeId: kundeData.id,
      rolleId: rolleData.id,
      batchId,
    });
  } catch (e) {
    console.error('[init-upload] Unerwarteter Fehler:', e);
    return res.status(500).json({ error: 'Interner Fehler bei init-upload.' });
  }
}
