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
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const form = new IncomingForm({ multiples: true });

  try {
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
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
      return res.status(400).json({ error: 'Es wurden keine Dateien übergeben.' });
    }

    // Rolle ID ermitteln
    const { data: rolleData, error: rolleError } = await supabaseAdmin
      .from('rollen')
      .select('id')
      .eq('rolle', rolleName)
      .maybeSingle();

    if (rolleError) {
      console.error('Fehler bei Rollensuche:', rolleError);
      return res.status(500).json({ error: 'Fehler bei der Rollensuche.' });
    }

    if (!rolleData) {
      return res.status(400).json({ error: `Rolle '${rolleName}' nicht gefunden.` });
    }

    const rolle_id = rolleData.id;

    // Kunde eintragen
    const { data: kundeData, error: kundeError } = await supabaseAdmin
      .from('kunden')
      .insert({ name: `${vorname} ${nachname}`, rolle_id })
      .select('id')
      .single();

    if (kundeError) {
      console.error('Fehler beim Kundeneintrag:', kundeError);
      return res.status(500).json({ error: 'Kunde konnte nicht angelegt werden.' });
    }

    const kunde_id = kundeData.id;

    // Dateien verarbeiten und hochladen
    const uploadResults = await Promise.all(
      fileList.map(async (file) => {
        const fileData = await fs.readFile(file.filepath);
        const fileExt = file.originalFilename.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const storagePath = `${kunde_id}/${fileName}`;

        const { error: storageError } = await supabaseAdmin.storage
          .from('upload')
          .upload(storagePath, fileData, {
            contentType: file.mimetype,
          });

        await fs.unlink(file.filepath); // Temp-Datei löschen

        if (storageError) {
          throw new Error(`Upload-Fehler bei ${file.originalFilename}: ${storageError.message}`);
        }

        const { data: publicData } = supabaseAdmin.storage
          .from('upload')
          .getPublicUrl(storagePath);

        return {
          kunde_id,
          rolle_id,
          file_url: publicData.publicUrl,
          original_name: file.originalFilename,
          status: 'pending',
        };
      })
    );

    const { error: insertError } = await supabaseAdmin
      .from('upload_queue')
      .insert(uploadResults);

    if (insertError) {
      console.error('Fehler beim Schreiben in upload_queue:', insertError);
      return res.status(500).json({ error: 'Upload-Queue konnte nicht beschrieben werden.' });
    }

    return res.status(200).json({
      success: true,
      message: `${fileList.length} Datei(en) erfolgreich hochgeladen.`,
    });
  } catch (err) {
    console.error('Unerwarteter Fehler im Upload-Handler:', err);
    return res.status(500).json({
      error: err.message || 'Ein interner Fehler ist aufgetreten.',
    });
  }
}
