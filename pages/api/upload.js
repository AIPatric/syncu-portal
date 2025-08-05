// /pages/api/upload.js

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { IncomingForm } from 'formidable';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  console.log('[API] Upload endpoint aufgerufen');

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const form = new IncomingForm({ multiples: true });

  try {
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve([fields, files]);
      });
    });

    const { vorname, nachname, rolleName } = fields;
    if (!vorname || !nachname || !rolleName) {
      return res.status(400).json({ error: 'Vorname, Nachname und Rolle sind Pflichtfelder.' });
    }

    const fileList = Array.isArray(files.file)
      ? files.file
      : files.file
      ? [files.file]
      : [];

    if (fileList.length === 0) {
      return res.status(400).json({ error: 'Es wurden keine Dateien hochgeladen.' });
    }

    // Rolle suchen
    const { data: rolleData, error: rolleError } = await supabaseAdmin
      .from('rollen')
      .select('id')
      .eq('rolle', rolleName)
      .maybeSingle();

    if (rolleError) {
      console.error('[API] Fehler beim Laden der Rolle:', rolleError);
      return res.status(500).json({ error: 'Fehler beim Abrufen der Rolle.' });
    }

    if (!rolleData) {
      return res.status(400).json({ error: `Rolle '${rolleName}' existiert nicht.` });
    }

    const rolle_id = rolleData.id;

    // Kunde anlegen
    const { data: kundeData, error: kundeError } = await supabaseAdmin
      .from('kunden')
      .insert({ name: `${vorname} ${nachname}`, rolle_id })
      .select('id')
      .single();

    if (kundeError) {
      console.error('[API] Fehler beim Anlegen des Kunden:', kundeError);
      return res.status(500).json({ error: 'Kunde konnte nicht angelegt werden.' });
    }

    const kunde_id = kundeData.id;

    // Dateien hochladen
    const uploadPromises = fileList.map(async (file) => {
      const fileData = await fs.readFile(file.filepath);
      const fileExt = file.originalFilename.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const storagePath = `${kunde_id}/${fileName}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('upload')
        .upload(storagePath, fileData, {
          contentType: file.mimetype,
        });

      // Tempfile löschen
      await fs.unlink(file.filepath).catch(() => null);

      if (uploadError) {
        throw new Error(`Fehler beim Upload von ${file.originalFilename}: ${uploadError.message}`);
      }

      const { data: urlData } = supabaseAdmin.storage
        .from('upload')
        .getPublicUrl(storagePath);

      return {
        kunde_id,
        rolle_id,
        file_url: urlData?.publicUrl || '',
        original_name: file.originalFilename,
        status: 'pending',
      };
    });

    const queueInserts = await Promise.all(uploadPromises);

    const { error: insertError } = await supabaseAdmin
      .from('upload_queue')
      .insert(queueInserts);

    if (insertError) {
      console.error('[API] Fehler beim Eintragen in upload_queue:', insertError);
      return res.status(500).json({ error: 'Upload erfolgreich, aber Queue-Eintrag fehlgeschlagen.' });
    }

    return res.status(200).json({
      success: true,
      message: `${fileList.length} Datei(en) erfolgreich hochgeladen.`,
    });
  } catch (error) {
    console.error('[API] Unerwarteter Fehler:', error);

    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Ein interner Fehler ist aufgetreten. Bitte erneut versuchen.',
      });
    }

    // Falls schon gesendet, abbrechen
    return;
  }
}
