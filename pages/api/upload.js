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

    // 1. Finde rolle_id basierend auf dem übergebenen Rollennamen
    // WICHTIGE ÄNDERUNG: .maybeSingle() statt .single() verwenden und manuell prüfen
    const { data: rolleData, error: rolleError } = await supabaseAdmin
      .from('rollen')
      .select('id')
      .eq('rolle', rolleName)
      .maybeSingle(); // Erlaubt, dass keine Zeile gefunden wird, ohne einen Fehler zu werfen.

    // Explizite Fehlerprüfung: Gab es einen DB-Fehler ODER wurde die Rolle einfach nicht gefunden?
    if (rolleError) {
      console.error('Datenbankfehler bei der Rollensuche:', rolleError);
      return res.status(500).json({ error: 'Datenbankfehler bei der Rollensuche.' });
    }
    if (!rolleData) {
      console.error(`Rolle nicht gefunden: Der Eintrag '${rolleName}' existiert nicht in der Tabelle 'rollen'.`);
      // Gib eine klare Fehlermeldung an den Client zurück
      return res.status(400).json({ error: `Rolle '${rolleName}' ist ungültig. Bitte überprüfen Sie die Datenbankeinträge.` });
    }
    const rolle_id = rolleData.id;

    // 2. Erstelle den Kunden und erhalte seine ID
    const { data: kundeData, error: kundeError } = await supabaseAdmin
      .from('kunden')
      .insert({ name: `${vorname} ${nachname}`, rolle_id })
      .select('id')
      .single();

    if (kundeError) {
      console.error('Fehler beim Einfügen des Kunden:', kundeError);
      return res.status(500).json({ error: 'Der Kunde konnte nicht in der Datenbank angelegt werden.' });
    }
    const kunde_id = kundeData.id;

    // 3. Verarbeite alle Datei-Uploads parallel
    const uploadPromises = fileList.map(async (file) => {
      const fileData = await fs.readFile(file.filepath);
      const fileExt = file.originalFilename.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const storagePath = `${kunde_id}/${fileName}`;

      const { error: storageError } = await supabaseAdmin.storage
        .from('upload')
        .upload(storagePath, fileData, { contentType: file.mimetype });

      await fs.unlink(file.filepath);

      if (storageError) {
        throw new Error(`Fehler beim Upload von ${file.originalFilename}: ${storageError.message}`);
      }

      const { data: urlData } = supabaseAdmin.storage.from('upload').getPublicUrl(storagePath);

      return {
        kunde_id,
        rolle_id,
        file_url: urlData.publicUrl,
        original_name: file.originalFilename,
        status: 'pending',
      };
    });

    const queueInserts = await Promise.all(uploadPromises);

    // 4. Trage alle verarbeiteten Dateien gesammelt in die upload_queue ein
    const { error: queueError } = await supabaseAdmin.from('upload_queue').insert(queueInserts);

    if (queueError) {
      console.error('Fehler beim Eintragen in die Upload-Queue:', queueError);
      return res.status(500).json({ error: 'Die Dateien konnten nicht in die Verarbeitungswarteschlange eingetragen werden.' });
    }

    return res.status(200).json({ success: true, message: `${fileList.length} Datei(en) erfolgreich hochgeladen und zur Verarbeitung vorgemerkt.` });

  } catch (error) {
    console.error('Unerwarteter Serverfehler:', error);
    return res.status(500).json({ error: error.message || 'Ein interner Serverfehler ist aufgetreten.' });
  }
}
