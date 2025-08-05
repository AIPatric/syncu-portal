// /pages/api/upload.js - Verbesserte Version für Vercel

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { IncomingForm } from 'formidable';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    bodyParser: false,
    // Vercel-spezifische Einstellungen
    externalResolver: true,
  },
};

export default async function handler(req, res) {
  // CORS Headers für Vercel
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

  // Logging für Debugging
  console.log('Upload API called:', {
    method: req.method,
    headers: req.headers,
    url: req.url,
  });

  try {
    // Formidable konfigurieren für Vercel
    const form = new IncomingForm({
      multiples: true,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      uploadDir: '/tmp', // Vercel tmp directory
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('Formidable parse error:', err);
          return reject(err);
        }
        console.log('Parsed fields:', fields);
        console.log('Parsed files:', Object.keys(files));
        resolve([fields, files]);
      });
    });

    // Fields können Arrays sein in Vercel, daher normalisieren
    const vorname = Array.isArray(fields.vorname) ? fields.vorname[0] : fields.vorname;
    const nachname = Array.isArray(fields.nachname) ? fields.nachname[0] : fields.nachname;
    const rolleName = Array.isArray(fields.rolleName) ? fields.rolleName[0] : fields.rolleName;

    console.log('Normalized fields:', { vorname, nachname, rolleName });

    if (!vorname || !nachname || !rolleName) {
      return res.status(400).json({ 
        error: 'Vorname, Nachname und Rolle sind Pflichtfelder.',
        received: { vorname, nachname, rolleName }
      });
    }

    const fileList = Array.isArray(files.file) ? files.file : (files.file ? [files.file] : []);
    console.log('File list length:', fileList.length);
    
    if (fileList.length === 0) {
      return res.status(400).json({ error: 'Es wurden keine Dateien zum Hochladen bereitgestellt.' });
    }

    // 1. Rolle finden
    console.log('Searching for role:', rolleName);
    const { data: rolleData, error: rolleError } = await supabaseAdmin
      .from('rollen')
      .select('id')
      .eq('rolle', rolleName)
      .maybeSingle();

    if (rolleError) {
      console.error('Datenbankfehler bei der Rollensuche:', rolleError);
      return res.status(500).json({ 
        error: 'Datenbankfehler bei der Rollensuche.',
        details: rolleError.message 
      });
    }
    
    if (!rolleData) {
      console.error(`Rolle nicht gefunden: ${rolleName}`);
      return res.status(400).json({ 
        error: `Rolle '${rolleName}' ist ungültig. Bitte überprüfen Sie die Datenbankeinträge.` 
      });
    }
    
    const rolle_id = rolleData.id;
    console.log('Found role ID:', rolle_id);

    // 2. Kunde erstellen
    console.log('Creating customer:', `${vorname} ${nachname}`);
    const { data: kundeData, error: kundeError } = await supabaseAdmin
      .from('kunden')
      .insert({ name: `${vorname} ${nachname}`, rolle_id })
      .select('id')
      .single();

    if (kundeError) {
      console.error('Fehler beim Einfügen des Kunden:', kundeError);
      return res.status(500).json({ 
        error: 'Der Kunde konnte nicht in der Datenbank angelegt werden.',
        details: kundeError.message 
      });
    }
    
    const kunde_id = kundeData.id;
    console.log('Created customer ID:', kunde_id);

    // 3. Dateien verarbeiten
    const uploadPromises = fileList.map(async (file, index) => {
      try {
        console.log(`Processing file ${index + 1}:`, file.originalFilename);
        
        const fileData = await fs.readFile(file.filepath);
        const fileExt = file.originalFilename.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const storagePath = `${kunde_id}/${fileName}`;

        console.log('Uploading to storage path:', storagePath);
        
        const { error: storageError } = await supabaseAdmin.storage
          .from('upload')
          .upload(storagePath, fileData, { 
            contentType: file.mimetype,
            cacheControl: '3600',
          });

        // Cleanup temp file
        try {
          await fs.unlink(file.filepath);
        } catch (unlinkError) {
          console.warn('Could not delete temp file:', unlinkError);
        }

        if (storageError) {
          console.error('Storage error:', storageError);
          throw new Error(`Fehler beim Upload von ${file.originalFilename}: ${storageError.message}`);
        }

        const { data: urlData } = supabaseAdmin.storage.from('upload').getPublicUrl(storagePath);
        
        console.log('File uploaded successfully:', urlData.publicUrl);

        return {
          kunde_id,
          rolle_id,
          file_url: urlData.publicUrl,
          original_name: file.originalFilename,
          status: 'pending',
        };
      } catch (fileError) {
        console.error(`Error processing file ${file.originalFilename}:`, fileError);
        throw fileError;
      }
    });

    console.log('Processing all files...');
    const queueInserts = await Promise.all(uploadPromises);

    // 4. Queue eintragen
    console.log('Inserting into upload queue:', queueInserts.length, 'items');
    const { error: queueError } = await supabaseAdmin.from('upload_queue').insert(queueInserts);

    if (queueError) {
      console.error('Fehler beim Eintragen in die Upload-Queue:', queueError);
      return res.status(500).json({ 
        error: 'Die Dateien konnten nicht in die Verarbeitungswarteschlange eingetragen werden.',
        details: queueError.message 
      });
    }

    console.log('Upload successful');
    
    // Erfolgreiche Response
    return res.status(200).json({ 
      success: true, 
      message: `${fileList.length} Datei(en) erfolgreich hochgeladen und zur Verarbeitung vorgemerkt.`,
      kunde_id,
      rolle_id 
    });

  } catch (error) {
    console.error('Unerwarteter Serverfehler:', error);
    
    // Detaillierte Fehlerantwort
    return res.status(500).json({ 
      error: 'Ein interner Serverfehler ist aufgetreten.',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
}