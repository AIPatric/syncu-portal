// /pages/api/upload.js

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import multiparty from 'multiparty';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // Add CORS headers for better compatibility
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const form = new multiparty.Form();

  try {
    console.log('API: Anfrage empfangen.');
    
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('API: Multiparty Parse Error:', err);
          return reject(err);
        }
        resolve({ fields, files });
      });
    });

    // Multiparty gibt Felder als Arrays zurück, auch wenn nur ein Wert erwartet wird.
    const vorname = Array.isArray(fields.vorname) ? fields.vorname[0] : fields.vorname;
    const nachname = Array.isArray(fields.nachname) ? fields.nachname[0] : fields.nachname;
    const rolleName = Array.isArray(fields.rolleName) ? fields.rolleName[0] : fields.rolleName;

    console.log(`API: Felder empfangen - Vorname: ${vorname}, Nachname: ${nachname}, Rolle: ${rolleName}`);

    if (!vorname || !nachname || !rolleName) {
      console.error('API: Fehlende Pflichtfelder (Vorname, Nachname, Rolle).');
      return res.status(400).json({ error: 'Vorname, Nachname und Rolle sind Pflichtfelder.' });
    }

    const fileList = Array.isArray(files.file) ? files.file : (files.file ? [files.file] : []);
    console.log(`API: ${fileList.length} Datei(en) zum Hochladen.`);
    if (fileList.length === 0) {
      console.error('API: Keine Dateien zum Hochladen bereitgestellt.');
      return res.status(400).json({ error: 'Es wurden keine Dateien zum Hochladen bereitgestellt.' });
    }

    // 1. Finde rolle_id basierend auf dem übergebenen Rollennamen
    const { data: rolleData, error: rolleError } = await supabaseAdmin
      .from('rollen')
      .select('id')
      .eq('rolle', rolleName)
      .maybeSingle();

    if (rolleError) {
      console.error('API: Datenbankfehler bei der Rollensuche:', rolleError);
      return res.status(500).json({ error: 'Datenbankfehler bei der Rollensuche.' });
    }
    if (!rolleData) {
      console.error(`API: Rolle nicht gefunden: Der Eintrag '${rolleName}' existiert nicht in der Tabelle 'rollen'.`);
      return res.status(400).json({ error: `Rolle '${rolleName}' ist ungültig. Bitte überprüfen Sie die Datenbankeinträge.` });
    }
    const rolle_id = rolleData.id;
    console.log(`API: Rolle '${rolleName}' gefunden mit ID: ${rolle_id}`);

    // 2. Erstelle den Kunden und erhalte seine ID
    const { data: kundeData, error: kundeError } = await supabaseAdmin
      .from('kunden')
      .insert({ name: `${vorname} ${nachname}`, rolle_id })
      .select('id')
      .single();

    if (kundeError) {
      console.error('API: Fehler beim Einfügen des Kunden:', kundeError);
      return res.status(500).json({ error: 'Der Kunde konnte nicht in der Datenbank angelegt werden.' });
    }
    const kunde_id = kundeData.id;
    console.log(`API: Kunde '${vorname} ${nachname}' erstellt mit ID: ${kunde_id}`);

    // 3. Verarbeite alle Datei-Uploads parallel
    const uploadPromises = fileList.map(async (file) => {
      try {
        const fileData = await fs.readFile(file.path);
        const fileExt = file.originalFilename.split('.').pop();
        const fileName = `${kunde_id}/${uuidv4()}.${fileExt}`;
        
        console.log(`API: Starte Upload für Datei: ${file.originalFilename} zu ${fileName}`);
        const { error: storageError } = await supabaseAdmin.storage
          .from('upload')
          .upload(fileName, fileData, { 
            contentType: file.headers['content-type'] || 'application/octet-stream',
            upsert: false
          });

        // Cleanup: Temporäre Datei löschen
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.warn(`API: Warnung beim Löschen der temporären Datei ${file.path}:`, unlinkError);
        }

        if (storageError) {
          console.error(`API: Storage-Fehler für ${file.originalFilename}:`, storageError);
          throw new Error(`Fehler beim Upload von ${file.originalFilename}: ${storageError.message}`);
        }

        const { data: urlData } = supabaseAdmin.storage.from('upload').getPublicUrl(fileName);
        console.log(`API: Datei ${file.originalFilename} erfolgreich hochgeladen. URL: ${urlData.publicUrl}`);

        return {
          kunde_id,
          rolle_id,
          file_url: urlData.publicUrl,
          original_name: file.originalFilename,
          status: 'pending',
        };
      } catch (innerError) {
        console.error(`API: Fehler bei der Verarbeitung von Datei ${file.originalFilename}:`, innerError);
        throw innerError;
      }
    });

    const queueInserts = await Promise.all(uploadPromises);
    console.log(`API: Alle ${queueInserts.length} Dateien erfolgreich verarbeitet.`);

    // 4. Trage alle verarbeiteten Dateien gesammelt in die upload_queue ein
    const { error: queueError } = await supabaseAdmin.from('upload_queue').insert(queueInserts);

    if (queueError) {
      console.error('API: Fehler beim Eintragen in die Upload-Queue:', queueError);
      return res.status(500).json({ error: 'Die Dateien konnten nicht in die Verarbeitungswarteschlange eingetragen werden.' });
    }

    console.log('API: Alle Operationen erfolgreich abgeschlossen. Sende 200 OK.');
    return res.status(200).json({ 
      success: true, 
      message: `${fileList.length} Datei(en) erfolgreich hochgeladen und zur Verarbeitung vorgemerkt.` 
    });

  } catch (error) {
    console.error('API: Unerwarteter Fehler im Haupt-Try-Catch-Block:', error);
    
    // Ensure we always return a proper JSON response
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: error.message || 'Ein interner Serverfehler ist aufgetreten.',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
}
