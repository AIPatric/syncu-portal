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
        if (err) return reject(err);
        resolve([fields, files]);
      });
    });

    const { vorname, nachname, rolleName } = fields;
    if (!vorname || !nachname || !rolleName) {
      return res.status(400).json({ error: 'Vorname, Nachname und Rolle sind Pflichtfelder.' });
    }

    const fileList = Array.isArray(files.file) ? files.file : (files.file ? [files.file] : []);
    if (fileList.length === 0) {
      return res.status(400).json({ error: 'Es wurden keine Dateien zum Hochladen bereitgestellt.' });
    }

    const { data: rolleData, error: rolleError } = await supabaseAdmin
      .from('rollen')
      .select('id')
      .eq('rolle', rolleName)
      .maybeSingle();

    if (rolleError) {
      console.error('Datenbankfehler bei der Rollensuche:', rolleError);
      return res.status(500).json({ error: 'Datenbankfehler bei der Rollensuche.' });
    }
    if (!rolleData) {
      return res.status(400).json({ error: `Rolle '${rolleName}' ist ungültig.` });
    }
    const rolle_id = rolleData.id;

    const { data: kundeData, error: kundeError } = await supabaseAdmin
      .from('kunden')
      .insert({ name: `${vorname} ${nachname}`, rolle_id })
      .select('id')
      .single();

    if (kundeError) {
      console.error('Fehler beim Einfügen des Kunden:', kundeError);
      return res.status(500).json({ error: 'Kunde konnte nicht angelegt werden.' });
    }
    const kunde_id = kundeData.id;

    const uploadResults = await Promise.all(
      fileList.map(async (file) => {
        try {
          const fileData = await fs.readFile(file.filepath);
          const fileExt = file.originalFilename.split('.').pop();
          const fileName = `${uuidv4()}.${fileExt}`;
          const storagePath = `${kunde_id}/${fileName}`;

          const { error: storageError } = await supabaseAdmin.storage
            .from('upload')
            .upload(storagePath, fileData, { contentType: file.mimetype });

          await fs.unlink(file.filepath);

          if (storageError) {
            console.error(`Fehler beim Upload von ${file.originalFilename}:`, storageError);
            throw new Error(`Fehler beim Upload von ${file.originalFilename}`);
          }

          const { data: urlData } = supabaseAdmin.storage
            .from('upload')
            .getPublicUrl(storagePath);

          return {
            success: true,
            data: {
              kunde_id,
              rolle_id,
              file_url: urlData.publicUrl,
              original_name: file.originalFilename,
              status: 'pending',
            }
          };
        } catch (error) {
          console.error('Upload-Fehler:', error.message);
          return { success: false, error: error.message };
        }
      })
    );

    const validUploads = uploadResults.filter(result => result.success).map(r => r.data);

    if (validUploads.length > 0) {
      const { error: queueError } = await supabaseAdmin.from('upload_queue').insert(validUploads);
      if (queueError) {
        console.error('Fehler bei insert upload_queue:', queueError);
        return res.status(500).json({ error: 'Upload-Queue konnte nicht aktualisiert werden.' });
      }
    }

    const failed = uploadResults.filter(r => !r.success);
    const response = {
      success: true,
      message: `${validUploads.length} Datei(en) erfolgreich hochgeladen.`,
      fehler: failed.map(f => f.error),
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Unerwarteter Serverfehler:', error);
    return res.status(500).json({ error: error.message || 'Ein Serverfehler ist aufgetreten.' });
  }
}
